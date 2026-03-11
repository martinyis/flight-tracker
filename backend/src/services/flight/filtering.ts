import { SearchFilters, RoundTripRawOption } from "../../types/search";
import { TOP_RESULTS_LIMIT } from "../../config/constants";
import { FlightLeg, FlightCombo } from "./types";

// ── Internal helper ──

function legMatchesAirlineFilter(leg: FlightLeg, airlines: string[]): boolean {
  if (airlines.length === 0) return true;
  return airlines.includes(leg.airline);
}

// ── Airline extraction ──

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

// ── Round-trip raw option filtering ──

export function filterAndSortRawOptions(
  options: RoundTripRawOption[],
  filters?: SearchFilters,
  limit = TOP_RESULTS_LIMIT
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

/** Post-filter combos so both outbound AND return legs match the airline filter. */
export function filterCombosByAirline(
  combos: FlightCombo[],
  filters?: SearchFilters,
  limit = TOP_RESULTS_LIMIT
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
 */
export function filterCombosLocally(
  allCombos: FlightCombo[],
  filters?: SearchFilters,
  limit = TOP_RESULTS_LIMIT
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

// ── One-way filtering ──

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
  return results.slice(0, TOP_RESULTS_LIMIT);
}
