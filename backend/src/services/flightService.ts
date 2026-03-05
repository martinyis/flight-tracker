import { SearchFilters, RoundTripRawOption } from "../types/search";
import * as fs from "fs";
import * as path from "path";

const SERP_BASE = "https://serpapi.com/search.json";

// ── Debug helpers (temporary) ──
const DEBUG_DIR = path.join(__dirname, "../../debug");
let debugCallIndex = 0;

function debugWrite(filename: string, data: any) {
  try {
    fs.mkdirSync(DEBUG_DIR, { recursive: true });
    fs.writeFileSync(
      path.join(DEBUG_DIR, filename),
      JSON.stringify(data, null, 2)
    );
  } catch (e) {
    console.error("Debug write failed:", e);
  }
}

function resetDebug() {
  debugCallIndex = 0;
  // Clear old debug files
  try {
    const files = fs.readdirSync(DEBUG_DIR);
    for (const f of files) fs.unlinkSync(path.join(DEBUG_DIR, f));
  } catch {}
}

export interface FlightLeg {
  date: string;
  price: number;
  airline: string;
  airline_logo?: string;
  departure_time: string;
  arrival_time: string;
  duration: number;
  stops: number;
  flights: SerpFlight[];
  departure_token?: string;
  booking_token?: string;
}

interface SerpFlight {
  airline: string;
  airline_logo?: string;
  flight_number: string;
  departure_airport: { name: string; id: string; time: string };
  arrival_airport: { name: string; id: string; time: string };
  duration: number;
}

export interface FlightCombo {
  outbound: FlightLeg;
  return: FlightLeg;
  totalPrice: number;
  nights: number;
}

export interface SearchParams {
  origin: string;
  destination: string;
  dateFrom: string;       // YYYY-MM-DD
  dateTo: string;         // YYYY-MM-DD
  minNights: number;
  maxNights: number;
  filters?: SearchFilters;
}

export interface OneWaySearchParams {
  origin: string;
  destination: string;
  dateFrom: string;       // YYYY-MM-DD
  dateTo: string;         // YYYY-MM-DD
  filters?: SearchFilters;
}

export type OneWayResult = FlightLeg;

// ---------- helpers ----------

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function diffDays(a: string, b: string): number {
  const msA = new Date(a + "T00:00:00Z").getTime();
  const msB = new Date(b + "T00:00:00Z").getTime();
  return Math.round((msB - msA) / 86_400_000);
}

function generateDates(from: string, to: string): string[] {
  const dates: string[] = [];
  let cur = from;
  while (cur <= to) {
    dates.push(cur);
    cur = addDays(cur, 1);
  }
  return dates;
}

// ---------- filter helpers ----------

function legMatchesAirlineFilter(leg: FlightLeg, airlines: string[]): boolean {
  if (airlines.length === 0) return true;
  return airlines.includes(leg.airline);
}

export function extractAirlines(allLegs: FlightLeg[]): string[] {
  const set = new Set<string>();
  for (const leg of allLegs) {
    set.add(leg.airline);
  }
  return Array.from(set).sort();
}

/** Build a mapping of airline name -> logo URL from raw flight legs */
export function extractAirlineLogos(allLegs: FlightLeg[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const leg of allLegs) {
    if (leg.airline_logo && !map[leg.airline]) {
      map[leg.airline] = leg.airline_logo;
    }
  }
  return map;
}

// ---------- concurrency helper ----------

async function pMap<T, R>(
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

// ---------- parse SerpAPI flight group into FlightLeg ----------

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

// ---------- filter/sort raw round-trip options (no API calls) ----------

export function filterAndSortRawOptions(
  options: RoundTripRawOption[],
  filters?: SearchFilters,
  limit = 10
): RoundTripRawOption[] {
  const airlineFilter = filters?.airlines ?? [];
  let filtered = options;
  if (airlineFilter.length > 0) {
    filtered = options.filter((opt) =>
      legMatchesAirlineFilter(opt.outbound, airlineFilter)
    );
  }
  filtered.sort((a, b) => a.price - b.price);
  return filtered.slice(0, limit);
}

export function reduceOneWayFromLegs(
  legs: FlightLeg[],
  filters?: SearchFilters
): FlightLeg[] {
  const airlineFilter = filters?.airlines ?? [];

  const cheapestByDate = new Map<string, FlightLeg>();
  for (const leg of legs) {
    if (!legMatchesAirlineFilter(leg, airlineFilter)) continue;
    const existing = cheapestByDate.get(leg.date);
    if (!existing || leg.price < existing.price) {
      cheapestByDate.set(leg.date, leg);
    }
  }

  const results = Array.from(cheapestByDate.values());
  results.sort((a, b) => a.price - b.price);
  return results.slice(0, 10);
}

// ---------- SerpAPI calls ----------

async function searchOneWay(
  origin: string,
  destination: string,
  date: string
): Promise<FlightLeg[]> {
  const params = new URLSearchParams({
    engine: "google_flights",
    departure_id: origin,
    arrival_id: destination,
    outbound_date: date,
    type: "2",          // one-way
    currency: "USD",
    hl: "en",
    api_key: process.env.SERPAPI_KEY!,
  });

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

/** Search SerpAPI as a round-trip (type=1). Returns outbound options with real round-trip prices. */
async function searchRoundTrip(
  origin: string,
  destination: string,
  outboundDate: string,
  returnDate: string
): Promise<RoundTripRawOption[]> {
  const params = new URLSearchParams({
    engine: "google_flights",
    departure_id: origin,
    arrival_id: destination,
    outbound_date: outboundDate,
    return_date: returnDate,
    type: "1",          // round-trip
    currency: "USD",
    hl: "en",
    api_key: process.env.SERPAPI_KEY!,
  });

  const res = await fetch(`${SERP_BASE}?${params}`);
  if (!res.ok) {
    throw new Error(`SerpAPI error ${res.status}: ${await res.text()}`);
  }

  const data: any = await res.json();
  const options: RoundTripRawOption[] = [];
  const nights = diffDays(outboundDate, returnDate);

  // Debug: save raw SerpAPI response for this date pair
  const idx = debugCallIndex++;
  debugWrite(`01_roundtrip_raw_${idx}_${outboundDate}_${returnDate}.json`, {
    params: { origin, destination, outboundDate, returnDate },
    raw_best_flights: data.best_flights,
    raw_other_flights: data.other_flights,
  });

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
  returnDate: string
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

  const res = await fetch(`${SERP_BASE}?${params}`);
  if (!res.ok) return null;

  const data: any = await res.json();

  // Debug: save raw return leg response
  const retIdx = debugCallIndex++;
  debugWrite(`02_returnleg_raw_${retIdx}_${outboundDate}_${returnDate}.json`, {
    params: { departureToken: departureToken.slice(0, 30) + "...", origin, destination, outboundDate, returnDate },
    raw_best_flights: data.best_flights,
    raw_other_flights: data.other_flights,
  });

  const allFlights = [...(data.best_flights ?? []), ...(data.other_flights ?? [])];
  if (allFlights.length === 0 || !allFlights[0].flights?.length) return null;

  return parseLeg(allFlights[0], returnDate);
}

// ---------- main round-trip search ----------

export async function fetchAndReduceCombos(
  params: SearchParams
): Promise<{
  combos: FlightCombo[];
  availableAirlines: string[];
  airlineLogos: Record<string, string>;
  allCombos: FlightCombo[];
}> {
  const { origin, destination, dateFrom, dateTo, minNights, maxNights } = params;

  // Reset debug files for this new search
  resetDebug();
  debugWrite("00_search_params.json", params);

  // Generate all valid (outboundDate, returnDate) pairs
  const outboundDates = generateDates(dateFrom, addDays(dateTo, -minNights));
  const datePairs: { out: string; ret: string }[] = [];
  for (const out of outboundDates) {
    const earliestReturn = addDays(out, minNights);
    const latestReturn = addDays(out, maxNights);
    // Clamp to dateTo
    const clampedLatest = latestReturn <= dateTo ? latestReturn : dateTo;
    const returnDates = generateDates(earliestReturn, clampedLatest);
    for (const ret of returnDates) {
      datePairs.push({ out, ret });
    }
  }

  // Search all date pairs with concurrency limit
  const allResults = await pMap(
    datePairs,
    (pair) => searchRoundTrip(origin, destination, pair.out, pair.ret),
    5
  );

  const rawRoundTrips = allResults.flat();

  debugWrite("03_all_raw_roundtrips.json", rawRoundTrips.map((r, i) => ({
    index: i,
    outboundDate: r.outboundDate,
    returnDate: r.returnDate,
    nights: r.nights,
    price_from_initial_search: r.price,
    outbound_airline: r.outbound.airline,
    outbound_departure: r.outbound.departure_time,
    outbound_price_on_leg: r.outbound.price,
  })));

  // Take top 30 by price (NO airline filter) and fetch return legs for all 30
  const top30 = filterAndSortRawOptions(rawRoundTrips, undefined, 30);

  debugWrite("04_top30_before_return_fetch.json", top30.map((r, i) => ({
    index: i,
    outboundDate: r.outboundDate,
    returnDate: r.returnDate,
    nights: r.nights,
    price: r.price,
    outbound_airline: r.outbound.airline,
  })));

  const allCombos = await buildCombosFromRawOptions(top30, origin, destination);

  debugWrite("05_final_combos.json", allCombos.map((c, i) => ({
    index: i,
    totalPrice: c.totalPrice,
    nights: c.nights,
    outbound: {
      date: c.outbound.date,
      airline: c.outbound.airline,
      price_on_leg: c.outbound.price,
      departure: c.outbound.departure_time,
      arrival: c.outbound.arrival_time,
    },
    return: {
      date: c.return.date,
      airline: c.return.airline,
      price_on_leg: c.return.price,
      departure: c.return.departure_time,
      arrival: c.return.arrival_time,
    },
  })));

  // Extract airlines and logos from ALL combo legs (outbound + return)
  const allLegs = allCombos.flatMap((c) => [c.outbound, c.return]);
  const availableAirlines = extractAirlines(allLegs);
  const airlineLogos = extractAirlineLogos(allLegs);

  // Apply airline filter if present for display results (top 10)
  const combos = filterCombosByAirline(allCombos, params.filters, 10);

  return { combos, availableAirlines, airlineLogos, allCombos };
}

/** Build FlightCombo[] from raw options by fetching return leg details. */
export async function buildCombosFromRawOptions(
  options: RoundTripRawOption[],
  origin: string,
  destination: string
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
        opt.returnDate
      );
    },
    5
  );

  for (let i = 0; i < options.length; i++) {
    const opt = options[i];
    const retLeg = returnLegs[i];
    if (!retLeg) continue; // skip if return details unavailable

    combos.push({
      outbound: opt.outbound,
      return: retLeg,
      totalPrice: retLeg.price ?? opt.price,
      nights: opt.nights,
    });
  }

  return combos;
}

/** Post-filter combos so both outbound AND return legs match the airline filter. */
export function filterCombosByAirline(
  combos: FlightCombo[],
  filters?: SearchFilters,
  limit = 10
): FlightCombo[] {
  const airlines = filters?.airlines ?? [];
  if (airlines.length === 0) return combos.slice(0, limit);
  return combos
    .filter(
      (c) =>
        airlines.includes(c.outbound.airline) &&
        airlines.includes(c.return.airline)
    )
    .slice(0, limit);
}

/**
 * Filter stored FlightCombo[] by airline filter, purely in memory.
 * Returns filtered + sorted top N combos, plus derived airlines/logos.
 */
export function filterCombosLocally(
  allCombos: FlightCombo[],
  filters?: SearchFilters,
  limit = 10
): {
  results: FlightCombo[];
  cheapestPrice: number | null;
  availableAirlines: string[];
  airlineLogos: Record<string, string>;
} {
  const allLegs = allCombos.flatMap((c) => [c.outbound, c.return]);
  const availableAirlines = extractAirlines(allLegs);
  const airlineLogos = extractAirlineLogos(allLegs);

  const results = filterCombosByAirline(allCombos, filters, limit);
  const cheapestPrice =
    results.length > 0
      ? Math.min(...results.map((c) => c.totalPrice))
      : null;

  return { results, cheapestPrice, availableAirlines, airlineLogos };
}

// ---------- reusable wrapper ----------

export async function searchByParams(
  params: SearchParams
): Promise<{
  results: FlightCombo[];
  cheapestPrice: number | null;
  availableAirlines: string[];
  airlineLogos: Record<string, string>;
  allCombos: FlightCombo[];
}> {
  const { combos, availableAirlines, airlineLogos, allCombos } =
    await fetchAndReduceCombos(params);
  const cheapestPrice =
    combos.length > 0
      ? Math.min(...combos.map((r) => r.totalPrice))
      : null;
  return { results: combos, cheapestPrice, availableAirlines, airlineLogos, allCombos };
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

// ---------- one-way search ----------

export async function fetchAndReduceOneWay(
  params: OneWaySearchParams
): Promise<{
  results: OneWayResult[];
  availableAirlines: string[];
  airlineLogos: Record<string, string>;
  rawLegs: FlightLeg[];
}> {
  const { origin, destination, dateFrom, dateTo } = params;

  const dates = generateDates(dateFrom, dateTo);

  const allResults = await Promise.all(
    dates.map((d) => searchOneWay(origin, destination, d))
  );

  const rawLegs = allResults.flat();
  const availableAirlines = extractAirlines(rawLegs);
  const airlineLogos = extractAirlineLogos(rawLegs);
  const results = reduceOneWayFromLegs(rawLegs, params.filters);

  return { results, availableAirlines, airlineLogos, rawLegs };
}

// ---------- booking URL from token ----------

/**
 * Extract the best booking URL from a SerpAPI booking_options array.
 *
 * Strategy:
 *  1. POST booking_request to Google's redirect endpoint → follow to airline/OTA
 *  2. If the POST fails, return booking_request.url directly (Google Flights
 *     booking page for the specific flight — still better than a generic search)
 */
async function extractBookingUrl(
  bookingOptions: any[]
): Promise<string | null> {
  for (const opt of bookingOptions) {
    // Prefer "together" (single transaction for all legs)
    const together = opt.together ?? opt.departing;
    const bookingReq = together?.booking_request;
    if (!bookingReq?.url) continue;

    // Try POSTing to get the final airline/OTA redirect URL
    if (bookingReq.post_data) {
      try {
        const redirectRes = await fetch(bookingReq.url, {
          method: "POST",
          body: bookingReq.post_data,
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          },
          redirect: "manual",
        });
        const location = redirectRes.headers.get("location");
        if (location) return location;
      } catch {
        // POST redirect failed — fall through to return the URL directly
      }
    }

    // Fallback: return the booking_request URL itself.
    // This is a Google Flights booking page for the specific flight.
    return bookingReq.url;
  }

  return null;
}

/**
 * Resolve a booking_token into a direct booking URL via SerpAPI.
 *
 * SerpAPI call with booking_token → booking_options[] → extract URL.
 */
async function resolveBookingToken(
  bookingToken: string
): Promise<string | null> {
  const params = new URLSearchParams({
    engine: "google_flights",
    booking_token: bookingToken,
    currency: "USD",
    hl: "en",
    api_key: process.env.SERPAPI_KEY!,
  });

  const res = await fetch(`${SERP_BASE}?${params}`);
  if (!res.ok) return null;

  const data: any = await res.json();
  if (data.booking_options?.length) {
    return extractBookingUrl(data.booking_options);
  }

  return null;
}

/**
 * Full booking flow:
 *
 * ONE-WAY:
 *   booking_token → resolveBookingToken → URL
 *   OR departure_token + type=2 → SerpAPI → booking_options / booking_token → URL
 *
 * ROUND-TRIP:
 *   booking_token (from the return-leg selection) → resolveBookingToken → URL
 *   OR departure_token + type=1 + return_date → SerpAPI → booking_token → URL
 *
 * NOTE: departure_token and booking_token must NOT be sent in the same call.
 */
export async function fetchBookingUrl(opts: {
  departure_token?: string;
  booking_token?: string;
  origin: string;
  destination: string;
  date: string;
  returnDate?: string;
}): Promise<string | null> {
  // ── Fast path: already have a booking_token ──
  if (opts.booking_token) {
    return resolveBookingToken(opts.booking_token);
  }

  if (!opts.departure_token) return null;

  // ── Slow path: use departure_token to get booking options ──
  const isRoundTrip = !!opts.returnDate;
  const params = new URLSearchParams({
    engine: "google_flights",
    departure_id: opts.origin,
    arrival_id: opts.destination,
    outbound_date: opts.date,
    type: isRoundTrip ? "1" : "2",
    departure_token: opts.departure_token,
    currency: "USD",
    hl: "en",
    api_key: process.env.SERPAPI_KEY!,
  });
  if (opts.returnDate) {
    params.set("return_date", opts.returnDate);
  }

  const res = await fetch(`${SERP_BASE}?${params}`);
  if (!res.ok) return null;

  const data: any = await res.json();

  // 1. Direct booking_options (SerpAPI may return these immediately)
  if (data.booking_options?.length) {
    const url = await extractBookingUrl(data.booking_options);
    if (url) return url;
  }

  // 2. Look for a booking_token in the returned flight results
  const allFlights = [
    ...(data.best_flights ?? []),
    ...(data.other_flights ?? []),
  ];
  const bookingToken = allFlights[0]?.booking_token;
  if (bookingToken) {
    return resolveBookingToken(bookingToken);
  }

  return null;
}
