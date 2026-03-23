import { Router } from "express";
import * as ctrl from "../controllers/savedSearchController";
import { validate } from "../middleware/validate";
import {
  createSearchSchema, searchIdParam, bookingUrlSchema,
  updateFiltersSchema, refreshSearchSchema, activateTrackingSchema,
  extendTrackingSchema, hydrateOneSchema, reSearchSchema, paidRefreshSchema,
} from "../schemas/searchSchemas";
import { serpApiLimiter } from "../middleware/rateLimiter";

const router = Router();

router.post("/", serpApiLimiter, validate(createSearchSchema), ctrl.createSearch);
router.post("/booking", validate(bookingUrlSchema), ctrl.getBookingUrl);
router.get("/", ctrl.getSearches);
router.get("/:id", validate(searchIdParam), ctrl.getSearch);
router.delete("/:id", validate(searchIdParam), ctrl.deleteSearch);
router.patch("/:id/toggle", validate(searchIdParam), ctrl.toggleSearch);
router.patch("/:id/filters", validate({ ...searchIdParam, ...updateFiltersSchema }), ctrl.updateFilters);
router.post("/:id/refresh", serpApiLimiter, validate({ ...searchIdParam, ...refreshSearchSchema }), ctrl.refreshSearch);
router.post("/:id/paid-refresh", serpApiLimiter, validate({ ...searchIdParam, ...paidRefreshSchema }), ctrl.paidRefresh);
router.post("/:id/hydrate", serpApiLimiter, validate(searchIdParam), ctrl.hydrateSearch);
router.post("/:id/activate-tracking", validate({ ...searchIdParam, ...activateTrackingSchema }), ctrl.activateTracking);
router.post("/:id/extend-tracking", validate({ ...searchIdParam, ...extendTrackingSchema }), ctrl.extendTracking);
router.post("/:id/hydrate-one", serpApiLimiter, validate({ ...searchIdParam, ...hydrateOneSchema }), ctrl.hydrateOne);
router.post("/:id/re-search", serpApiLimiter, validate({ ...searchIdParam, ...reSearchSchema }), ctrl.reSearch);

export default router;
