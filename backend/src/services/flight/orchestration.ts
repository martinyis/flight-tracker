import { SearchFilters, ApiFilters, RoundTripRawOption } from "../../types/search";
import {
  SERP_CONCURRENCY, SENTINEL_CONCURRENCY,
  TOP_HYDRATE_COUNT, TOP_RESULTS_LIMIT, RAW_LEGS_POOL_SIZE,
} from "../../config/constants";
import { FlightLeg, FlightCombo, SearchParams, OneWaySearchParams, OneWayResult } from "./types";
import { addDays, generateDates, sampleDates } from "./dateUtils";
import { createTracker, pMap, searchRoundTrip, searchOneWay, fetchReturnLeg } from "./serpClient";
import {
  extractAirlines, extractAirlineLogos,
  filterAndSortRawOptions, filterCombosByAirline, reduceOneWayFromLegs,
} from "./filtering";
import logger from "../../config/logger";

const searchLog = logger.child({ component: "orchestration" });

// ── Sentinel price checking ──

export async function fetchSentinelPrices(
  origin: string,
  destination: string,
  sentinels: { out: string; ret: string }[],
  apiFilters?: ApiFilters
): Promise<{ sentinelCheapest: number | null }> {
  const tracker = createTracker();

  const allResults = await pMap(
    sentinels,
    (pair) => searchRoundTrip(origin, destination, pair.out, pair.ret, apiFilters, tracker),
    SENTINEL_CONCURRENCY,
    [] as RoundTripRawOption[]
  );

  const allOptions = allResults.flat();
  const cheapest =
    allOptions.length > 0
      ? Math.min(...allOptions.map((o) => o.price))
      : null;

  tracker.printSummary("SENTINEL CHECK");
  return { sentinelCheapest: cheapest };
}

// ── Round-trip search ──

export async function fetchAndReduceCombos(
  params: SearchParams
): Promise<{
  combos: FlightCombo[];
  unhydratedOptions: RoundTripRawOption[];
  availableAirlines: string[];
  airlineLogos: Record<string, string>;
  allRawOptions: RoundTripRawOption[];
}> {
  const tracker = createTracker();
  const { origin, destination, dateFrom, dateTo, minNights, maxNights } = params;

  const lastOutbound = addDays(dateTo, -minNights);
  const outboundDates = generateDates(dateFrom, lastOutbound);
  const datePairs: { out: string; ret: string }[] = [];
  for (const out of outboundDates) {
    const earliestReturn = addDays(out, minNights);
    const latestReturn = addDays(out, maxNights);
    const clampedLatest = latestReturn <= dateTo ? latestReturn : dateTo;
    const returnDates = generateDates(earliestReturn, clampedLatest);
    for (const ret of returnDates) {
      datePairs.push({ out, ret });
    }
  }

  searchLog.info(
    {
      origin, destination, dateFrom, dateTo, minNights, maxNights,
      lastOutboundDate: lastOutbound,
      outboundDatesCount: outboundDates.length,
      outboundDatesRange: outboundDates.length > 0
        ? `${outboundDates[0]} to ${outboundDates[outboundDates.length - 1]}`
        : "EMPTY",
      datePairsCount: datePairs.length,
      firstPair: datePairs[0] ?? null,
      lastPair: datePairs[datePairs.length - 1] ?? null,
      apiFilters: params.apiFilters ?? null,
    },
    "fetchAndReduceCombos: starting search"
  );

  if (datePairs.length === 0) {
    searchLog.error(
      { dateFrom, dateTo, minNights, maxNights, lastOutboundDate: lastOutbound },
      "fetchAndReduceCombos: ZERO date pairs generated — no API calls will be made"
    );
  }

  const allResults = await pMap(
    datePairs,
    (pair) => searchRoundTrip(origin, destination, pair.out, pair.ret, params.apiFilters, tracker),
    SERP_CONCURRENCY,
    [] as RoundTripRawOption[]
  );

  // Count how many API calls returned results vs empty
  const callsWithResults = allResults.filter((r) => r.length > 0).length;
  const callsEmpty = allResults.filter((r) => r.length === 0).length;

  const rawRoundTrips = allResults.flat();

  searchLog.info(
    {
      totalApiCalls: datePairs.length,
      callsWithResults,
      callsEmpty,
      totalRawOptions: rawRoundTrips.length,
      samplePrices: rawRoundTrips.slice(0, 5).map((o) => ({
        price: o.price,
        out: o.outboundDate,
        ret: o.returnDate,
        nights: o.nights,
      })),
    },
    "fetchAndReduceCombos: SerpAPI calls complete"
  );

  if (rawRoundTrips.length === 0) {
    searchLog.warn(
      { origin, destination, datePairsCount: datePairs.length },
      "fetchAndReduceCombos: ALL API calls returned 0 results — SerpAPI may not cover this route"
    );
  }

  // Store a larger pool in rawLegs so airline filtering has more options to draw from
  const rawPool = filterAndSortRawOptions(rawRoundTrips, undefined, RAW_LEGS_POOL_SIZE);
  const top10 = rawPool.slice(0, TOP_RESULTS_LIMIT);

  const toHydrate = top10.slice(0, TOP_HYDRATE_COUNT);
  // Filter unhydrated options by outbound airline so excluded airlines don't leak into latestResults
  const unhydrated = filterAndSortRawOptions(top10.slice(TOP_HYDRATE_COUNT), params.filters);

  searchLog.info(
    {
      rawPoolSize: rawPool.length,
      top10Count: top10.length,
      toHydrateCount: toHydrate.length,
      unhydratedCount: unhydrated.length,
    },
    "fetchAndReduceCombos: filtered and sorted"
  );

  const hydratedCombos = await buildCombosFromRawOptions(toHydrate, origin, destination, params.apiFilters, tracker);

  searchLog.info(
    {
      toHydrateCount: toHydrate.length,
      hydratedComboCount: hydratedCombos.length,
      failedHydrations: toHydrate.length - hydratedCombos.length,
    },
    "fetchAndReduceCombos: hydration complete"
  );

  // Extract available airlines from the full pool so filter chips show all options
  const poolLegs = rawPool.map((o) => o.outbound);
  const hydratedLegs = hydratedCombos.flatMap((c) => [c.outbound, c.return]);
  const allLegs = [...hydratedLegs, ...poolLegs];
  const availableAirlines = extractAirlines(allLegs);
  const airlineLogos = extractAirlineLogos(allLegs);

  const combos = filterCombosByAirline(hydratedCombos, params.filters, TOP_HYDRATE_COUNT);

  searchLog.info(
    {
      finalCombos: combos.length,
      unhydratedOptions: unhydrated.length,
      availableAirlines,
    },
    "fetchAndReduceCombos: DONE"
  );

  tracker.printSummary("FULL SEARCH (fetchAndReduceCombos)");
  return { combos, unhydratedOptions: unhydrated, availableAirlines, airlineLogos, allRawOptions: rawPool };
}

/** Build FlightCombo[] from raw options by fetching return leg details. */
export async function buildCombosFromRawOptions(
  options: RoundTripRawOption[],
  origin: string,
  destination: string,
  apiFilters?: ApiFilters,
  tracker?: import("./serpClient").Tracker
): Promise<FlightCombo[]> {
  const combos: FlightCombo[] = [];

  const returnLegs = await pMap(
    options,
    async (opt) => {
      if (!opt.departure_token) return null;
      return fetchReturnLeg(
        opt.departure_token,
        origin,
        destination,
        opt.outboundDate,
        opt.returnDate,
        apiFilters,
        tracker
      );
    },
    SERP_CONCURRENCY
  );

  for (let i = 0; i < options.length; i++) {
    const opt = options[i];
    const retLeg = returnLegs[i];
    if (!retLeg) continue;

    combos.push({
      outbound: opt.outbound,
      return: retLeg,
      totalPrice: retLeg.price ?? opt.price,
      nights: opt.nights,
    });
  }

  return combos;
}

export async function searchByParams(
  params: SearchParams
): Promise<{
  results: FlightCombo[];
  unhydratedOptions: RoundTripRawOption[];
  cheapestPrice: number | null;
  availableAirlines: string[];
  airlineLogos: Record<string, string>;
  allRawOptions: RoundTripRawOption[];
}> {
  const { combos, unhydratedOptions, availableAirlines, airlineLogos, allRawOptions } =
    await fetchAndReduceCombos(params);
  const cheapestPrice =
    combos.length > 0
      ? Math.min(...combos.map((r) => r.totalPrice))
      : null;
  return { results: combos, unhydratedOptions, cheapestPrice, availableAirlines, airlineLogos, allRawOptions };
}

// ── Price-only search for cron (no return-leg fetching) ──

export async function fetchPriceOnly(
  params: SearchParams & { sampleInterval?: number; apiFilters?: ApiFilters }
): Promise<{
  rawOptions: RoundTripRawOption[];
  cheapestPrice: number | null;
  availableAirlines: string[];
  airlineLogos: Record<string, string>;
}> {
  const tracker = createTracker();
  const { origin, destination, dateFrom, dateTo, minNights, maxNights, sampleInterval = 1, apiFilters } = params;

  const allOutboundDates = generateDates(dateFrom, addDays(dateTo, -minNights));
  const outboundDates = sampleDates(allOutboundDates, sampleInterval);
  const datePairs: { out: string; ret: string }[] = [];
  for (const out of outboundDates) {
    const earliestReturn = addDays(out, minNights);
    const latestReturn = addDays(out, maxNights);
    const clampedLatest = latestReturn <= dateTo ? latestReturn : dateTo;
    const returnDates = generateDates(earliestReturn, clampedLatest);
    for (const ret of returnDates) {
      datePairs.push({ out, ret });
    }
  }

  const allResults = await pMap(
    datePairs,
    (pair) => searchRoundTrip(origin, destination, pair.out, pair.ret, apiFilters, tracker),
    SERP_CONCURRENCY,
    [] as RoundTripRawOption[]
  );

  const rawRoundTrips = allResults.flat();
  const top10 = filterAndSortRawOptions(rawRoundTrips, undefined, TOP_RESULTS_LIMIT);

  const outboundLegs = top10.map((opt) => opt.outbound);
  const availableAirlines = extractAirlines(outboundLegs);
  const airlineLogos = extractAirlineLogos(outboundLegs);

  const cheapestPrice = top10.length > 0 ? top10[0].price : null;

  tracker.printSummary("CRON CHECK (fetchPriceOnly)");
  return { rawOptions: top10, cheapestPrice, availableAirlines, airlineLogos };
}

// ── On-demand hydration of return legs ──

export async function hydrateReturnLegs(
  rawOptions: RoundTripRawOption[],
  origin: string,
  destination: string,
  filters?: SearchFilters,
  limit = TOP_RESULTS_LIMIT,
  apiFilters?: ApiFilters
): Promise<{
  combos: FlightCombo[];
  availableAirlines: string[];
  airlineLogos: Record<string, string>;
}> {
  const tracker = createTracker();
  const filtered = filterAndSortRawOptions(rawOptions, filters, limit);

  const combos = await buildCombosFromRawOptions(filtered, origin, destination, apiFilters, tracker);

  const allLegs = combos.flatMap((c) => [c.outbound, c.return]);
  const availableAirlines = extractAirlines(allLegs);
  const airlineLogos = extractAirlineLogos(allLegs);

  tracker.printSummary("HYDRATION (hydrateReturnLegs)");
  return { combos, availableAirlines, airlineLogos };
}

// ── One-way search ──

export async function fetchOneWayPriceOnly(
  params: OneWaySearchParams & { sampleInterval?: number; apiFilters?: ApiFilters }
): Promise<{
  rawLegs: FlightLeg[];
  cheapestPrice: number | null;
  availableAirlines: string[];
  airlineLogos: Record<string, string>;
}> {
  const tracker = createTracker();
  const { origin, destination, dateFrom, dateTo, sampleInterval = 1, apiFilters } = params;

  const allDates = generateDates(dateFrom, dateTo);
  const dates = sampleDates(allDates, sampleInterval);

  const allResults = await Promise.all(
    dates.map((d) => searchOneWay(origin, destination, d, apiFilters, tracker))
  );

  const rawLegs = allResults.flat();
  const availableAirlines = extractAirlines(rawLegs);
  const airlineLogos = extractAirlineLogos(rawLegs);
  const results = reduceOneWayFromLegs(rawLegs);
  const cheapestPrice = results.length > 0 ? Math.min(...results.map((r) => r.price)) : null;

  tracker.printSummary("CRON CHECK (fetchOneWayPriceOnly)");
  return { rawLegs, cheapestPrice, availableAirlines, airlineLogos };
}

export async function searchOneWayByParams(
  params: OneWaySearchParams
): Promise<{
  results: FlightLeg[];
  cheapestPrice: number | null;
  availableAirlines: string[];
  airlineLogos: Record<string, string>;
  rawLegs: FlightLeg[];
}> {
  const { results, availableAirlines, airlineLogos, rawLegs } = await fetchAndReduceOneWay(params);
  const cheapestPrice =
    results.length > 0 ? Math.min(...results.map((r) => r.price)) : null;
  return { results, cheapestPrice, availableAirlines, airlineLogos, rawLegs };
}

export async function fetchAndReduceOneWay(
  params: OneWaySearchParams
): Promise<{
  results: OneWayResult[];
  availableAirlines: string[];
  airlineLogos: Record<string, string>;
  rawLegs: FlightLeg[];
}> {
  const tracker = createTracker();
  const { origin, destination, dateFrom, dateTo } = params;

  const dates = generateDates(dateFrom, dateTo);

  const allResults = await Promise.all(
    dates.map((d) => searchOneWay(origin, destination, d, params.apiFilters, tracker))
  );

  const rawLegs = allResults.flat();
  const availableAirlines = extractAirlines(rawLegs);
  const airlineLogos = extractAirlineLogos(rawLegs);
  const results = reduceOneWayFromLegs(rawLegs, params.filters);

  tracker.printSummary("ONE-WAY SEARCH (fetchAndReduceOneWay)");
  return { results, availableAirlines, airlineLogos, rawLegs };
}
