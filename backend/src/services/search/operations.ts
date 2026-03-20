import prisma from "../../config/db";
import {
  ApiFilters, SearchFilters, OneWayRawLegs,
  isLegacyRoundTripRawLegs, isComboRawLegs,
  readSearchFilters, readApiFilters, readAvailableAirlines,
  readPriceHistory, readLatestResults,
} from "../../types/search";
import type { FlightCombo, FlightLeg } from "../flightService";
import {
  searchByParams, searchOneWayByParams,
  hydrateReturnLegs, filterAndSortRawOptions,
  filterCombosLocally, filterCombosByAirline, reduceOneWayFromLegs,
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
  jsonApiFilters, jsonAirlineCodes,
} from "../../types/prismaJson";
import { computeSearchCredits, deductCredits, refundCredits } from "../creditService";
import { parseId, appendPriceHistory, validateApiFilters, resolveAirlineNamesInFilters } from "./helpers";
import { extractAirlineCodes } from "../flight/filtering";
import { AIRLINE_NAME_TO_CODE } from "../../config/constants";
import { buildTrackingCosts } from "./crud";
import logger from "../../config/logger";

const opsLog = logger.child({ component: "searchOps" });

// ---------------------------------------------------------------------------
// Paid refresh — re-search SerpAPI with credit deduction (no tracking required)
// ---------------------------------------------------------------------------

export async function paidRefresh(id: string, userId: string, newApiFilters?: ApiFilters) {
  const searchId = parseId(id);
  const uid = parseId(userId);

  const search = await prisma.savedSearch.findFirst({
    where: { id: searchId, userId: uid },
  });
  if (!search) throw new NotFoundError("Search not found");

  const comboCount = search.comboCount ?? 1;
  const creditCost = computeSearchCredits(comboCount);

  // 3-layer airline name → IATA code resolution BEFORE deducting credits
  if (newApiFilters) {
    // Layer 1: read persisted airlineCodes column
    let nameToCode: Record<string, string> = (search.airlineCodes as Record<string, string>) ?? {};

    // Layer 2: extract from rawLegs if column is empty (pre-migration data)
    if (Object.keys(nameToCode).length === 0 && search.rawLegs) {
      const raw = search.rawLegs as any;
      let legs: FlightLeg[] = [];
      if (raw?.outbound && Array.isArray(raw.outbound)) legs = raw.outbound;
      else if (Array.isArray(raw)) legs = raw.flatMap((c: any) => [c.outbound, c.return].filter(Boolean));
      if (legs.length > 0) nameToCode = extractAirlineCodes(legs);
    }

    // Layer 3: merge static fallback dictionary (lowest priority)
    nameToCode = { ...AIRLINE_NAME_TO_CODE, ...nameToCode };

    opsLog.info({ searchId, nameToCode, incomingFilters: newApiFilters }, "paidRefresh: resolving airline names");
    newApiFilters = resolveAirlineNamesInFilters(newApiFilters, nameToCode);
    validateApiFilters(newApiFilters);
  }

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: uid },
    select: { hasUsedFreeTracking: true },
  });
  const freeTrackingAvailable = !user.hasUsedFreeTracking;

  // Deduct credits after validation passes
  await deductCredits(
    uid,
    creditCost,
    "search_refresh",
    search.id,
    `Re-search: ${search.origin} → ${search.destination}`
  );

  const filters = newApiFilters ? undefined : readSearchFilters(search.filters);
  const searchApiFilters = newApiFilters ?? readApiFilters(search.apiFilters);
  const existingHistory = readPriceHistory(search.priceHistory);

  const MIN_RESULTS_FOR_CHARGE = 5;

  try {
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

      // Refund if too few results
      const tooFewResults = results.length < MIN_RESULTS_FOR_CHARGE;
      if (tooFewResults) {
        await refundCredits(uid, creditCost, search.id, `Re-search returned only ${results.length} results — refunded`);
      }

      const updated = await prisma.savedSearch.update({
        where: { id: search.id },
        data: {
          rawLegs: jsonRawLegs({ outbound: rawLegs, return: [] }),
          latestResults: jsonLatestResults(results),
          cheapestPrice,
          availableAirlines: jsonAvailableAirlines(availableAirlines),
          airlineLogos: jsonAirlineLogos(airlineLogos),
          airlineCodes: jsonAirlineCodes(extractAirlineCodes(rawLegs)),
          lastCheckedAt: new Date(),
          priceHistory: jsonPriceHistory(appendPriceHistory(existingHistory, cheapestPrice)),
          searchCredits: (search.searchCredits ?? 0) + (tooFewResults ? 0 : creditCost),
          ...(newApiFilters && {
            apiFilters: jsonApiFilters(newApiFilters),
            filters: jsonFilters({}),
          }),
        },
        omit: { rawLegs: true },
      });
      const tc = buildTrackingCosts(comboCount, search.dateFrom, freeTrackingAvailable);
      return {
        search: { ...updated, trackingCosts: tc },
        creditsCharged: tooFewResults ? 0 : creditCost,
        creditsRefunded: tooFewResults,
      };
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

      const totalResults = results.length + unhydratedOptions.length;
      const tooFewResults = totalResults < MIN_RESULTS_FOR_CHARGE;
      if (tooFewResults) {
        await refundCredits(uid, creditCost, search.id, `Re-search returned only ${totalResults} results — refunded`);
      }

      const updated = await prisma.savedSearch.update({
        where: { id: search.id },
        data: {
          rawLegs: jsonRawLegs(allRawOptions),
          latestResults: jsonLatestResults([...results, ...unhydratedOptions]),
          cheapestPrice,
          availableAirlines: jsonAvailableAirlines(availableAirlines),
          airlineLogos: jsonAirlineLogos(airlineLogos),
          airlineCodes: jsonAirlineCodes(extractAirlineCodes(allRawOptions.flatMap((o: any) => [o.outbound, o.return].filter(Boolean)))),
          lastCheckedAt: new Date(),
          priceHistory: jsonPriceHistory(appendPriceHistory(existingHistory, cheapestPrice)),
          searchCredits: (search.searchCredits ?? 0) + (tooFewResults ? 0 : creditCost),
          ...(newApiFilters && {
            apiFilters: jsonApiFilters(newApiFilters),
            filters: jsonFilters({}),
          }),
        },
        omit: { rawLegs: true },
      });
      const tc = buildTrackingCosts(comboCount, search.dateFrom, freeTrackingAvailable);
      return {
        search: { ...updated, trackingCosts: tc },
        creditsCharged: tooFewResults ? 0 : creditCost,
        creditsRefunded: tooFewResults,
      };
    }
  } catch (err) {
    // Refund credits on SerpAPI failure
    await refundCredits(uid, creditCost, search.id, "Search refresh failed — refunded");
    throw err;
  }
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
        airlineCodes: jsonAirlineCodes(extractAirlineCodes(rawLegs)),
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
        airlineCodes: jsonAirlineCodes(extractAirlineCodes(allRawOptions.flatMap((o: any) => [o.outbound, o.return].filter(Boolean)))),
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

  // Re-apply local airline filter now that return-leg airlines are known
  const filtered = filterCombosByAirline(combos, searchFilters, TOP_RESULTS_LIMIT);
  const cheapestPrice = filtered.length > 0
    ? Math.min(...filtered.map((c) => c.totalPrice))
    : null;

  const updated = await prisma.savedSearch.update({
    where: { id: search.id },
    data: {
      rawLegs: jsonRawLegs(combos),
      latestResults: jsonLatestResults(filtered),
      cheapestPrice,
      availableAirlines: jsonAvailableAirlines(availableAirlines),
      airlineLogos: jsonAirlineLogos(airlineLogos),
      airlineCodes: jsonAirlineCodes(extractAirlineCodes(combos.flatMap(c => [c.outbound, c.return]))),
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
