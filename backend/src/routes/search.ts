import { Router } from "express";
import * as ctrl from "../controllers/savedSearchController";
import { validate } from "../middleware/validate";
import {
  createSearchSchema, searchIdParam, bookingUrlSchema,
  updateFiltersSchema, refreshSearchSchema, activateTrackingSchema,
  hydrateOneSchema, reSearchSchema,
} from "../schemas/searchSchemas";

const router = Router();

router.post("/", validate(createSearchSchema), ctrl.createSearch);
router.post("/booking", validate(bookingUrlSchema), ctrl.getBookingUrl);
router.get("/", ctrl.getSearches);
router.get("/:id", validate(searchIdParam), ctrl.getSearch);
router.delete("/:id", validate(searchIdParam), ctrl.deleteSearch);
router.patch("/:id/toggle", validate(searchIdParam), ctrl.toggleSearch);
router.patch("/:id/filters", validate({ ...searchIdParam, ...updateFiltersSchema }), ctrl.updateFilters);
router.post("/:id/refresh", validate({ ...searchIdParam, ...refreshSearchSchema }), ctrl.refreshSearch);
router.post("/:id/hydrate", validate(searchIdParam), ctrl.hydrateSearch);
router.post("/:id/activate-tracking", validate({ ...searchIdParam, ...activateTrackingSchema }), ctrl.activateTracking);
router.post("/:id/hydrate-one", validate({ ...searchIdParam, ...hydrateOneSchema }), ctrl.hydrateOne);
router.post("/:id/re-search", validate({ ...searchIdParam, ...reSearchSchema }), ctrl.reSearch);

export default router;
