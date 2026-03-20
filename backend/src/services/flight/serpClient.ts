import { ApiFilters, RoundTripRawOption } from "../../types/search";
import { SERP_COST_PER_CALL } from "../../config/constants";
import { FlightLeg, SerpFlight } from "./types";
import { diffDays } from "./dateUtils";
import logger from "../../config/logger";

const serpLog = logger.child({ component: "serpClient" });

const SERP_BASE = "https://serpapi.com/search.json";

// ── API call tracker (function-scoped, no global state) ──

export interface Tracker {
  track(type: string, detail: string): void;
  printSummary(label: string): void;
}

export function createTracker(): Tracker {
  const calls: { type: string; detail: string; cost: number }[] = [];
  let count = 0;

  return {
    track(type: string, detail: string) {
      count++;
      calls.push({ type, detail, cost: SERP_COST_PER_CALL });
      serpLog.debug({ callNum: count, type, detail, cost: SERP_COST_PER_CALL }, "SerpAPI call");
    },
    printSummary(label: string) {
      const totalCost = calls.length * SERP_COST_PER_CALL;
      const rtCalls = calls.filter((c) => c.type === "searchRoundTrip").length;
      const returnCalls = calls.filter((c) => c.type === "fetchReturnLeg").length;
      const owCalls = calls.filter((c) => c.type === "searchOneWay").length;

      serpLog.info(
        {
          label,
          totalCalls: calls.length,
          roundTripCalls: rtCalls,
          returnLegCalls: returnCalls,
          oneWayCalls: owCalls,
          totalCostUsd: parseFloat(totalCost.toFixed(3)),
        },
        "SerpAPI cost summary"
      );
    },
  };
}

// ── Concurrency helper ──

export async function pMap<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  concurrency: number,
  fallback?: R
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let idx = 0;
  let failCount = 0;

  async function worker() {
    while (idx < items.length) {
      const i = idx++;
      try {
        results[i] = await fn(items[i]);
      } catch (err) {
        failCount++;
        serpLog.warn(
          { index: i, total: items.length, failCount, error: (err as Error).message },
          "pMap: individual call failed, using fallback"
        );
        if (fallback !== undefined) {
          results[i] = fallback;
        } else {
          throw err;
        }
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker())
  );

  if (failCount > 0) {
    serpLog.warn({ failCount, total: items.length }, "pMap completed with failures");
  }

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

  // Extract IATA code from first flight number (e.g. "WN 1234" → "WN")
  const airlineCode = first?.flight_number?.match(/^([A-Z0-9]{2})/)?.[1] ?? undefined;

  return {
    date,
    price: group.price,
    airline: first.airline,
    airline_code: airlineCode,
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

/** Search SerpAPI as a round-trip (type=1). Retries once on transient errors. */
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

  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, 1000 + Math.random() * 1000));
      serpLog.info({ attempt, outboundDate, returnDate }, "Retrying searchRoundTrip");
    }
    try {
      const res = await fetch(`${SERP_BASE}?${params}`);
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`SerpAPI error ${res.status}: ${body}`);
      }

      const data: any = await res.json();
      const options: RoundTripRawOption[] = [];
      const nights = diffDays(outboundDate, returnDate);

      const bestCount = data.best_flights?.length ?? 0;
      const otherCount = data.other_flights?.length ?? 0;

      // Log first call's full response structure to diagnose empty results
      if (bestCount === 0 && otherCount === 0) {
        serpLog.warn(
          {
            outboundDate, returnDate,
            origin, destination,
            responseKeys: Object.keys(data),
            searchMetadata: data.search_metadata ?? null,
            searchParameters: data.search_parameters ?? null,
            priceInsights: data.price_insights ?? null,
            error: data.error ?? null,
          },
          "searchRoundTrip: SerpAPI returned 0 flights"
        );
      }

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
    } catch (err) {
      lastError = err as Error;
    }
  }

  throw lastError!;
}

/** Fetch return flight details for a selected outbound via its departure_token. Retries once on error. */
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

  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, 1000 + Math.random() * 1000));
      serpLog.info({ attempt, outboundDate, returnDate }, "Retrying fetchReturnLeg");
    }
    try {
      const res = await fetch(`${SERP_BASE}?${params}`);
      if (!res.ok) {
        const body = await res.text();
        serpLog.warn({ status: res.status, body: body.slice(0, 200) }, "fetchReturnLeg HTTP error");
        continue;
      }

      const data: any = await res.json();
      const allFlights = [...(data.best_flights ?? []), ...(data.other_flights ?? [])];
      if (allFlights.length === 0 || !allFlights[0].flights?.length) return null;

      return parseLeg(allFlights[0], returnDate);
    } catch (err) {
      serpLog.warn({ error: (err as Error).message }, "fetchReturnLeg network error");
    }
  }

  return null;
}
