import { ApiFilters, RoundTripRawOption } from "../../types/search";
import { SERP_COST_PER_CALL } from "../../config/constants";
import { FlightLeg, SerpFlight } from "./types";
import { diffDays } from "./dateUtils";

const SERP_BASE = "https://serpapi.com/search.json";

// ── API call tracker (function-scoped, no global state) ──

export interface Tracker {
  track(type: string, detail: string): void;
  printSummary(label: string): void;
}

export function createTracker(): Tracker {
  const log: { type: string; detail: string; cost: number }[] = [];
  let count = 0;

  return {
    track(type: string, detail: string) {
      count++;
      log.push({ type, detail, cost: SERP_COST_PER_CALL });
      console.log(`  [SerpAPI #${count}] ${type}: ${detail}  ($${SERP_COST_PER_CALL})`);
    },
    printSummary(label: string) {
      const totalCost = log.length * SERP_COST_PER_CALL;
      const rtCalls = log.filter((c) => c.type === "searchRoundTrip").length;
      const returnCalls = log.filter((c) => c.type === "fetchReturnLeg").length;
      const owCalls = log.filter((c) => c.type === "searchOneWay").length;

      console.log("");
      console.log(`  ┌─── API COST SUMMARY: ${label} ───`);
      console.log(`  │  Total calls: ${log.length}`);
      if (rtCalls > 0) console.log(`  │    Round-trip searches: ${rtCalls}`);
      if (returnCalls > 0) console.log(`  │    Return leg fetches:  ${returnCalls}`);
      if (owCalls > 0) console.log(`  │    One-way searches:    ${owCalls}`);
      console.log(`  │  Total cost: $${totalCost.toFixed(3)}`);
      console.log(`  └──────────────────────────────────`);
      console.log("");
    },
  };
}

// ── Concurrency helper ──

export async function pMap<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  concurrency: number
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let idx = 0;

  async function worker() {
    while (idx < items.length) {
      const i = idx++;
      results[i] = await fn(items[i]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker())
  );
  return results;
}

// ── SerpAPI filter param builder ──

export function applySerpApiFilters(params: URLSearchParams, apiFilters?: ApiFilters): void {
  if (!apiFilters) return;
  if (apiFilters.stops) params.set("stops", String(apiFilters.stops));
  if (apiFilters.includeAirlines?.length) {
    params.set("include_airlines", apiFilters.includeAirlines.join(","));
  }
  if (apiFilters.excludeAirlines?.length) {
    params.set("exclude_airlines", apiFilters.excludeAirlines.join(","));
  }
  if (apiFilters.maxDuration) params.set("max_duration", String(apiFilters.maxDuration));
  if (apiFilters.bags != null && apiFilters.bags > 0) params.set("bags", String(apiFilters.bags));
}

// ── Parse SerpAPI flight group into FlightLeg ──

function parseLeg(group: any, date: string): FlightLeg {
  const rawFlights: any[] = group.flights ?? [];
  const flights: SerpFlight[] = rawFlights.map((f: any) => ({
    airline: f.airline,
    airline_logo: f.airline_logo,
    flight_number: f.flight_number,
    departure_airport: f.departure_airport,
    arrival_airport: f.arrival_airport,
    duration: f.duration,
  }));

  const first = flights[0];
  const last = flights[flights.length - 1];

  return {
    date,
    price: group.price,
    airline: first.airline,
    airline_logo: group.airline_logo || first.airline_logo,
    departure_time: first.departure_airport.time,
    arrival_time: last.arrival_airport.time,
    duration: group.total_duration,
    stops: flights.length - 1,
    flights,
    departure_token: group.departure_token,
    booking_token: group.booking_token,
  };
}

// ── SerpAPI calls ──

export async function searchOneWay(
  origin: string,
  destination: string,
  date: string,
  apiFilters?: ApiFilters,
  tracker?: Tracker
): Promise<FlightLeg[]> {
  const params = new URLSearchParams({
    engine: "google_flights",
    departure_id: origin,
    arrival_id: destination,
    outbound_date: date,
    type: "2",
    currency: "USD",
    hl: "en",
    api_key: process.env.SERPAPI_KEY!,
  });
  applySerpApiFilters(params, apiFilters);

  tracker?.track("searchOneWay", `${origin}→${destination} ${date}`);
  const res = await fetch(`${SERP_BASE}?${params}`);
  if (!res.ok) {
    throw new Error(`SerpAPI error ${res.status}: ${await res.text()}`);
  }

  const data: any = await res.json();
  const legs: FlightLeg[] = [];

  for (const group of [...(data.best_flights ?? []), ...(data.other_flights ?? [])]) {
    if (!group.flights?.length) continue;
    legs.push(parseLeg(group, date));
  }

  return legs;
}

/** Search SerpAPI as a round-trip (type=1). */
export async function searchRoundTrip(
  origin: string,
  destination: string,
  outboundDate: string,
  returnDate: string,
  apiFilters?: ApiFilters,
  tracker?: Tracker
): Promise<RoundTripRawOption[]> {
  const params = new URLSearchParams({
    engine: "google_flights",
    departure_id: origin,
    arrival_id: destination,
    outbound_date: outboundDate,
    return_date: returnDate,
    type: "1",
    currency: "USD",
    hl: "en",
    api_key: process.env.SERPAPI_KEY!,
  });
  applySerpApiFilters(params, apiFilters);

  tracker?.track("searchRoundTrip", `${origin}→${destination} ${outboundDate}→${returnDate}`);
  const res = await fetch(`${SERP_BASE}?${params}`);
  if (!res.ok) {
    throw new Error(`SerpAPI error ${res.status}: ${await res.text()}`);
  }

  const data: any = await res.json();
  const options: RoundTripRawOption[] = [];
  const nights = diffDays(outboundDate, returnDate);

  for (const group of [...(data.best_flights ?? []), ...(data.other_flights ?? [])]) {
    if (!group.flights?.length) continue;
    options.push({
      outbound: parseLeg(group, outboundDate),
      price: group.price,
      outboundDate,
      returnDate,
      nights,
      departure_token: group.departure_token,
    });
  }

  return options;
}

/** Fetch return flight details for a selected outbound via its departure_token. */
export async function fetchReturnLeg(
  departureToken: string,
  origin: string,
  destination: string,
  outboundDate: string,
  returnDate: string,
  apiFilters?: ApiFilters,
  tracker?: Tracker
): Promise<FlightLeg | null> {
  const params = new URLSearchParams({
    engine: "google_flights",
    departure_id: origin,
    arrival_id: destination,
    outbound_date: outboundDate,
    return_date: returnDate,
    type: "1",
    departure_token: departureToken,
    currency: "USD",
    hl: "en",
    api_key: process.env.SERPAPI_KEY!,
  });
  applySerpApiFilters(params, apiFilters);

  tracker?.track("fetchReturnLeg", `${origin}→${destination} ${outboundDate}→${returnDate}`);
  const res = await fetch(`${SERP_BASE}?${params}`);
  if (!res.ok) return null;

  const data: any = await res.json();

  const allFlights = [...(data.best_flights ?? []), ...(data.other_flights ?? [])];
  if (allFlights.length === 0 || !allFlights[0].flights?.length) return null;

  return parseLeg(allFlights[0], returnDate);
}
