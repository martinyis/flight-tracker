import { Router } from "express";
import * as authController from "../controllers/authController";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { authLimiter } from "../middleware/rateLimiter";
import { googleLoginSchema, appleLoginSchema, refreshTokenSchema, logoutSchema, updateProfileSchema, pushTokenSchema } from "../schemas/authSchemas";

const router = Router();

router.post("/google", authLimiter, validate(googleLoginSchema), authController.googleLogin);
router.post("/apple", authLimiter, validate(appleLoginSchema), authController.appleLogin);
router.post("/refresh", authLimiter, validate(refreshTokenSchema), authController.refreshToken);
router.post("/logout", authenticate, validate(logoutSchema), authController.logout);
router.get("/me", authenticate, authController.getProfile);
router.put("/me", authenticate, validate(updateProfileSchema), authController.updateProfile);
router.post("/push-token", authenticate, validate(pushTokenSchema), authController.savePushToken);
router.delete("/me", authenticate, authController.deleteAccount);

export default router;
