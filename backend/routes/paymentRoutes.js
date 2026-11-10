import { Router } from "express";
import { bookingController } from "../controller/bookingController.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { authenticate, authorize } from "../middleware/authMiddleware.js";

const router = Router();

router.use(authenticate);
router.post(
  "/",
  authorize("customer"),
  asyncHandler(bookingController.simulatePayment),
);

export default router;
