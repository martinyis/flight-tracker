import prisma from "../../config/db";
import {
  TripType, ApiFilters,
  readLatestResults, readAirlineLogos, readPriceHistory,
} from "../../types/search";
import type { TypedSavedSearch } from "../../types/search";
import {
  countCombos, searchByParams, searchOneWayByParams,
} from "../flightService";
import { computeNextCheckAt } from "../../workers/priceCheckWorker";
import { computeSearchCredits, computeTrackingCredits, deductCredits, refundCredits } from "../creditService";
import { BadRequestError, NotFoundError, ConflictError } from "../../errors/AppError";
import { COMBO_HARD_CAP, DEDUP_WINDOW_MS } from "../../config/constants";
import {
  jsonLatestResults, jsonRawLegs, jsonApiFilters,
  jsonAvailableAirlines, jsonAirlineLogos, jsonPriceHistory,
} from "../../types/prismaJson";
import { parseId, validateApiFilters, appendPriceHistory, computeLogosFromResults } from "./helpers";

// ---------------------------------------------------------------------------
// Tracking cost helper
// ---------------------------------------------------------------------------

export function buildTrackingCosts(comboCount: number, dateFrom: string, freeTrackingAvailable = false) {
  const daysUntilDeparture = Math.max(
    1,
    Math.ceil((new Date(dateFrom + "T00:00:00Z").getTime() - Date.now()) / 86_400_000)
  );

  // Don't return tracking costs for past departures
  if (new Date(dateFrom + "T00:00:00Z").getTime() < Date.now()) return null;

  return {
    7: freeTrackingAvailable ? 0 : computeTrackingCredits(comboCount, Math.min(7, daysUntilDeparture)),
    14: computeTrackingCredits(comboCount, Math.min(14, daysUntilDeparture)),
    30: computeTrackingCredits(comboCount, Math.min(30, daysUntilDeparture)),
    untilDeparture: computeTrackingCredits(comboCount, daysUntilDeparture),
    daysUntilDeparture,
    freeTrackingAvailable,
  };
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
  apiFilters?: ApiFilters;
}

interface TrackingCosts {
  7: number;
  14: number;
  30: number;
  untilDeparture: number;
  daysUntilDeparture: number;
  freeTrackingAvailable: boolean;
}

export async function createSavedSearch(
  userId: string,
  data: CreateSearchInput
): Promise<{ search: TypedSavedSearch; trackingCosts: TrackingCosts | null; creditsCharged: number; remainingBalance: number; resultsError?: string }> {
  const { tripType, origin, destination, dateFrom, dateTo, minNights, maxNights, apiFilters } = data;

  if (!tripType || !origin || !destination || !dateFrom || !dateTo) {
    throw new BadRequestError("Missing required fields");
  }
  if (tripType !== "roundtrip" && tripType !== "oneway") {
    throw new BadRequestError("tripType must be 'roundtrip' or 'oneway'");
  }
  if (origin.length !== 3 || destination.length !== 3) {
    throw new BadRequestError("Airport codes must be 3 characters");
  }
  if (dateFrom >= dateTo) {
    throw new BadRequestError("dateFrom must be before dateTo");
  }

  if (tripType === "roundtrip") {
    if (minNights == null || maxNights == null) {
      throw new BadRequestError("minNights and maxNights are required for round trips");
    }
    if (minNights > maxNights) {
      throw new BadRequestError("minNights must be <= maxNights");
    }
  }

  validateApiFilters(apiFilters);

  // Combo count validation
  let comboCount: number;
  if (tripType === "roundtrip") {
    comboCount = countCombos({ dateFrom, dateTo, minNights: minNights!, maxNights: maxNights! });
  } else {
    const diffMs = new Date(dateTo).getTime() - new Date(dateFrom).getTime();
    comboCount = Math.floor(diffMs / 86_400_000) + 1;
  }
  if (comboCount > COMBO_HARD_CAP) {
    throw new BadRequestError(
      `Too many combinations (${comboCount}). Maximum is ${COMBO_HARD_CAP}. Narrow your date range or nights.`,
      { comboCount }
    );
  }

  const uid = parseId(userId);

  // Anti-gaming: 24h dedup — throw 409 with existing search ID
  const twentyFourHoursAgo = new Date(Date.now() - DEDUP_WINDOW_MS);
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
    throw new ConflictError(
      "Duplicate search — identical search created within 24 hours",
      { existingSearchId: existingDup.id }
    );
  }

  // Check if this is the user's first free search
  const currentUser = await prisma.user.findUniqueOrThrow({
    where: { id: uid },
    select: { hasUsedFreeSearch: true, hasUsedFreeTracking: true, creditBalance: true },
  });
  const isFreeSearch = !currentUser.hasUsedFreeSearch;
  const freeTrackingAvailable = !currentUser.hasUsedFreeTracking;

  const routeLabel = `Search: ${origin.toUpperCase()}-${destination.toUpperCase()}`;
  let searchCreditCost: number;
  let remainingBalance: number;

  if (isFreeSearch) {
    searchCreditCost = 0;
    remainingBalance = currentUser.creditBalance;
  } else {
    searchCreditCost = computeSearchCredits(comboCount);
    remainingBalance = await deductCredits(uid, searchCreditCost, "search", null, routeLabel);
  }

  // Create the search record
  let search = await prisma.savedSearch.create({
    data: {
      userId: uid,
      tripType,
      origin: origin.toUpperCase(),
      destination: destination.toUpperCase(),
      dateFrom,
      dateTo,
      comboCount,
      searchCredits: searchCreditCost,
      apiFilters: jsonApiFilters(apiFilters ?? {}),
      trackingActive: false,
      active: false,
      ...(tripType === "roundtrip" && {
        minNights: Number(minNights),
        maxNights: Number(maxNights),
      }),
    },
  });

  // Run the full SerpAPI search with API-level filters
  let resultsError: string | undefined;
  try {
    if (search.tripType === "oneway") {
      const { results, cheapestPrice, availableAirlines, airlineLogos, rawLegs } =
        await searchOneWayByParams({
          origin: search.origin,
          destination: search.destination,
          dateFrom: search.dateFrom,
          dateTo: search.dateTo,
          apiFilters,
        });

      search = await prisma.savedSearch.update({
        where: { id: search.id },
        data: {
          rawLegs: jsonRawLegs({ outbound: rawLegs, return: [] }),
          latestResults: jsonLatestResults(results),
          cheapestPrice,
          availableAirlines: jsonAvailableAirlines(availableAirlines),
          airlineLogos: jsonAirlineLogos(airlineLogos),
          lastCheckedAt: new Date(),
          nextCheckAt: computeNextCheckAt(search.dateFrom),
          priceHistory: jsonPriceHistory(appendPriceHistory([], cheapestPrice)),
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
          apiFilters,
        });

      search = await prisma.savedSearch.update({
        where: { id: search.id },
        data: {
          rawLegs: jsonRawLegs(allRawOptions),
          latestResults: jsonLatestResults([...results, ...unhydratedOptions]),
          cheapestPrice,
          availableAirlines: jsonAvailableAirlines(availableAirlines),
          airlineLogos: jsonAirlineLogos(airlineLogos),
          lastCheckedAt: new Date(),
          nextCheckAt: computeNextCheckAt(search.dateFrom),
          priceHistory: jsonPriceHistory(appendPriceHistory([], cheapestPrice)),
        },
      });
    }
  } catch (err) {
    // SerpAPI failed after credits were deducted — refund and clean up
    if (!isFreeSearch) {
      await refundCredits(uid, searchCreditCost, search.id, `Refund: ${routeLabel} (search failed)`);
    }
    await prisma.savedSearch.delete({ where: { id: search.id } });
    throw err;
  }

  // Mark free search as used (only after successful SerpAPI call)
  if (isFreeSearch) {
    await prisma.user.update({
      where: { id: uid },
      data: { hasUsedFreeSearch: true },
    });
  }

  // Refund credits if the search returned 5 or fewer results
  const resultCount = readLatestResults(search.latestResults).length;
  let creditsCharged = searchCreditCost;
  if (!isFreeSearch && resultCount <= 5) {
    remainingBalance = await refundCredits(uid, searchCreditCost, search.id,
      `Refund: ${routeLabel} (only ${resultCount} result${resultCount === 1 ? "" : "s"} found)`);
    creditsCharged = 0;
    await prisma.savedSearch.update({
      where: { id: search.id },
      data: { searchCredits: 0 },
    });
  }

  return {
    search: search as unknown as TypedSavedSearch,
    trackingCosts: buildTrackingCosts(comboCount, search.dateFrom, freeTrackingAvailable),
    creditsCharged,
    remainingBalance,
    resultsError,
  };
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

export async function getUserSearches(userId: string) {
  const n = parseInt(userId, 10);
  if (Number.isNaN(n)) return [];

  const searches = await prisma.savedSearch.findMany({
    where: { userId: n },
    omit: { rawLegs: true, availableAirlines: true, filters: true },
    orderBy: { createdAt: "desc" },
  });

  return searches.map((s) => {
    const results = readLatestResults(s.latestResults);
    const logos = readAirlineLogos(s.airlineLogos);

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
      trackingActive: s.trackingActive,
      searchCredits: s.searchCredits,
      trackingCredits: s.trackingCredits,
      comboCount: s.comboCount,
      trackingDays: s.trackingDays,
      trackingStartedAt: s.trackingStartedAt,
      createdAt: s.createdAt,
      resultCount: results.length,
      airlineLogos: topLogos,
      priceHistory: readPriceHistory(s.priceHistory),
      apiFilters: s.apiFilters,
    };
  });
}

export async function getSearchById(id: string, userId: string) {
  const searchId = parseId(id);
  const uid = parseId(userId);

  const search = await prisma.savedSearch.findFirst({
    where: { id: searchId, userId: uid },
    omit: { rawLegs: true },
  });
  if (!search) throw new NotFoundError("Search not found");

  // Check if user still has free tracking available
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: uid },
    select: { hasUsedFreeTracking: true },
  });
  const freeTrackingAvailable = !user.hasUsedFreeTracking;

  // Backfill airlineLogos from latestResults if column is empty (pre-migration data)
  const logos = readAirlineLogos(search.airlineLogos);
  if (Object.keys(logos).length === 0) {
    const computed = computeLogosFromResults(
      readLatestResults(search.latestResults) as any[],
      search.tripType
    );
    if (Object.keys(computed).length > 0) {
      await prisma.savedSearch.update({
        where: { id: search.id },
        data: { airlineLogos: jsonAirlineLogos(computed) },
      });
      const trackingCosts = buildTrackingCosts(search.comboCount ?? 1, search.dateFrom, freeTrackingAvailable);
      return { ...search, airlineLogos: jsonAirlineLogos(computed), trackingCosts };
    }
  }

  const trackingCosts = buildTrackingCosts(search.comboCount ?? 1, search.dateFrom, freeTrackingAvailable);
  return { ...search, trackingCosts };
}

// ---------------------------------------------------------------------------
// Delete / Toggle
// ---------------------------------------------------------------------------

export async function deleteSearch(id: string, userId: string) {
  const searchId = parseId(id);
  const uid = parseId(userId);

  const result = await prisma.savedSearch.deleteMany({
    where: { id: searchId, userId: uid },
  });
  if (result.count === 0) throw new NotFoundError("Search not found");
  return true;
}

export async function toggleSearchActive(id: string, userId: string) {
  const searchId = parseId(id);
  const uid = parseId(userId);

  const search = await prisma.savedSearch.findFirst({
    where: { id: searchId, userId: uid },
  });
  if (!search) throw new NotFoundError("Search not found");

  const today = new Date().toISOString().slice(0, 10);
  if (!search.active && search.dateTo < today) {
    throw new BadRequestError("Cannot re-activate a search with past dates");
  }

  const updated = await prisma.savedSearch.update({
    where: { id: search.id },
    data: {
      active: !search.active,
      ...(!search.active && { nextCheckAt: new Date() }),
    },
    omit: { latestResults: true, rawLegs: true },
  });
  return updated;
}
