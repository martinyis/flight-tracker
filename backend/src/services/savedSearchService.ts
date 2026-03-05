import prisma from "../config/db";
import {
  TripType, SearchFilters, OneWayRawLegs,
  RoundTripRawOption, PriceHistoryEntry,
  isLegacyRoundTripRawLegs, isComboRawLegs,
} from "../types/search";
import type { TypedSavedSearch } from "../types/search";
import {
  searchByParams,
  searchOneWayByParams,
  filterAndSortRawOptions,
  buildCombosFromRawOptions,
  filterCombosByAirline,
  filterCombosLocally,
  reduceOneWayFromLegs,
  FlightCombo,
  FlightLeg,
} from "./flightService";

function parseId(value: string): number | null {
  const n = parseInt(value, 10);
  return Number.isNaN(n) ? null : n;
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

  const diffMs = new Date(dateTo).getTime() - new Date(dateFrom).getTime();
  const diffDays = diffMs / 86_400_000;
  if (diffDays > 30) {
    throw Object.assign(new Error("Date range cannot exceed 30 days"), { status: 400 });
  }

  const uid = parseId(userId);
  if (uid == null) {
    throw Object.assign(new Error("Invalid user"), { status: 400 });
  }

  let search = await prisma.savedSearch.create({
    data: {
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
          priceHistory: appendPriceHistory([], cheapestPrice) as any,
        },
      });
    } else {
      const { results, cheapestPrice, availableAirlines, airlineLogos, allCombos } =
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
          rawLegs: allCombos as any,
          latestResults: results as any,
          cheapestPrice,
          availableAirlines: availableAirlines as any,
          airlineLogos: airlineLogos as any,
          lastCheckedAt: new Date(),
          priceHistory: appendPriceHistory([], cheapestPrice) as any,
        },
      });
    }
  } catch {
    resultsError =
      "Search saved, but initial price check failed. Results will appear within 4 hours.";
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
    data: { active: !search.active },
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
    const { results, cheapestPrice, availableAirlines, airlineLogos, allCombos } =
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
        rawLegs: allCombos as any,
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
      // LEGACY FORMAT: fall back to old behavior; next refresh will migrate
      const top = filterAndSortRawOptions(raw, filters, 20);
      const allCombos = await buildCombosFromRawOptions(top, search.origin, search.destination);
      results = filterCombosByAirline(allCombos, filters, 10);
      cheapestPrice =
        results.length > 0
          ? Math.min(...(results as FlightCombo[]).map((r) => r.totalPrice))
          : null;
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
