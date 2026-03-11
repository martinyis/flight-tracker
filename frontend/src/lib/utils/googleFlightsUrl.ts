/**
 * Google Flights deep link builder.
 *
 * Encodes flight segment data into the `tfs` protobuf parameter to produce
 * a URL that opens Google Flights with the exact flight pre-selected.
 *
 * Works for both one-way and round-trip flights.
 */

import { AIRPORT_KG_IDS } from "../../data/airportKgIds";

// ─── Types ───

export interface DeepLinkSegment {
  departureAirport: string; // IATA code, e.g. "SJC"
  arrivalAirport: string;   // IATA code, e.g. "BOS"
  date: string;             // "YYYY-MM-DD"
  airlineCode: string;      // IATA code, e.g. "DL"
  flightNumber: string;     // numeric part, e.g. "1260"
}

export interface DeepLinkLeg {
  date: string;              // leg date "YYYY-MM-DD"
  origin: string;            // origin airport IATA
  destination: string;       // destination airport IATA
  segments: DeepLinkSegment[];
}

// ─── Low-level protobuf wire-format encoder ───

function encodeVarint(value: number): number[] {
  const buf: number[] = [];
  // Handle large values (like max uint64) that may exceed safe integer range
  if (value < 0 || value > Number.MAX_SAFE_INTEGER) {
    // Encode 0xFFFFFFFFFFFFFFFF as a special case (9 bytes of 0xFF + 0x01)
    return [0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x01];
  }
  let v = value;
  while (v > 0x7f) {
    buf.push((v & 0x7f) | 0x80);
    v = Math.floor(v / 128);
  }
  buf.push(v & 0x7f);
  return buf;
}

function fieldVarint(fieldNum: number, value: number): number[] {
  const tag = (fieldNum << 3) | 0;
  return [...encodeVarint(tag), ...encodeVarint(value)];
}

function fieldBytes(fieldNum: number, data: number[]): number[] {
  const tag = (fieldNum << 3) | 2;
  return [...encodeVarint(tag), ...encodeVarint(data.length), ...data];
}

function fieldString(fieldNum: number, s: string): number[] {
  const bytes = Array.from(new TextEncoder().encode(s));
  return fieldBytes(fieldNum, bytes);
}

function fieldMessage(fieldNum: number, ...fields: number[][]): number[] {
  const inner = fields.flat();
  return fieldBytes(fieldNum, inner);
}

// ─── Google Flights protobuf structure ───

function encodeCityRef(fieldNum: number, airportCode: string): number[] {
  const kgId = AIRPORT_KG_IDS[airportCode];
  if (kgId) {
    // Use Knowledge Graph city ID (type=3) — required for Google Flights deep links
    return fieldMessage(fieldNum, fieldVarint(1, 3), fieldString(2, kgId));
  }
  // Fallback: use airport IATA code (type=4) — may not resolve to exact flight
  return fieldMessage(fieldNum, fieldVarint(1, 4), fieldString(2, airportCode));
}

function encodeFlightSegment(seg: DeepLinkSegment): number[] {
  return fieldMessage(
    4,
    fieldString(1, seg.departureAirport),
    fieldString(2, seg.date),
    fieldString(3, seg.arrivalAirport),
    fieldString(5, seg.airlineCode),
    fieldString(6, seg.flightNumber)
  );
}

function encodeSlice(leg: DeepLinkLeg): number[] {
  const fields: number[][] = [];
  fields.push(fieldString(2, leg.date));
  for (const seg of leg.segments) {
    fields.push(encodeFlightSegment(seg));
  }
  fields.push(encodeCityRef(13, leg.origin));
  fields.push(encodeCityRef(14, leg.destination));
  return fieldBytes(3, fields.flat());
}

function encodeTfs(legs: DeepLinkLeg[], tripType: 1 | 2): number[] {
  const parts: number[][] = [];
  parts.push(fieldVarint(1, 28));
  parts.push(fieldVarint(2, 2));
  for (const leg of legs) {
    parts.push(encodeSlice(leg));
  }
  parts.push(fieldVarint(8, 1));
  parts.push(fieldVarint(9, 1));
  parts.push(fieldVarint(14, 1));
  // Field 16: nested message with field 1 = max uint64
  parts.push(
    fieldMessage(16, [
      0x08, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x01,
    ])
  );
  parts.push(fieldVarint(19, tripType));
  return parts.flat();
}

// ─── Base64 URL-safe encoding ───

function toUrlSafeBase64(bytes: number[]): string {
  const binary = String.fromCharCode(...bytes);
  const b64 = btoa(binary);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// ─── Helper: parse SerpAPI flight_number into airline code + number ───

export function parseFlightNumber(flightNumber: string): {
  airlineCode: string;
  number: string;
} {
  const parts = flightNumber.trim().split(/\s+/);
  if (parts.length >= 2) {
    return { airlineCode: parts[0], number: parts.slice(1).join("") };
  }
  // Fallback: try to split letters from digits
  const match = flightNumber.match(/^([A-Z]{2})(\d+)$/);
  if (match) {
    return { airlineCode: match[1], number: match[2] };
  }
  return { airlineCode: "", number: flightNumber };
}

// ─── Public API ───

/**
 * Build a Google Flights deep link for a one-way flight.
 *
 * Takes a single leg with its segments and produces a URL that opens
 * the Google Flights booking page showing that exact flight.
 */
export function buildOneWayDeepLink(leg: DeepLinkLeg): string {
  const tfs = encodeTfs([leg], 2);
  const b64 = toUrlSafeBase64(tfs);
  return `https://www.google.com/travel/flights/booking?tfs=${b64}&hl=en-US&gl=US`;
}

/**
 * Build a Google Flights deep link for a round-trip flight.
 *
 * Takes outbound and return legs with their segments and produces a URL
 * that opens the Google Flights booking page showing both flights.
 */
export function buildRoundTripDeepLink(
  outbound: DeepLinkLeg,
  returnLeg: DeepLinkLeg
): string {
  const tfs = encodeTfs([outbound, returnLeg], 1);
  const b64 = toUrlSafeBase64(tfs);
  return `https://www.google.com/travel/flights/booking?tfs=${b64}&hl=en-US&gl=US`;
}

/**
 * Build a deep link from raw SerpAPI flight data.
 *
 * This is the main entry point used by components. It accepts the flight
 * leg data exactly as stored from SerpAPI responses and builds the URL.
 */
export function buildDeepLinkFromFlights(opts: {
  outbound: {
    date: string;
    flights: Array<{
      flight_number?: string;
      departure_airport: { id: string };
      arrival_airport: { id: string };
    }>;
  };
  returnLeg?: {
    date: string;
    flights: Array<{
      flight_number?: string;
      departure_airport: { id: string };
      arrival_airport: { id: string };
    }>;
  };
  origin: string;
  destination: string;
}): string {
  const outboundLeg: DeepLinkLeg = {
    date: opts.outbound.date,
    origin: opts.origin,
    destination: opts.destination,
    segments: opts.outbound.flights
      .filter((f) => f.flight_number)
      .map((f) => {
        const parsed = parseFlightNumber(f.flight_number!);
        return {
          departureAirport: f.departure_airport.id,
          arrivalAirport: f.arrival_airport.id,
          date: opts.outbound.date,
          airlineCode: parsed.airlineCode,
          flightNumber: parsed.number,
        };
      }),
  };

  if (!opts.returnLeg) {
    return buildOneWayDeepLink(outboundLeg);
  }

  const returnLegData: DeepLinkLeg = {
    date: opts.returnLeg.date,
    origin: opts.destination,
    destination: opts.origin,
    segments: opts.returnLeg.flights
      .filter((f) => f.flight_number)
      .map((f) => {
        const parsed = parseFlightNumber(f.flight_number!);
        return {
          departureAirport: f.departure_airport.id,
          arrivalAirport: f.arrival_airport.id,
          date: opts.returnLeg!.date,
          airlineCode: parsed.airlineCode,
          flightNumber: parsed.number,
        };
      }),
  };

  return buildRoundTripDeepLink(outboundLeg, returnLegData);
}

/**
 * Fallback: generic Google Flights search URL (no specific flight).
 * Used when flight segment data is unavailable.
 */
export function buildGoogleFlightsSearchUrl(
  origin: string,
  destination: string,
  date: string,
  returnDate?: string
): string {
  const parts = [`flights from ${origin} to ${destination} on ${date}`];
  if (returnDate) {
    parts.push(`returning ${returnDate}`);
  }
  return `https://www.google.com/travel/flights?q=${encodeURIComponent(
    parts.join(" ")
  )}`;
}
