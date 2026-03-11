import { SearchFilters, ApiFilters, RoundTripRawOption } from "../../types/search";
import {
  SERP_CONCURRENCY, SENTINEL_CONCURRENCY,
  TOP_HYDRATE_COUNT, TOP_RESULTS_LIMIT,
} from "../../config/constants";
import { FlightLeg, FlightCombo, SearchParams, OneWaySearchParams, OneWayResult } from "./types";
import { addDays, generateDates, sampleDates } from "./dateUtils";
import { createTracker, pMap, searchRoundTrip, searchOneWay, fetchReturnLeg } from "./serpClient";
import {
  extractAirlines, extractAirlineLogos,
  filterAndSortRawOptions, filterCombosByAirline, reduceOneWayFromLegs,
} from "./filtering";

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
    SENTINEL_CONCURRENCY
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

  const outboundDates = generateDates(dateFrom, addDays(dateTo, -minNights));
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
    (pair) => searchRoundTrip(origin, destination, pair.out, pair.ret, params.apiFilters, tracker),
    SERP_CONCURRENCY
  );

  const rawRoundTrips = allResults.flat();
  const top10 = filterAndSortRawOptions(rawRoundTrips, undefined, TOP_RESULTS_LIMIT);

  const toHydrate = top10.slice(0, TOP_HYDRATE_COUNT);
  const unhydrated = top10.slice(TOP_HYDRATE_COUNT);

  const hydratedCombos = await buildCombosFromRawOptions(toHydrate, origin, destination, params.apiFilters, tracker);

  const hydratedLegs = hydratedCombos.flatMap((c) => [c.outbound, c.return]);
  const unhydratedLegs = unhydrated.map((o) => o.outbound);
  const allLegs = [...hydratedLegs, ...unhydratedLegs];
  const availableAirlines = extractAirlines(allLegs);
  const airlineLogos = extractAirlineLogos(allLegs);

  const combos = filterCombosByAirline(hydratedCombos, params.filters, TOP_HYDRATE_COUNT);

  tracker.printSummary("FULL SEARCH (fetchAndReduceCombos)");
  return { combos, unhydratedOptions: unhydrated, availableAirlines, airlineLogos, allRawOptions: top10 };
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
    SERP_CONCURRENCY
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
