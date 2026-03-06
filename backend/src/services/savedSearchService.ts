import prisma from "../config/db";
import {
  TripType, SearchFilters, OneWayRawLegs,
  RoundTripRawOption, PriceHistoryEntry,
  isLegacyRoundTripRawLegs, isComboRawLegs,
} from "../types/search";
import type { TypedSavedSearch } from "../types/search";
import {
  countCombos,
  searchByParams,
  searchOneWayByParams,
  hydrateReturnLegs,
  filterAndSortRawOptions,
  buildCombosFromRawOptions,
  filterCombosByAirline,
  filterCombosLocally,
  reduceOneWayFromLegs,
  FlightCombo,
  FlightLeg,
} from "./flightService";
import { computeNextCheckAt } from "../workers/priceCheckWorker";

function parseId(value: string): number | null {
  const n = parseInt(value, 10);
  return Number.isNaN(n) ? null : n;
}

// ---------------------------------------------------------------------------
// Tracking fee helper
// ---------------------------------------------------------------------------

/** Tiered tracking fee based on combo count. */
export function computeTrackingFee(comboCount: number): number {
  if (comboCount <= 15) return 1.99;
  if (comboCount <= 40) return 3.99;
  if (comboCount <= 80) return 6.99;
  if (comboCount <= 130) return 9.99;
  return 14.99;
}

// ---------------------------------------------------------------------------
// Price history helper
// ---------------------------------------------------------------------------

export function appendPriceHistory(
  existing: PriceHistoryEntry[] | unknown,
  cheapestPrice: number | null
): PriceHistoryEntry[] {
  const history = Array.isArray(existing) ? (existing as PriceHistoryEntry[]) : [];
  if (cheapestPrice == null) return history;

  const today = new Date().toISOString().slice(0, 10);

  // If there's already an entry for today, update only if cheaper
  const lastEntry = history[history.length - 1];
  if (lastEntry && lastEntry.date === today) {
    if (cheapestPrice < lastEntry.cheapestPrice) {
      return [...history.slice(0, -1), { date: today, cheapestPrice }];
    }
    return history;
  }

  return [...history, { date: today, cheapestPrice }];
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

interface CreateSearchInput {
  tripType: TripType;
  origin: string;
  destination: string;
  dateFrom: string;
  dateTo: string;
  minNights?: number;
  maxNights?: number;
}

export async function createSavedSearch(
  userId: string,
  data: CreateSearchInput
): Promise<{ search: TypedSavedSearch; resultsError?: string }> {
  const { tripType, origin, destination, dateFrom, dateTo, minNights, maxNights } = data;

  if (!tripType || !origin || !destination || !dateFrom || !dateTo) {
    throw Object.assign(new Error("Missing required fields"), { status: 400 });
  }
  if (tripType !== "roundtrip" && tripType !== "oneway") {
    throw Object.assign(new Error("tripType must be 'roundtrip' or 'oneway'"), { status: 400 });
  }
  if (origin.length !== 3 || destination.length !== 3) {
    throw Object.assign(new Error("Airport codes must be 3 characters"), { status: 400 });
  }
  if (dateFrom >= dateTo) {
    throw Object.assign(new Error("dateFrom must be before dateTo"), { status: 400 });
  }

  if (tripType === "roundtrip") {
    if (minNights == null || maxNights == null) {
      throw Object.assign(new Error("minNights and maxNights are required for round trips"), { status: 400 });
    }
    if (minNights > maxNights) {
      throw Object.assign(new Error("minNights must be <= maxNights"), { status: 400 });
    }
  }

  // Combo count validation (replaces old 30-day limit)
  const COMBO_HARD_CAP = 200;
  let comboCount: number;
  if (tripType === "roundtrip") {
    comboCount = countCombos({ dateFrom, dateTo, minNights: minNights!, maxNights: maxNights! });
  } else {
    const diffMs = new Date(dateTo).getTime() - new Date(dateFrom).getTime();
    comboCount = Math.floor(diffMs / 86_400_000) + 1;
  }
  if (comboCount > COMBO_HARD_CAP) {
    throw Object.assign(
      new Error(`Too many combinations (${comboCount}). Maximum is ${COMBO_HARD_CAP}. Narrow your date range or nights.`),
      { status: 400, comboCount }
    );
  }

  const uid = parseId(userId);
  if (uid == null) {
    throw Object.assign(new Error("Invalid user"), { status: 400 });
  }

  // Anti-gaming: 24h dedup — return existing search if identical params created recently
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 3600_000);
  const existingDup = await prisma.savedSearch.findFirst({
    where: {
      userId: uid,
      tripType,
      origin: origin.toUpperCase(),
      destination: destination.toUpperCase(),
      dateFrom,
      dateTo,
      ...(tripType === "roundtrip" && {
        minNights: Number(minNights),
        maxNights: Number(maxNights),
      }),
      createdAt: { gte: twentyFourHoursAgo },
    },
  });
  if (existingDup) {
    return { search: existingDup as unknown as TypedSavedSearch, resultsError: undefined };
  }

  // Anti-gaming: 3 free searches per day
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const todayCount = await prisma.savedSearch.count({
    where: { userId: uid, createdAt: { gte: todayStart } },
  });
  const FREE_SEARCHES_PER_DAY = 3;
  if (todayCount >= FREE_SEARCHES_PER_DAY) {
    throw Object.assign(
      new Error(`Daily search limit reached (${FREE_SEARCHES_PER_DAY}/day). Try again tomorrow.`),
      { status: 429, code: "DAILY_LIMIT" }
    );
  }

  const trackingFee = computeTrackingFee(comboCount);

  let search = await prisma.savedSearch.create({
    data: {
      userId: uid,
      tripType,
      origin: origin.toUpperCase(),
      destination: destination.toUpperCase(),
      dateFrom,
      dateTo,
      comboCount,
      trackingFee,
      trackingPaid: false,
      active: false, // Inactive until tracking is paid
      ...(tripType === "roundtrip" && {
        minNights: Number(minNights),
        maxNights: Number(maxNights),
      }),
    },
  });

  let resultsError: string | undefined;
  try {
    if (search.tripType === "oneway") {
      const { results, cheapestPrice, availableAirlines, airlineLogos, rawLegs } =
        await searchOneWayByParams({
          origin: search.origin,
          destination: search.destination,
          dateFrom: search.dateFrom,
          dateTo: search.dateTo,
        });

      search = await prisma.savedSearch.update({
        where: { id: search.id },
        data: {
          rawLegs: { outbound: rawLegs, return: [] } as any,
          latestResults: results as any,
          cheapestPrice,
          availableAirlines: availableAirlines as any,
          airlineLogos: airlineLogos as any,
          lastCheckedAt: new Date(),
          nextCheckAt: computeNextCheckAt(search.dateFrom),
          priceHistory: appendPriceHistory([], cheapestPrice) as any,
        },
      });
    } else {
      const { results, unhydratedOptions, cheapestPrice, availableAirlines, airlineLogos, allRawOptions } =
        await searchByParams({
          origin: search.origin,
          destination: search.destination,
          dateFrom: search.dateFrom,
          dateTo: search.dateTo,
          minNights: search.minNights!,
          maxNights: search.maxNights!,
        });

      search = await prisma.savedSearch.update({
        where: { id: search.id },
        data: {
          rawLegs: allRawOptions as any,
          latestResults: [...results, ...unhydratedOptions] as any,
          cheapestPrice,
          availableAirlines: availableAirlines as any,
          airlineLogos: airlineLogos as any,
          lastCheckedAt: new Date(),
          nextCheckAt: computeNextCheckAt(search.dateFrom),
          priceHistory: appendPriceHistory([], cheapestPrice) as any,
        },
      });
    }
  } catch {
    resultsError =
      "Search saved, but initial price check failed. Results will appear on next cron run.";
  }

  return { search: search as unknown as TypedSavedSearch, resultsError };
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

export async function getUserSearches(userId: string) {
  const uid = parseId(userId);
  if (uid == null) return [];

  const searches = await prisma.savedSearch.findMany({
    where: { userId: uid },
    omit: { rawLegs: true, availableAirlines: true, filters: true },
    orderBy: { createdAt: "desc" },
  });

  // Return lightweight summaries with derived fields for the home screen
  return searches.map((s) => {
    const results = Array.isArray(s.latestResults) ? (s.latestResults as any[]) : [];
    const logos = (s.airlineLogos ?? {}) as Record<string, string>;

    // Pick top 3 airline logos (by first appearance in the logo map)
    const topLogos: Record<string, string> = {};
    const logoEntries = Object.entries(logos);
    for (let i = 0; i < Math.min(3, logoEntries.length); i++) {
      topLogos[logoEntries[i][0]] = logoEntries[i][1];
    }

    return {
      id: s.id,
      tripType: s.tripType,
      origin: s.origin,
      destination: s.destination,
      dateFrom: s.dateFrom,
      dateTo: s.dateTo,
      minNights: s.minNights,
      maxNights: s.maxNights,
      active: s.active,
      lastCheckedAt: s.lastCheckedAt,
      cheapestPrice: s.cheapestPrice,
      trackingPaid: s.trackingPaid,
      trackingFee: s.trackingFee,
      comboCount: s.comboCount,
      createdAt: s.createdAt,
      resultCount: results.length,
      airlineLogos: topLogos,
    };
  });
}

export async function getSearchById(id: string, userId: string) {
  const searchId = parseId(id);
  const uid = parseId(userId);
  if (searchId == null || uid == null) return null;

  const search = await prisma.savedSearch.findFirst({
    where: { id: searchId, userId: uid },
    omit: { rawLegs: true },
  });
  if (!search) return null;

  // Backfill airlineLogos from latestResults if column is empty (pre-migration data)
  const logos = search.airlineLogos as Record<string, string> | null;
  if (!logos || Object.keys(logos).length === 0) {
    const computed = computeLogosFromResults(
      search.latestResults as any,
      search.tripType
    );
    if (Object.keys(computed).length > 0) {
      // Persist so we don't recompute every time
      await prisma.savedSearch.update({
        where: { id: search.id },
        data: { airlineLogos: computed as any },
      });
      (search as any).airlineLogos = computed;
    }
  }

  return search;
}

/** Extract airline logos from stored latestResults (nested flights arrays) */
function computeLogosFromResults(
  results: any[],
  tripType: string
): Record<string, string> {
  const map: Record<string, string> = {};
  if (!Array.isArray(results)) return map;

  for (const item of results) {
    const legs: any[] =
      tripType === "oneway"
        ? [item]
        : [item?.outbound, item?.return].filter(Boolean);

    for (const leg of legs) {
      if (!Array.isArray(leg?.flights)) continue;
      for (const f of leg.flights) {
        if (f?.airline_logo && f?.airline && !map[f.airline]) {
          map[f.airline] = f.airline_logo;
        }
      }
    }
  }
  return map;
}

// ---------------------------------------------------------------------------
// Delete / Toggle
// ---------------------------------------------------------------------------

export async function deleteSearch(id: string, userId: string) {
  const searchId = parseId(id);
  const uid = parseId(userId);
  if (searchId == null || uid == null) return null;

  const result = await prisma.savedSearch.deleteMany({
    where: { id: searchId, userId: uid },
  });
  return result.count > 0 ? true : null;
}

export async function toggleSearchActive(id: string, userId: string) {
  const searchId = parseId(id);
  const uid = parseId(userId);
  if (searchId == null || uid == null) return null;

  const search = await prisma.savedSearch.findFirst({
    where: { id: searchId, userId: uid },
  });
  if (!search) return null;

  const today = new Date().toISOString().slice(0, 10);
  if (!search.active && search.dateTo < today) {
    throw Object.assign(
      new Error("Cannot re-activate a search with past dates"),
      { status: 400 }
    );
  }

  const updated = await prisma.savedSearch.update({
    where: { id: search.id },
    data: {
      active: !search.active,
      // When re-activating, schedule immediate check on next cron run
      ...(!search.active && { nextCheckAt: new Date() }),
    },
    omit: { latestResults: true, rawLegs: true },
  });
  return updated;
}

// ---------------------------------------------------------------------------
// Refresh — re-search SerpAPI, store fresh full data, re-apply filters
// ---------------------------------------------------------------------------

export async function refreshSearch(
  id: string,
  userId: string,
  resetFilter = false
) {
  const searchId = parseId(id);
  const uid = parseId(userId);
  if (searchId == null || uid == null) return null;

  const search = await prisma.savedSearch.findFirst({
    where: { id: searchId, userId: uid },
  });
  if (!search) return null;

  // Gate: unpaid searches cannot be refreshed
  if (!search.trackingPaid) {
    throw Object.assign(
      new Error("Tracking not activated. Pay the tracking fee to enable price monitoring."),
      { status: 402, code: "PAYMENT_REQUIRED", trackingFee: search.trackingFee }
    );
  }

  // 8-hour minimum refresh interval
  const REFRESH_MIN_INTERVAL_MS = 8 * 3600_000;
  if (search.lastCheckedAt) {
    const age = Date.now() - new Date(search.lastCheckedAt).getTime();
    if (age < REFRESH_MIN_INTERVAL_MS) {
      throw Object.assign(
        new Error("Data is still fresh. Next refresh available in " +
          Math.ceil((REFRESH_MIN_INTERVAL_MS - age) / 3600_000) + " hours."),
        { status: 429, code: "TOO_SOON" }
      );
    }
  }

  const filters = resetFilter ? undefined : (search.filters as SearchFilters);
  const existingHistory = (search.priceHistory ?? []) as unknown as PriceHistoryEntry[];

  if (search.tripType === "oneway") {
    const { results, cheapestPrice, availableAirlines, airlineLogos, rawLegs } =
      await searchOneWayByParams({
        origin: search.origin,
        destination: search.destination,
        dateFrom: search.dateFrom,
        dateTo: search.dateTo,
        filters,
      });

    const updated = await prisma.savedSearch.update({
      where: { id: search.id },
      data: {
        rawLegs: { outbound: rawLegs, return: [] } as any,
        latestResults: results as any,
        cheapestPrice,
        availableAirlines: availableAirlines as any,
        airlineLogos: airlineLogos as any,
        lastCheckedAt: new Date(),
        priceHistory: appendPriceHistory(existingHistory, cheapestPrice) as any,
        ...(resetFilter && { filters: {} }),
      },
      omit: { rawLegs: true },
    });
    return updated;
  } else {
    const { results, unhydratedOptions, cheapestPrice, availableAirlines, airlineLogos, allRawOptions } =
      await searchByParams({
        origin: search.origin,
        destination: search.destination,
        dateFrom: search.dateFrom,
        dateTo: search.dateTo,
        minNights: search.minNights!,
        maxNights: search.maxNights!,
        filters,
      });

    const updated = await prisma.savedSearch.update({
      where: { id: search.id },
      data: {
        rawLegs: allRawOptions as any,
        latestResults: [...results, ...unhydratedOptions] as any,
        cheapestPrice,
        availableAirlines: availableAirlines as any,
        airlineLogos: airlineLogos as any,
        lastCheckedAt: new Date(),
        priceHistory: appendPriceHistory(existingHistory, cheapestPrice) as any,
        ...(resetFilter && { filters: {} }),
      },
      omit: { rawLegs: true },
    });
    return updated;
  }
}

// ---------------------------------------------------------------------------
// Update filters — pure local filtering, NO SerpAPI calls (new-format data)
// ---------------------------------------------------------------------------

export async function updateFilters(
  id: string,
  userId: string,
  filters: SearchFilters
) {
  const searchId = parseId(id);
  const uid = parseId(userId);
  if (searchId == null || uid == null) return null;

  const search = await prisma.savedSearch.findFirst({
    where: { id: searchId, userId: uid },
  });
  if (!search) return null;

  const availableAirlines = search.availableAirlines as string[];
  if (filters.airlines && filters.airlines.length > 0) {
    const invalid = filters.airlines.filter(
      (a) => !availableAirlines.includes(a)
    );
    if (invalid.length > 0) {
      throw Object.assign(
        new Error(`Unknown airlines: ${invalid.join(", ")}`),
        { status: 400 }
      );
    }
  }

  let results: any[];
  let cheapestPrice: number | null;

  if (search.tripType === "oneway") {
    const rawLegs = search.rawLegs as unknown as OneWayRawLegs;
    results = reduceOneWayFromLegs(rawLegs.outbound, filters);
    cheapestPrice =
      results.length > 0
        ? Math.min(...(results as FlightLeg[]).map((r) => r.price))
        : null;
  } else {
    const raw = search.rawLegs as unknown;

    if (isComboRawLegs(raw)) {
      // NEW FORMAT: rawLegs is FlightCombo[] — pure local filtering, no API calls
      const filtered = filterCombosLocally(raw, filters, 10);
      results = filtered.results;
      cheapestPrice = filtered.cheapestPrice;
    } else if (isLegacyRoundTripRawLegs(raw)) {
      // RAW OPTIONS FORMAT (from cron): filter by outbound airline, no API calls
      const filtered = filterAndSortRawOptions(raw, filters, 10);
      results = filtered;
      cheapestPrice = filtered.length > 0 ? filtered[0].price : null;
    } else {
      // Empty or unknown format — return empty
      results = [];
      cheapestPrice = null;
    }
  }

  const updated = await prisma.savedSearch.update({
    where: { id: search.id },
    data: {
      filters: filters as any,
      latestResults: results as any,
      cheapestPrice,
    },
    omit: { rawLegs: true },
  });
  return updated;
}

// ---------------------------------------------------------------------------
// Hydrate — fetch return-leg details for cron data (RoundTripRawOption[])
// ---------------------------------------------------------------------------

export async function hydrateSearch(id: string, userId: string) {
  const searchId = parseId(id);
  const uid = parseId(userId);
  if (searchId == null || uid == null) return null;

  const search = await prisma.savedSearch.findFirst({
    where: { id: searchId, userId: uid },
  });
  if (!search) return null;

  const raw = search.rawLegs as unknown;

  // Already hydrated (FlightCombo[]) — return as-is
  if (isComboRawLegs(raw)) {
    const { rawLegs: _omit, ...rest } = search;
    return rest;
  }

  // Not in RoundTripRawOption[] format — nothing to hydrate
  if (!isLegacyRoundTripRawLegs(raw)) {
    const { rawLegs: _omit, ...rest } = search;
    return rest;
  }

  // Hydrate: fetch return legs for top 10 options
  const searchFilters = search.filters as SearchFilters;
  const { combos, availableAirlines, airlineLogos } = await hydrateReturnLegs(
    raw,
    search.origin,
    search.destination,
    searchFilters,
    10
  );

  const cheapestPrice = combos.length > 0
    ? Math.min(...combos.map((c) => c.totalPrice))
    : null;

  const updated = await prisma.savedSearch.update({
    where: { id: search.id },
    data: {
      rawLegs: combos as any,
      latestResults: combos as any,
      cheapestPrice,
      availableAirlines: availableAirlines as any,
      airlineLogos: airlineLogos as any,
    },
    omit: { rawLegs: true },
  });
  return updated;
}

// ---------------------------------------------------------------------------
// Activate tracking (simulated payment for now)
// ---------------------------------------------------------------------------

export async function activateTracking(id: string, userId: string) {
  const searchId = parseId(id);
  const uid = parseId(userId);
  if (searchId == null || uid == null) return null;

  const search = await prisma.savedSearch.findFirst({
    where: { id: searchId, userId: uid },
  });
  if (!search) return null;

  if (search.trackingPaid) {
    throw Object.assign(new Error("Tracking already activated"), { status: 400 });
  }

  // Simulated payment — always succeeds. Replace with real IAP later.
  const fee = search.trackingFee ?? 0;

  await prisma.payment.create({
    data: {
      userId: uid,
      searchId: search.id,
      amount: fee,
      status: "completed",
    },
  });

  // Build initial sentinels for round-trip searches
  let sentinels: { out: string; ret: string }[] = [];
  if (search.tripType === "roundtrip" && search.minNights != null && search.maxNights != null) {
    const { selectSentinels } = await import("./flightService");
    sentinels = selectSentinels({
      dateFrom: search.dateFrom,
      dateTo: search.dateTo,
      minNights: search.minNights,
      maxNights: search.maxNights,
    });
  }

  const updated = await prisma.savedSearch.update({
    where: { id: search.id },
    data: {
      trackingPaid: true,
      trackingPaidAt: new Date(),
      active: true,
      nextCheckAt: computeNextCheckAt(search.dateFrom),
      sentinelPairs: sentinels as any,
    },
    omit: { rawLegs: true },
  });

  return { search: updated, fee };
}

// ---------------------------------------------------------------------------
// Hydrate one option (single return leg on-demand)
// ---------------------------------------------------------------------------

export async function hydrateOneOption(
  id: string,
  userId: string,
  optionIndex: number
) {
  const searchId = parseId(id);
  const uid = parseId(userId);
  if (searchId == null || uid == null) return null;

  const search = await prisma.savedSearch.findFirst({
    where: { id: searchId, userId: uid },
  });
  if (!search) return null;

  const latestResults = search.latestResults as any[];
  if (optionIndex < 0 || optionIndex >= latestResults.length) {
    throw Object.assign(new Error("Invalid option index"), { status: 400 });
  }

  const option = latestResults[optionIndex];

  // Already hydrated?
  if ("return" in option && option.return != null) {
    return { combo: option, index: optionIndex };
  }

  if (!option.departure_token) {
    throw Object.assign(new Error("Cannot hydrate: no departure_token"), { status: 400 });
  }

  const { fetchReturnLeg } = await import("./flightService");
  const returnLeg = await fetchReturnLeg(
    option.departure_token,
    search.origin,
    search.destination,
    option.outboundDate,
    option.returnDate
  );

  if (!returnLeg) {
    throw Object.assign(new Error("Return flight not available"), { status: 404 });
  }

  const combo = {
    outbound: option.outbound,
    return: returnLeg,
    totalPrice: returnLeg.price ?? option.price,
    nights: option.nights,
  };

  // Persist hydrated combo in latestResults
  latestResults[optionIndex] = combo;
  await prisma.savedSearch.update({
    where: { id: search.id },
    data: { latestResults: latestResults as any },
  });

  return { combo, index: optionIndex };
}
