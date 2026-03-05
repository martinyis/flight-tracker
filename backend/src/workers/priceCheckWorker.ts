import cron from "node-cron";
import prisma from "../config/db";
import { TripType, SearchFilters, PriceHistoryEntry } from "../types/search";
import {
  searchByParams,
  searchOneWayByParams,
  filterCombosLocally,
  reduceOneWayFromLegs,
  FlightLeg,
} from "../services/flightService";
import { appendPriceHistory } from "../services/savedSearchService";

let isRunning = false;

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

export async function runPriceCheck(): Promise<void> {
  if (isRunning) {
    console.log("[PriceCheck] Skipping -- previous run still in progress");
    return;
  }

  isRunning = true;
  const today = new Date().toISOString().slice(0, 10);

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

    // Load active, non-expired searches
    const searches = await prisma.savedSearch.findMany({
      where: { active: true, dateTo: { gte: today } },
    });

    if (searches.length === 0) {
      console.log("[PriceCheck] No active searches to check");
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
    let errors = 0;

    for (const [key, group] of groups) {
      try {
        if (group.tripType === "oneway") {
          const { results: unfilteredResults, cheapestPrice: unfilteredCheapest,
                  availableAirlines, airlineLogos, rawLegs } =
            await searchOneWayByParams(group.params);

          // Per-search: apply individual filters and update
          for (const searchId of group.searchIds) {
            const s = searchesById.get(searchId)!;
            const searchFilters = s.filters as SearchFilters;

            let results: any[];
            let cheapestPrice: number | null;

            if (searchFilters?.airlines?.length) {
              results = reduceOneWayFromLegs(rawLegs, searchFilters);
              cheapestPrice = results.length > 0
                ? Math.min(...(results as FlightLeg[]).map((r) => r.price))
                : null;
            } else {
              results = unfilteredResults;
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
                priceHistory: appendPriceHistory(existingHistory, cheapestPrice) as any,
              },
            });
          }
        } else {
          const { results: unfilteredResults, cheapestPrice: unfilteredCheapest,
                  availableAirlines, airlineLogos, allCombos } =
            await searchByParams(
              group.params as {
                origin: string; destination: string;
                dateFrom: string; dateTo: string;
                minNights: number; maxNights: number;
              }
            );

          // Per-search: apply individual filters and update
          for (const searchId of group.searchIds) {
            const s = searchesById.get(searchId)!;
            const searchFilters = s.filters as SearchFilters;

            let results: any[];
            let cheapestPrice: number | null;

            if (searchFilters?.airlines?.length) {
              const filtered = filterCombosLocally(allCombos, searchFilters, 10);
              results = filtered.results;
              cheapestPrice = filtered.cheapestPrice;
            } else {
              results = unfilteredResults;
              cheapestPrice = unfilteredCheapest;
            }

            const existingHistory = (s.priceHistory ?? []) as unknown as PriceHistoryEntry[];

            await prisma.savedSearch.update({
              where: { id: searchId },
              data: {
                rawLegs: allCombos as any,
                latestResults: results as any,
                cheapestPrice,
                availableAirlines: availableAirlines as any,
                airlineLogos: airlineLogos as any,
                lastCheckedAt: new Date(),
                priceHistory: appendPriceHistory(existingHistory, cheapestPrice) as any,
              },
            });
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
      `[PriceCheck] Complete: ${groupsChecked} groups checked, ${searchesUpdated} searches updated, ${errors} errors`
    );
  } finally {
    isRunning = false;
  }
}

export function startPriceCheckCron(): void {
  cron.schedule("0 */4 * * *", async () => {
    try {
      await runPriceCheck();
    } catch (err) {
      console.error("[PriceCheck] Cron error:", err);
    }
  });
  console.log("Price check cron scheduled (every 4 hours)");
}
