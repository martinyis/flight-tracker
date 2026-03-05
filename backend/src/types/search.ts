import { FlightCombo, FlightLeg } from "../services/flightService";
import { SavedSearch as PrismaSavedSearch } from "../generated/prisma/client";

export type TripType = "roundtrip" | "oneway";

export interface SearchFilters {
  airlines?: string[];
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
  "latestResults" | "filters" | "availableAirlines" | "airlineLogos" | "rawLegs" | "priceHistory"
> {
  latestResults: FlightCombo[] | FlightLeg[];
  filters: SearchFilters;
  availableAirlines: string[];
  airlineLogos: Record<string, string>;
  rawLegs: RawLegs;
  priceHistory: PriceHistoryEntry[];
}
