import { ApiFilters, PriceHistoryEntry } from "../../types/search";
import { BadRequestError } from "../../errors/AppError";
import { VALID_ALLIANCES } from "../../config/constants";

// ── ID parsing guard ──

export function parseId(value: string): number {
  const n = parseInt(value, 10);
  if (Number.isNaN(n)) throw new BadRequestError("Invalid ID");
  return n;
}

// ── SerpAPI filter validation ──

export function validateApiFilters(filters?: ApiFilters): void {
  if (!filters) return;
  if (filters.stops != null && ![1, 2, 3].includes(filters.stops)) {
    throw new BadRequestError("stops must be 1, 2, or 3");
  }
  if (filters.includeAirlines?.length && filters.excludeAirlines?.length) {
    throw new BadRequestError("Cannot use both includeAirlines and excludeAirlines");
  }
  const validateCodes = (codes?: string[]) => {
    if (!codes) return;
    for (const code of codes) {
      if ((VALID_ALLIANCES as readonly string[]).includes(code)) continue;
      if (!/^[A-Z0-9]{2}$/.test(code)) {
        throw new BadRequestError(
          `Invalid airline code: ${code}. Must be 2-letter IATA code or alliance name.`
        );
      }
    }
  };
  validateCodes(filters.includeAirlines);
  validateCodes(filters.excludeAirlines);
  if (filters.maxDuration != null && (filters.maxDuration <= 0 || filters.maxDuration > 2880)) {
    throw new BadRequestError("maxDuration must be between 1 and 2880 minutes");
  }
  if (filters.bags != null && ![0, 1].includes(filters.bags)) {
    throw new BadRequestError("bags must be 0 or 1");
  }
}

// ── Price history ──

export function appendPriceHistory(
  existing: PriceHistoryEntry[],
  cheapestPrice: number | null
): PriceHistoryEntry[] {
  if (cheapestPrice == null) return existing;

  const today = new Date().toISOString().slice(0, 10);

  const lastEntry = existing[existing.length - 1];
  if (lastEntry && lastEntry.date === today) {
    if (cheapestPrice < lastEntry.cheapestPrice) {
      return [...existing.slice(0, -1), { date: today, cheapestPrice }];
    }
    return existing;
  }

  return [...existing, { date: today, cheapestPrice }];
}

// ── Logo extraction from stored results ──

export function computeLogosFromResults(
  results: any[],
  tripType: string
): Record<string, string> {
  const map: Record<string, string> = {};
  if (!Array.isArray(results)) return map;

  for (const item of results) {
    const legs: any[] =
      tripType === "oneway"
        ? [item]
        : [item?.outbound, item?.return].filter(Boolean);

    for (const leg of legs) {
      if (!Array.isArray(leg?.flights)) continue;
      for (const f of leg.flights) {
        if (f?.airline_logo && f?.airline && !map[f.airline]) {
          map[f.airline] = f.airline_logo;
        }
      }
    }
  }
  return map;
}
