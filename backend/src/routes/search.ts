import { Router } from "express";
import * as savedSearchController from "../controllers/savedSearchController";

const router = Router();

router.post("/", savedSearchController.createSearch);
router.post("/booking", savedSearchController.getBookingUrl);
router.get("/", savedSearchController.getSearches);
router.get("/:id", savedSearchController.getSearch);
router.delete("/:id", savedSearchController.deleteSearch);
router.patch("/:id/toggle", savedSearchController.toggleSearch);
router.patch("/:id/filters", savedSearchController.updateFilters);
router.post("/:id/refresh", savedSearchController.refreshSearch);
router.post("/:id/hydrate", savedSearchController.hydrateSearch);
router.post("/:id/activate-tracking", savedSearchController.activateTracking);
router.post("/:id/hydrate-one", savedSearchController.hydrateOne);

export default router;
