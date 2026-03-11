import { Router } from "express";
import * as creditsController from "../controllers/creditsController";
import { validate } from "../middleware/validate";
import { purchaseSchema, costQuerySchema } from "../schemas/creditsSchemas";

const router = Router();

router.get("/balance", creditsController.getBalance);
router.get("/cost", validate(costQuerySchema), creditsController.getCost);
router.get("/packs", creditsController.getPacks);
router.post("/purchase", validate(purchaseSchema), creditsController.purchase);

export default router;
