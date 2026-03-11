// Barrel file — re-exports all public symbols from search/ submodules.
// Existing imports from "../services/savedSearchService" continue to work unchanged.

export { appendPriceHistory } from "./search/helpers";

export {
  createSavedSearch, getUserSearches,
  getSearchById, deleteSearch, toggleSearchActive,
} from "./search/crud";

export {
  refreshSearch, updateFilters,
  hydrateSearch, hydrateOneOption,
} from "./search/operations";

export {
  activateTracking, reSearchExcludingAirlines,
} from "./search/tracking";
