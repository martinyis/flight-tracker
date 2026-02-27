import { Router } from "express";
import * as alertController from "../controllers/alertController";

const router = Router();

router.get("/", alertController.getAlerts);
router.post("/", alertController.createAlert);
router.delete("/:id", alertController.deleteAlert);

export default router;
