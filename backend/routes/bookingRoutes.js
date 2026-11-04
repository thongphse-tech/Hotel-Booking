import { Router } from "express";
import { bookingController } from "../controller/bookingController.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { authenticate, authorize } from "../middleware/authMiddleware.js";

const router = Router();
const staff = ["admin", "staff"];

router.post("/payments/webhook", (req, res, next) => {
  if (!process.env.PAYMENT_WEBHOOK_SECRET || req.headers["x-payment-secret"] !== process.env.PAYMENT_WEBHOOK_SECRET) return res.status(401).json({ message: "Invalid payment gateway signature." });
  next();
}, asyncHandler(bookingController.confirmPayment));
router.use(authenticate);
router.get("/payments/history", asyncHandler(bookingController.paymentHistory));
router.get("/", asyncHandler(bookingController.list));
router.post("/", authorize("customer"), asyncHandler(bookingController.create));
router.patch("/:id/confirm", authorize("staff"), asyncHandler(bookingController.confirm));
router.put("/:id", authorize("staff"), asyncHandler(bookingController.update));
router.patch("/:id", authorize("staff"), asyncHandler(bookingController.update));
router.get("/:id", asyncHandler(bookingController.get));
router.post("/:id/cancel", asyncHandler(bookingController.cancel));
router.post("/:id/payments", authorize("customer"), asyncHandler(bookingController.createPayment));
router.post("/:id/check-in", authorize("staff"), asyncHandler(bookingController.checkIn));
router.post("/:id/check-out", authorize("staff"), asyncHandler(bookingController.checkOut));

export default router;
