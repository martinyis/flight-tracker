import type { FlightCombo, FlightLeg } from "../services/flight/types";
import type {
  SearchFilters,
  ApiFilters,
  PriceHistoryEntry,
  OneWayRawLegs,
  RoundTripRawOption,
} from "./search";

/**
 * Prisma 7 JSON columns accept plain objects/arrays at runtime.
 * Our domain types are structurally compatible but TypeScript can't prove it.
 * This module centralizes the one unavoidable cast so no other file needs `as any`.
 */
function toJson<T>(value: T): any {
  return value;
}

export function jsonLatestResults(results: FlightCombo[] | FlightLeg[] | RoundTripRawOption[] | (FlightCombo | RoundTripRawOption)[]): any {
  return toJson(results);
}

export function jsonRawLegs(legs: OneWayRawLegs | FlightCombo[] | RoundTripRawOption[]): any {
  return toJson(legs);
}

export function jsonFilters(filters: SearchFilters): any {
  return toJson(filters);
}

export function jsonApiFilters(filters: ApiFilters): any {
  return toJson(filters);
}

export function jsonAvailableAirlines(airlines: string[]): any {
  return toJson(airlines);
}

export function jsonAirlineLogos(logos: Record<string, string>): any {
  return toJson(logos);
}

export function jsonPriceHistory(history: PriceHistoryEntry[]): any {
  return toJson(history);
}

export function jsonSentinelPairs(pairs: { out: string; ret: string }[]): any {
  return toJson(pairs);
}
