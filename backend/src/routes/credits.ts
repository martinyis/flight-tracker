import { Router } from "express";
import * as creditsController from "../controllers/creditsController";
import { validate } from "../middleware/validate";
import { purchaseSchema, costQuerySchema, verifyPurchaseSchema } from "../schemas/creditsSchemas";

const router = Router();

router.get("/balance", creditsController.getBalance);
router.get("/cost", validate(costQuerySchema), creditsController.getCost);
router.get("/packs", creditsController.getPacks);
if (process.env.NODE_ENV !== "production") {
  router.post("/purchase", validate(purchaseSchema), creditsController.purchase);
}
router.post("/verify-purchase", validate(verifyPurchaseSchema), creditsController.verifyPurchase);

export default router;
