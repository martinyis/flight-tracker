import prisma from "../../config/db";
import {
  SearchFilters, OneWayRawLegs,
  isLegacyRoundTripRawLegs, isComboRawLegs,
  readSearchFilters, readApiFilters, readAvailableAirlines,
  readPriceHistory, readLatestResults,
} from "../../types/search";
import type { FlightCombo, FlightLeg } from "../flightService";
import {
  searchByParams, searchOneWayByParams,
  hydrateReturnLegs, filterAndSortRawOptions,
  filterCombosLocally, reduceOneWayFromLegs,
  fetchReturnLeg,
} from "../flightService";
import { computeNextCheckAt } from "../../workers/priceCheckWorker";
import {
  BadRequestError, NotFoundError,
  PaymentRequiredError, TooManyRequestsError,
} from "../../errors/AppError";
import { REFRESH_MIN_INTERVAL_MS, TOP_RESULTS_LIMIT } from "../../config/constants";
import {
  jsonLatestResults, jsonRawLegs, jsonFilters,
  jsonAvailableAirlines, jsonAirlineLogos, jsonPriceHistory,
} from "../../types/prismaJson";
import { parseId, appendPriceHistory } from "./helpers";

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

  const search = await prisma.savedSearch.findFirst({
    where: { id: searchId, userId: uid },
  });
  if (!search) throw new NotFoundError("Search not found");

  // Gate: tracking must be activated
  if (!search.trackingActive) {
    throw new PaymentRequiredError(
      "Tracking not activated. Activate tracking to enable price monitoring.",
      { code: "TRACKING_REQUIRED" }
    );
  }

  // 8-hour minimum refresh interval
  if (search.lastCheckedAt) {
    const age = Date.now() - new Date(search.lastCheckedAt).getTime();
    if (age < REFRESH_MIN_INTERVAL_MS) {
      throw new TooManyRequestsError(
        "Data is still fresh. Next refresh available in " +
          Math.ceil((REFRESH_MIN_INTERVAL_MS - age) / 3600_000) + " hours.",
        { code: "TOO_SOON" }
      );
    }
  }

  const filters = resetFilter ? undefined : readSearchFilters(search.filters);
  const searchApiFilters = readApiFilters(search.apiFilters);
  const existingHistory = readPriceHistory(search.priceHistory);

  if (search.tripType === "oneway") {
    const { results, cheapestPrice, availableAirlines, airlineLogos, rawLegs } =
      await searchOneWayByParams({
        origin: search.origin,
        destination: search.destination,
        dateFrom: search.dateFrom,
        dateTo: search.dateTo,
        filters,
        apiFilters: searchApiFilters,
      });

    const updated = await prisma.savedSearch.update({
      where: { id: search.id },
      data: {
        rawLegs: jsonRawLegs({ outbound: rawLegs, return: [] }),
        latestResults: jsonLatestResults(results),
        cheapestPrice,
        availableAirlines: jsonAvailableAirlines(availableAirlines),
        airlineLogos: jsonAirlineLogos(airlineLogos),
        lastCheckedAt: new Date(),
        priceHistory: jsonPriceHistory(appendPriceHistory(existingHistory, cheapestPrice)),
        ...(resetFilter && { filters: jsonFilters({}) }),
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
        apiFilters: searchApiFilters,
      });

    const updated = await prisma.savedSearch.update({
      where: { id: search.id },
      data: {
        rawLegs: jsonRawLegs(allRawOptions),
        latestResults: jsonLatestResults([...results, ...unhydratedOptions]),
        cheapestPrice,
        availableAirlines: jsonAvailableAirlines(availableAirlines),
        airlineLogos: jsonAirlineLogos(airlineLogos),
        lastCheckedAt: new Date(),
        priceHistory: jsonPriceHistory(appendPriceHistory(existingHistory, cheapestPrice)),
        ...(resetFilter && { filters: jsonFilters({}) }),
      },
      omit: { rawLegs: true },
    });
    return updated;
  }
}

// ---------------------------------------------------------------------------
// Update filters — pure local filtering, NO SerpAPI calls
// ---------------------------------------------------------------------------

export async function updateFilters(
  id: string,
  userId: string,
  filters: SearchFilters
) {
  const searchId = parseId(id);
  const uid = parseId(userId);

  const search = await prisma.savedSearch.findFirst({
    where: { id: searchId, userId: uid },
  });
  if (!search) throw new NotFoundError("Search not found");

  const availableAirlines = readAvailableAirlines(search.availableAirlines);
  if (filters.airlines && filters.airlines.length > 0) {
    const invalid = filters.airlines.filter(
      (a) => !availableAirlines.includes(a)
    );
    if (invalid.length > 0) {
      throw new BadRequestError(`Unknown airlines: ${invalid.join(", ")}`);
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
      const filtered = filterCombosLocally(raw, filters, TOP_RESULTS_LIMIT);
      results = filtered.results;
      cheapestPrice = filtered.cheapestPrice;
    } else if (isLegacyRoundTripRawLegs(raw)) {
      const filtered = filterAndSortRawOptions(raw, filters, TOP_RESULTS_LIMIT);
      results = filtered;
      cheapestPrice = filtered.length > 0 ? filtered[0].price : null;
    } else {
      results = [];
      cheapestPrice = null;
    }
  }

  const updated = await prisma.savedSearch.update({
    where: { id: search.id },
    data: {
      filters: jsonFilters(filters),
      latestResults: jsonLatestResults(results as FlightCombo[] | FlightLeg[]),
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

  const search = await prisma.savedSearch.findFirst({
    where: { id: searchId, userId: uid },
  });
  if (!search) throw new NotFoundError("Search not found");

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
  const searchFilters = readSearchFilters(search.filters);
  const searchApiFilters = readApiFilters(search.apiFilters);
  const { combos, availableAirlines, airlineLogos } = await hydrateReturnLegs(
    raw,
    search.origin,
    search.destination,
    searchFilters,
    TOP_RESULTS_LIMIT,
    searchApiFilters
  );

  const cheapestPrice = combos.length > 0
    ? Math.min(...combos.map((c) => c.totalPrice))
    : null;

  const updated = await prisma.savedSearch.update({
    where: { id: search.id },
    data: {
      rawLegs: jsonRawLegs(combos),
      latestResults: jsonLatestResults(combos),
      cheapestPrice,
      availableAirlines: jsonAvailableAirlines(availableAirlines),
      airlineLogos: jsonAirlineLogos(airlineLogos),
    },
    omit: { rawLegs: true },
  });
  return updated;
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

  const search = await prisma.savedSearch.findFirst({
    where: { id: searchId, userId: uid },
  });
  if (!search) throw new NotFoundError("Search or flight not found");

  const latestResults = readLatestResults(search.latestResults) as any[];
  if (optionIndex < 0 || optionIndex >= latestResults.length) {
    throw new BadRequestError("Invalid option index");
  }

  const option = latestResults[optionIndex];

  // Already hydrated?
  if ("return" in option && option.return != null) {
    return { combo: option, index: optionIndex };
  }

  if (!option.departure_token) {
    throw new BadRequestError("Cannot hydrate: no departure_token");
  }

  const searchApiFilters = readApiFilters(search.apiFilters);
  const returnLeg = await fetchReturnLeg(
    option.departure_token,
    search.origin,
    search.destination,
    option.outboundDate,
    option.returnDate,
    searchApiFilters
  );

  if (!returnLeg) {
    throw new NotFoundError("Return flight not available");
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
    data: { latestResults: jsonLatestResults(latestResults) },
  });

  return { combo, index: optionIndex };
}
