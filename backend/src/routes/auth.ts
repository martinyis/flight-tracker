import { Router } from "express";
import * as authController from "../controllers/authController";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { googleLoginSchema, appleLoginSchema, updateProfileSchema } from "../schemas/authSchemas";

const router = Router();

router.post("/google", validate(googleLoginSchema), authController.googleLogin);
router.post("/apple", validate(appleLoginSchema), authController.appleLogin);
router.get("/me", authenticate, authController.getProfile);
router.put("/me", authenticate, validate(updateProfileSchema), authController.updateProfile);
router.delete("/me", authenticate, authController.deleteAccount);

export default router;
