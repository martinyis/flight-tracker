import cron from "node-cron";
import prisma from "../config/db";
import { TripType, SearchFilters, PriceHistoryEntry } from "../types/search";
import {
  fetchPriceOnly,
  fetchOneWayPriceOnly,
  fetchSentinelPrices,
  selectSentinels,
  filterAndSortRawOptions,
  reduceOneWayFromLegs,
  FlightLeg,
} from "../services/flightService";
import { appendPriceHistory } from "../services/savedSearchService";

let isRunning = false;

const SENTINEL_TOLERANCE = 2; // $2 tolerance for sentinel price comparison

interface DedupGroup {
  tripType: TripType;
  params: {
    origin: string;
    destination: string;
    dateFrom: string;
    dateTo: string;
    minNights?: number;
    maxNights?: number;
  };
  searchIds: number[];
}

/**
 * Compute next check time based on departure proximity.
 * 30-day monitoring cap: searches > 30 days out are deferred.
 * Frequencies: 30-7d = 2x/day, 6-2d = 3x/day, <2d = 4x/day.
 */
export function computeNextCheckAt(dateFrom: string): Date {
  const now = new Date();
  const departure = new Date(dateFrom + "T00:00:00Z");
  const daysOut = Math.floor((departure.getTime() - now.getTime()) / 86_400_000);

  if (daysOut > 30) {
    // Defer monitoring until 30 days before departure
    return new Date(departure.getTime() - 30 * 86_400_000);
  }

  let intervalHours: number;
  if (daysOut >= 7) {
    intervalHours = 12; // 2x per day
  } else if (daysOut >= 2) {
    intervalHours = 8; // 3x per day
  } else {
    intervalHours = 6; // 4x per day
  }

  return new Date(now.getTime() + intervalHours * 3600_000);
}

export async function runPriceCheck(): Promise<void> {
  if (isRunning) {
    console.log("[PriceCheck] Skipping -- previous run still in progress");
    return;
  }

  isRunning = true;
  const today = new Date().toISOString().slice(0, 10);
  const now = new Date();

  try {
    // Auto-deactivate expired searches
    const deactivated = await prisma.savedSearch.updateMany({
      where: { active: true, dateTo: { lt: today } },
      data: { active: false },
    });
    if (deactivated.count > 0) {
      console.log(
        `[PriceCheck] Deactivated ${deactivated.count} expired searches`
      );
    }

    // Load active, paid, non-expired searches that are due for check
    const searches = await prisma.savedSearch.findMany({
      where: {
        active: true,
        trackingPaid: true,
        dateTo: { gte: today },
        OR: [
          { nextCheckAt: null },
          { nextCheckAt: { lte: now } },
        ],
      },
    });

    if (searches.length === 0) {
      console.log("[PriceCheck] No active searches due for check");
      return;
    }

    // Build a lookup map for per-search data (filters, priceHistory)
    const searchesById = new Map(searches.map((s) => [s.id, s]));

    // Deduplicate by search parameters ONLY (not filters)
    const groups = new Map<string, DedupGroup>();

    for (const s of searches) {
      const tripType = (s.tripType || "roundtrip") as TripType;
      const key =
        tripType === "oneway"
          ? `oneway|${s.origin}|${s.destination}|${s.dateFrom}|${s.dateTo}`
          : `roundtrip|${s.origin}|${s.destination}|${s.dateFrom}|${s.dateTo}|${s.minNights}|${s.maxNights}`;

      const existing = groups.get(key);
      if (existing) {
        existing.searchIds.push(s.id);
      } else {
        groups.set(key, {
          tripType,
          params: {
            origin: s.origin,
            destination: s.destination,
            dateFrom: s.dateFrom,
            dateTo: s.dateTo,
            ...(tripType === "roundtrip" && {
              minNights: s.minNights!,
              maxNights: s.maxNights!,
            }),
          },
          searchIds: [s.id],
        });
      }
    }

    let groupsChecked = 0;
    let searchesUpdated = 0;
    let sentinelSkips = 0;
    let errors = 0;

    for (const [key, group] of groups) {
      try {
        if (group.tripType === "oneway") {
          // One-way: full scan (no sampling)
          const { rawLegs, cheapestPrice: unfilteredCheapest,
                  availableAirlines, airlineLogos } =
            await fetchOneWayPriceOnly({ ...group.params, sampleInterval: 1 });

          for (const searchId of group.searchIds) {
            const s = searchesById.get(searchId)!;
            const searchFilters = s.filters as SearchFilters;

            let cheapestPrice: number | null;
            let results: any[];

            if (searchFilters?.airlines?.length) {
              results = reduceOneWayFromLegs(rawLegs, searchFilters);
              cheapestPrice = results.length > 0
                ? Math.min(...(results as FlightLeg[]).map((r) => r.price))
                : null;
            } else {
              results = reduceOneWayFromLegs(rawLegs);
              cheapestPrice = unfilteredCheapest;
            }

            const existingHistory = (s.priceHistory ?? []) as unknown as PriceHistoryEntry[];

            await prisma.savedSearch.update({
              where: { id: searchId },
              data: {
                rawLegs: { outbound: rawLegs, return: [] } as any,
                latestResults: results as any,
                cheapestPrice,
                availableAirlines: availableAirlines as any,
                airlineLogos: airlineLogos as any,
                lastCheckedAt: new Date(),
                nextCheckAt: computeNextCheckAt(s.dateFrom),
                priceHistory: appendPriceHistory(existingHistory, cheapestPrice) as any,
              },
            });
          }
        } else {
          // Round-trip: sentinel strategy
          const firstSearch = searchesById.get(group.searchIds[0])!;
          const sentinelPairs = (firstSearch.sentinelPairs ?? []) as { out: string; ret: string }[];

          let needsFullScan = true;

          // Try sentinel check first (if sentinels exist and we have a stored price)
          if (sentinelPairs.length > 0 && firstSearch.cheapestPrice != null) {
            const { sentinelCheapest } = await fetchSentinelPrices(
              group.params.origin,
              group.params.destination,
              sentinelPairs
            );

            if (sentinelCheapest != null) {
              const diff = Math.abs(sentinelCheapest - firstSearch.cheapestPrice);
              if (diff <= SENTINEL_TOLERANCE) {
                // Prices unchanged — skip full scan, just update timestamps
                needsFullScan = false;
                sentinelSkips++;
                console.log(
                  `[PriceCheck] Sentinel OK for ${key} (diff=$${diff.toFixed(2)}) -- skipping full scan`
                );
                for (const searchId of group.searchIds) {
                  const s = searchesById.get(searchId)!;
                  await prisma.savedSearch.update({
                    where: { id: searchId },
                    data: {
                      lastCheckedAt: new Date(),
                      nextCheckAt: computeNextCheckAt(s.dateFrom),
                    },
                  });
                }
              } else {
                console.log(
                  `[PriceCheck] Sentinel CHANGED for ${key} (diff=$${diff.toFixed(2)}) -- running full scan`
                );
              }
            }
          }

          if (needsFullScan) {
            // Full scan: all combos, no sampling
            const { rawOptions, cheapestPrice: unfilteredCheapest,
                    availableAirlines, airlineLogos } =
              await fetchPriceOnly({
                ...(group.params as {
                  origin: string; destination: string;
                  dateFrom: string; dateTo: string;
                  minNights: number; maxNights: number;
                }),
                sampleInterval: 1,
              });

            // Recompute sentinels for next run
            const newSentinels = selectSentinels({
              dateFrom: group.params.dateFrom,
              dateTo: group.params.dateTo,
              minNights: group.params.minNights!,
              maxNights: group.params.maxNights!,
            });

            for (const searchId of group.searchIds) {
              const s = searchesById.get(searchId)!;
              const searchFilters = s.filters as SearchFilters;

              let filteredOptions = rawOptions;
              let cheapestPrice: number | null;

              if (searchFilters?.airlines?.length) {
                filteredOptions = filterAndSortRawOptions(rawOptions, searchFilters, 10);
                cheapestPrice = filteredOptions.length > 0 ? filteredOptions[0].price : null;
              } else {
                cheapestPrice = unfilteredCheapest;
              }

              const existingHistory = (s.priceHistory ?? []) as unknown as PriceHistoryEntry[];

              await prisma.savedSearch.update({
                where: { id: searchId },
                data: {
                  rawLegs: rawOptions as any,
                  latestResults: filteredOptions as any,
                  cheapestPrice,
                  availableAirlines: availableAirlines as any,
                  airlineLogos: airlineLogos as any,
                  lastCheckedAt: new Date(),
                  nextCheckAt: computeNextCheckAt(s.dateFrom),
                  priceHistory: appendPriceHistory(existingHistory, cheapestPrice) as any,
                  sentinelPairs: newSentinels as any,
                },
              });
            }
          }
        }

        groupsChecked++;
        searchesUpdated += group.searchIds.length;
      } catch (err) {
        errors++;
        console.error(`[PriceCheck] Error for group ${key}:`, err);
      }

      // 2-second delay between groups to avoid hammering SerpAPI
      await new Promise((r) => setTimeout(r, 2000));
    }

    console.log(
      `[PriceCheck] Complete: ${groupsChecked} groups checked, ${searchesUpdated} searches updated, ${sentinelSkips} sentinel skips, ${errors} errors`
    );
  } finally {
    isRunning = false;
  }
}

export function startPriceCheckCron(): void {
  // Run every hour -- adaptive scheduling means only due searches are processed
  cron.schedule("0 * * * *", async () => {
    try {
      await runPriceCheck();
    } catch (err) {
      console.error("[PriceCheck] Cron error:", err);
    }
  });
  console.log("Price check cron scheduled (every hour, adaptive per search)");
}
