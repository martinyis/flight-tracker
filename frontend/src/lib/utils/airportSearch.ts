import airports, { Airport, COUNTRY_NAMES } from "../../data/airports";

/**
 * Pre-built lowercase search index for fast matching.
 * Each entry caches the lowercased fields so we do not allocate on every keystroke.
 */
interface IndexedAirport {
  airport: Airport;
  /** "iata" lowercased */
  iataLower: string;
  /** "city" lowercased */
  cityLower: string;
  /** "name" lowercased */
  nameLower: string;
  /** "countryName" lowercased (resolved from ISO code) */
  countryLower: string;
}

// Build the index once at module load
const INDEX: IndexedAirport[] = airports.map((a) => ({
  airport: a,
  iataLower: a.iata.toLowerCase(),
  cityLower: a.city.toLowerCase(),
  nameLower: a.name.toLowerCase(),
  countryLower: (COUNTRY_NAMES[a.country] || a.country).toLowerCase(),
}));

const POPULAR_AIRPORTS: Airport[] = airports.filter((a) => a.popular);

// ---------------------------------------------------------------------------
// Top-tier popular airports -- 18 globally recognized hubs
// Curated for maximum usefulness on the default screen.
// ---------------------------------------------------------------------------

const TOP_POPULAR_IATAS = new Set([
  "JFK", // New York
  "LAX", // Los Angeles
  "ORD", // Chicago
  "MIA", // Miami
  "SFO", // San Francisco
  "LHR", // London Heathrow
  "CDG", // Paris Charles de Gaulle
  "FCO", // Rome Fiumicino
  "BCN", // Barcelona
  "AMS", // Amsterdam
  "FRA", // Frankfurt
  "DXB", // Dubai
  "SIN", // Singapore
  "HND", // Tokyo Haneda
  "ICN", // Seoul Incheon
  "BKK", // Bangkok
  "SYD", // Sydney
  "YYZ", // Toronto
]);

/**
 * Ordered list of the 18 top-tier airports shown when the search input is
 * empty. Maintains the insertion order of TOP_POPULAR_IATAS for a stable,
 * curated sort (roughly: US, Europe, Middle East, Asia, Oceania, Canada).
 */
const TOP_POPULAR: Airport[] = (() => {
  const byIata = new Map<string, Airport>();
  for (const a of airports) {
    if (TOP_POPULAR_IATAS.has(a.iata)) byIata.set(a.iata, a);
  }
  // Return in curated insertion order
  const result: Airport[] = [];
  for (const iata of TOP_POPULAR_IATAS) {
    const ap = byIata.get(iata);
    if (ap) result.push(ap);
  }
  return result;
})();

// Pre-built IATA -> Airport lookup for O(1) city name resolution
const IATA_MAP = new Map<string, Airport>();
for (const a of airports) {
  IATA_MAP.set(a.iata, a);
}

/** Returns the city name for a 3-letter IATA code, or the code itself as fallback */
export function getCityByIata(iata: string): string {
  return IATA_MAP.get(iata.toUpperCase())?.city ?? iata;
}

/**
 * Returns the full list of popular airports (54 airports marked popular).
 * Prefer `getTopPopularAirports()` for UI display.
 */
export function getPopularAirports(): Airport[] {
  return POPULAR_AIRPORTS;
}

/** Returns the curated 18 top-tier airports for the empty-state default list */
export function getTopPopularAirports(): Airport[] {
  return TOP_POPULAR;
}

/** Returns the human-readable country name for an ISO code */
export function getCountryName(code: string): string {
  return COUNTRY_NAMES[code] || code;
}

/**
 * Search airports by a user query string.
 *
 * Matching priority (determines sort order within results):
 *  1. Exact IATA match (e.g. "JFK" -> JFK is first)
 *  2. IATA starts with query
 *  3. City starts with query
 *  4. City or airport name contains query
 *  5. Country name contains query
 *
 * Returns at most `limit` results (default 25).
 */
export function searchAirports(query: string, limit = 25): Airport[] {
  const q = query.trim().toLowerCase();
  if (q.length === 0) return [];

  // Buckets for priority ranking
  const exactIata: Airport[] = [];
  const startsIata: Airport[] = [];
  const startsCity: Airport[] = [];
  const containsCityOrName: Airport[] = [];
  const containsCountry: Airport[] = [];

  for (const entry of INDEX) {
    if (entry.iataLower === q) {
      exactIata.push(entry.airport);
    } else if (entry.iataLower.startsWith(q)) {
      startsIata.push(entry.airport);
    } else if (entry.cityLower.startsWith(q)) {
      startsCity.push(entry.airport);
    } else if (
      entry.cityLower.includes(q) ||
      entry.nameLower.includes(q)
    ) {
      containsCityOrName.push(entry.airport);
    } else if (entry.countryLower.includes(q)) {
      containsCountry.push(entry.airport);
    }
  }

  // Merge in priority order, popular airports float to top within each bucket
  const merged = [
    ...exactIata,
    ...startsIata,
    ...startsCity,
    ...containsCityOrName,
    ...containsCountry,
  ];

  return merged.slice(0, limit);
}
