import cron from "node-cron";
import prisma from "../config/db";
import logger from "../config/logger";
import { cleanupExpiredTokens } from "../services/authService";
import { TripType, SearchFilters, ApiFilters, readSearchFilters, readApiFilters, readPriceHistory, readSentinelPairs } from "../types/search";
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
import { sendPushNotification } from "../utils/pushNotification";
import { generateSmartNotification } from "../services/notificationService";
import { SENTINEL_TOLERANCE, CRON_GROUP_DELAY_MS, TOP_RESULTS_LIMIT } from "../config/constants";
import {
  jsonRawLegs, jsonLatestResults, jsonAvailableAirlines,
  jsonAirlineLogos, jsonPriceHistory, jsonSentinelPairs,
} from "../types/prismaJson";

const log = logger.child({ component: "priceCheck" });

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
  apiFilters: ApiFilters;
  searchIds: number[];
}

/**
 * Compute next check time based on departure proximity and tracking window.
 */
export function computeNextCheckAt(
  dateFrom: string,
  trackingDays?: number | null,
  trackingStartedAt?: Date | null
): Date {
  const now = new Date();
  const departure = new Date(dateFrom + "T00:00:00Z");
  const windowDays = trackingDays ?? 14;

  if (trackingStartedAt) {
    const expiresAt = new Date(trackingStartedAt.getTime() + windowDays * 86_400_000);
    if (now >= expiresAt) return new Date(0);
  }

  const daysOut = Math.floor((departure.getTime() - now.getTime()) / 86_400_000);
  if (daysOut > windowDays) {
    return new Date(departure.getTime() - windowDays * 86_400_000);
  }

  return new Date(now.getTime() + 24 * 3600_000);
}

export async function runPriceCheck(): Promise<void> {
  if (isRunning) {
    log.warn("Skipping: previous run still in progress");
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
      log.info({ count: deactivated.count }, "Deactivated expired searches");
    }

    // Auto-deactivate searches whose tracking window has expired
    const expiredTracking = await prisma.$executeRaw`
      UPDATE "saved_searches"
      SET "tracking_active" = false, "active" = false
      WHERE "tracking_active" = true
        AND "tracking_days" IS NOT NULL
        AND "tracking_started_at" IS NOT NULL
        AND "tracking_started_at" + ("tracking_days" || ' days')::interval < NOW()
    `;
    if (expiredTracking > 0) {
      log.info({ count: expiredTracking }, "Deactivated searches with expired tracking window");
    }

    // Load active, paid, non-expired searches that are due for check
    const searches = await prisma.savedSearch.findMany({
      where: {
        active: true,
        trackingActive: true,
        dateTo: { gte: today },
        OR: [
          { nextCheckAt: null },
          { nextCheckAt: { lte: now } },
        ],
      },
      include: { user: { select: { pushToken: true } } },
    });

    if (searches.length === 0) {
      log.debug("No active searches due for check");
      return;
    }

    const searchesById = new Map(searches.map((s) => [s.id, s]));

    // Deduplicate by search parameters ONLY (not filters)
    const groups = new Map<string, DedupGroup>();

    for (const s of searches) {
      const tripType = (s.tripType || "roundtrip") as TripType;
      const apiFiltersKey = JSON.stringify(s.apiFilters ?? {});
      const key =
        tripType === "oneway"
          ? `oneway|${s.origin}|${s.destination}|${s.dateFrom}|${s.dateTo}|${apiFiltersKey}`
          : `roundtrip|${s.origin}|${s.destination}|${s.dateFrom}|${s.dateTo}|${s.minNights}|${s.maxNights}|${apiFiltersKey}`;

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
          apiFilters: readApiFilters(s.apiFilters),
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
          const { rawLegs, cheapestPrice: unfilteredCheapest,
                  availableAirlines, airlineLogos } =
            await fetchOneWayPriceOnly({ ...group.params, sampleInterval: 1, apiFilters: group.apiFilters });

          for (const searchId of group.searchIds) {
            const s = searchesById.get(searchId)!;
            const searchFilters = readSearchFilters(s.filters);

            let cheapestPrice: number | null;
            let results: FlightLeg[];

            if (searchFilters?.airlines?.length) {
              results = reduceOneWayFromLegs(rawLegs, searchFilters);
              cheapestPrice = results.length > 0
                ? Math.min(...results.map((r) => r.price))
                : null;
            } else {
              results = reduceOneWayFromLegs(rawLegs);
              cheapestPrice = unfilteredCheapest;
            }

            const existingHistory = readPriceHistory(s.priceHistory);

            const oldPrice = s.cheapestPrice;

            await prisma.savedSearch.update({
              where: { id: searchId },
              data: {
                rawLegs: jsonRawLegs({ outbound: rawLegs, return: [] }),
                latestResults: jsonLatestResults(results),
                cheapestPrice,
                availableAirlines: jsonAvailableAirlines(availableAirlines),
                airlineLogos: jsonAirlineLogos(airlineLogos),
                lastCheckedAt: new Date(),
                nextCheckAt: computeNextCheckAt(s.dateFrom, s.trackingDays, s.trackingStartedAt),
                priceHistory: jsonPriceHistory(appendPriceHistory(existingHistory, cheapestPrice)),
              },
            });

            // Smart notification
            const notification = generateSmartNotification({
              searchId,
              origin: s.origin,
              destination: s.destination,
              tripType: (s.tripType || "oneway") as TripType,
              oldPrice,
              newPrice: cheapestPrice,
              priceHistory: existingHistory,
              dateFrom: s.dateFrom,
              trackingDays: s.trackingDays,
              trackingStartedAt: s.trackingStartedAt,
              lastNotifiedAt: s.lastNotifiedAt,
              pushToken: s.user.pushToken,
            });

            if (notification) {
              sendPushNotification({
                to: s.user.pushToken!,
                title: notification.title,
                body: notification.body,
                data: notification.data,
                sound: "default",
              });
              prisma.savedSearch.update({
                where: { id: searchId },
                data: { lastNotifiedAt: new Date() },
              }).catch(() => {});
            }
          }
        } else {
          // Round-trip: sentinel strategy
          const firstSearch = searchesById.get(group.searchIds[0])!;
          const sentinelPairs = readSentinelPairs(firstSearch.sentinelPairs);

          let needsFullScan = true;

          if (sentinelPairs.length > 0 && firstSearch.cheapestPrice != null) {
            const { sentinelCheapest } = await fetchSentinelPrices(
              group.params.origin,
              group.params.destination,
              sentinelPairs,
              group.apiFilters
            );

            if (sentinelCheapest != null) {
              const diff = Math.abs(sentinelCheapest - firstSearch.cheapestPrice);
              if (diff <= SENTINEL_TOLERANCE) {
                needsFullScan = false;
                sentinelSkips++;
                log.debug({ key, diff: diff.toFixed(2) }, "Sentinel OK — skipping full scan");
                for (const searchId of group.searchIds) {
                  const s = searchesById.get(searchId)!;
                  const existingHistory = readPriceHistory(s.priceHistory);
                  await prisma.savedSearch.update({
                    where: { id: searchId },
                    data: {
                      lastCheckedAt: new Date(),
                      nextCheckAt: computeNextCheckAt(s.dateFrom, s.trackingDays, s.trackingStartedAt),
                      priceHistory: jsonPriceHistory(appendPriceHistory(existingHistory, s.cheapestPrice)),
                    },
                  });
                }
              } else {
                log.info({ key, diff: diff.toFixed(2) }, "Sentinel changed — running full scan");
              }
            }
          }

          if (needsFullScan) {
            const { rawOptions, cheapestPrice: unfilteredCheapest,
                    availableAirlines, airlineLogos } =
              await fetchPriceOnly({
                ...(group.params as {
                  origin: string; destination: string;
                  dateFrom: string; dateTo: string;
                  minNights: number; maxNights: number;
                }),
                sampleInterval: 1,
                apiFilters: group.apiFilters,
              });

            const newSentinels = selectSentinels({
              dateFrom: group.params.dateFrom,
              dateTo: group.params.dateTo,
              minNights: group.params.minNights!,
              maxNights: group.params.maxNights!,
            });

            for (const searchId of group.searchIds) {
              const s = searchesById.get(searchId)!;
              const searchFilters = readSearchFilters(s.filters);

              let filteredOptions = rawOptions;
              let cheapestPrice: number | null;

              if (searchFilters?.airlines?.length) {
                filteredOptions = filterAndSortRawOptions(rawOptions, searchFilters, TOP_RESULTS_LIMIT);
                cheapestPrice = filteredOptions.length > 0 ? filteredOptions[0].price : null;
              } else {
                cheapestPrice = unfilteredCheapest;
              }

              const existingHistory = readPriceHistory(s.priceHistory);
              const oldPrice = s.cheapestPrice;

              await prisma.savedSearch.update({
                where: { id: searchId },
                data: {
                  rawLegs: jsonRawLegs(rawOptions),
                  latestResults: jsonLatestResults(filteredOptions),
                  cheapestPrice,
                  availableAirlines: jsonAvailableAirlines(availableAirlines),
                  airlineLogos: jsonAirlineLogos(airlineLogos),
                  lastCheckedAt: new Date(),
                  nextCheckAt: computeNextCheckAt(s.dateFrom, s.trackingDays, s.trackingStartedAt),
                  priceHistory: jsonPriceHistory(appendPriceHistory(existingHistory, cheapestPrice)),
                  sentinelPairs: jsonSentinelPairs(newSentinels),
                },
              });

              // Smart notification
              const notification = generateSmartNotification({
                searchId,
                origin: s.origin,
                destination: s.destination,
                tripType: (s.tripType || "roundtrip") as TripType,
                oldPrice,
                newPrice: cheapestPrice,
                priceHistory: existingHistory,
                dateFrom: s.dateFrom,
                trackingDays: s.trackingDays,
                trackingStartedAt: s.trackingStartedAt,
                lastNotifiedAt: s.lastNotifiedAt,
                pushToken: s.user.pushToken,
              });

              if (notification) {
                sendPushNotification({
                  to: s.user.pushToken!,
                  title: notification.title,
                  body: notification.body,
                  data: notification.data,
                  sound: "default",
                });
                prisma.savedSearch.update({
                  where: { id: searchId },
                  data: { lastNotifiedAt: new Date() },
                }).catch(() => {});
              }
            }
          }
        }

        groupsChecked++;
        searchesUpdated += group.searchIds.length;
      } catch (err) {
        errors++;
        log.error({ err, key }, "Error processing group");
      }

      await new Promise((r) => setTimeout(r, CRON_GROUP_DELAY_MS));
    }

    log.info({ groupsChecked, searchesUpdated, sentinelSkips, errors }, "Price check complete");
  } finally {
    isRunning = false;
  }
}

export function startPriceCheckCron(): void {
  cron.schedule("0 */4 * * *", async () => {
    try {
      await runPriceCheck();
    } catch (err) {
      log.error({ err }, "Cron error");
    }
  }, { timezone: "UTC" });
  log.info("Price check cron scheduled (every 4 hours UTC, adaptive per search)");

  // Daily cleanup of expired/revoked refresh tokens at 3 AM UTC
  cron.schedule("0 3 * * *", async () => {
    try {
      const count = await cleanupExpiredTokens();
      if (count > 0) log.info(`Cleaned up ${count} expired/revoked refresh tokens`);
    } catch (err) {
      log.error({ err }, "Refresh token cleanup error");
    }
  }, { timezone: "UTC" });
}
