import { Router } from "express";
import { authController } from "../controller/authController.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = Router();

router.post("/register", asyncHandler(authController.register));
router.post("/register/resend-otp", asyncHandler(authController.resendRegistrationOtp));
router.post("/register/verify-otp", asyncHandler(authController.verifyRegistrationOtp));
router.post("/password-reset/request-otp", asyncHandler(authController.requestPasswordResetOtp));
router.post("/password-reset/verify-otp", asyncHandler(authController.verifyPasswordResetOtp));
router.post("/password-reset/reset", asyncHandler(authController.resetPasswordWithOtp));
router.post("/login", asyncHandler(authController.login));
router.post("/logout", authenticate, asyncHandler(authController.logout));
router.get("/profile", authenticate, asyncHandler(authController.profile));
router.patch("/profile", authenticate, asyncHandler(authController.updateProfile));
router.patch("/password", authenticate, asyncHandler(authController.changePassword));

export default router;
