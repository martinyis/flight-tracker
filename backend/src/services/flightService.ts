// Barrel file — re-exports all public symbols from flight/ submodules.
// Existing imports from "../services/flightService" continue to work unchanged.

// Types
export type { FlightLeg, FlightCombo, SearchParams, OneWaySearchParams, OneWayResult, SerpFlight } from "./flight/types";

// Date utilities
export { countCombos, selectSentinels } from "./flight/dateUtils";

// SerpAPI client
export { fetchReturnLeg } from "./flight/serpClient";

// Filtering
export {
  extractAirlines, extractAirlineLogos,
  filterAndSortRawOptions, filterCombosByAirline,
  filterCombosLocally, reduceOneWayFromLegs,
} from "./flight/filtering";

// Booking
export { fetchBookingUrl } from "./flight/booking";

// Orchestration
export {
  fetchSentinelPrices,
  fetchAndReduceCombos, buildCombosFromRawOptions,
  searchByParams, fetchPriceOnly,
  hydrateReturnLegs, fetchOneWayPriceOnly,
  searchOneWayByParams, fetchAndReduceOneWay,
} from "./flight/orchestration";
