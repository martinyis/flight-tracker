import { FlightCombo, FlightLeg } from "../services/flight/types";
import { SavedSearch as PrismaSavedSearch } from "../generated/prisma/client";

export type TripType = "roundtrip" | "oneway";

export interface SearchFilters {
  airlines?: string[];
}

/** Filters passed to SerpAPI at query time. Stored on SavedSearch.apiFilters. */
export interface ApiFilters {
  /** 1=Nonstop, 2=1 stop or fewer, 3=2 stops or fewer */
  stops?: 1 | 2 | 3;
  /** IATA codes or alliance names to include. Mutually exclusive with excludeAirlines. */
  includeAirlines?: string[];
  /** IATA codes or alliance names to exclude. Mutually exclusive with includeAirlines. */
  excludeAirlines?: string[];
  /** Maximum flight duration in minutes */
  maxDuration?: number;
  /** Number of bags (1 = include carry-on pricing) */
  bags?: number;
}

/** Entry in the priceHistory JSON array */
export interface PriceHistoryEntry {
  date: string;           // ISO date string YYYY-MM-DD
  cheapestPrice: number;
}

/** Raw option from a SerpAPI round-trip search (outbound details + total price, NO return details) */
export interface RoundTripRawOption {
  outbound: FlightLeg;
  price: number;          // total round-trip price from SerpAPI
  outboundDate: string;
  returnDate: string;
  nights: number;
  departure_token?: string;
}

/** One-way raw legs (unchanged) */
export interface OneWayRawLegs {
  outbound: FlightLeg[];
  return: FlightLeg[];
}

/**
 * Raw legs stored in DB — format depends on tripType.
 * Round-trip NEW format: FlightCombo[] (complete combos with both legs).
 * Round-trip LEGACY format: RoundTripRawOption[] (outbound only + departure_token).
 * One-way: OneWayRawLegs.
 */
export type RawLegs = OneWayRawLegs | FlightCombo[] | RoundTripRawOption[];

/** Type guard: is this rawLegs a legacy RoundTripRawOption[] (has departure_token, no .return)? */
export function isLegacyRoundTripRawLegs(raw: unknown): raw is RoundTripRawOption[] {
  if (!Array.isArray(raw) || raw.length === 0) return false;
  const first = raw[0];
  return 'departure_token' in first || ('outbound' in first && !('return' in first));
}

/** Type guard: is this rawLegs the new FlightCombo[] format? */
export function isComboRawLegs(raw: unknown): raw is FlightCombo[] {
  if (!Array.isArray(raw) || raw.length === 0) return false;
  const first = raw[0];
  return 'outbound' in first && 'return' in first && 'totalPrice' in first;
}

export interface TypedSavedSearch extends Omit<PrismaSavedSearch,
  "latestResults" | "filters" | "apiFilters" | "availableAirlines" | "airlineLogos" | "rawLegs" | "priceHistory" | "sentinelPairs"
> {
  latestResults: FlightCombo[] | FlightLeg[];
  filters: SearchFilters;
  apiFilters: ApiFilters;
  availableAirlines: string[];
  airlineLogos: Record<string, string>;
  rawLegs: RawLegs;
  priceHistory: PriceHistoryEntry[];
  sentinelPairs: { out: string; ret: string }[];
}

// ---------------------------------------------------------------------------
// Typed read helpers for Prisma JSON columns
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JsonColumn = any;

export function readLatestResults(json: JsonColumn): FlightCombo[] | FlightLeg[] {
  if (!Array.isArray(json)) return [];
  return json as FlightCombo[] | FlightLeg[];
}

export function readRawLegs(json: JsonColumn): RawLegs {
  return json as RawLegs;
}

export function readSearchFilters(json: JsonColumn): SearchFilters {
  if (!json || typeof json !== "object") return {};
  return json as SearchFilters;
}

export function readApiFilters(json: JsonColumn): ApiFilters {
  if (!json || typeof json !== "object") return {};
  return json as ApiFilters;
}

export function readAvailableAirlines(json: JsonColumn): string[] {
  if (!Array.isArray(json)) return [];
  return json as string[];
}

export function readAirlineLogos(json: JsonColumn): Record<string, string> {
  if (!json || typeof json !== "object" || Array.isArray(json)) return {};
  return json as Record<string, string>;
}

export function readPriceHistory(json: JsonColumn): PriceHistoryEntry[] {
  if (!Array.isArray(json)) return [];
  return json as PriceHistoryEntry[];
}

export function readSentinelPairs(json: JsonColumn): { out: string; ret: string }[] {
  if (!Array.isArray(json)) return [];
  return json as { out: string; ret: string }[];
}
