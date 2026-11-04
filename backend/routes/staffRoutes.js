import { Router } from "express";
import { bookingController } from "../controller/bookingController.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { authenticate, authorize } from "../middleware/authMiddleware.js";

const router = Router();

router.use(authenticate);
router.get("/stays/:id/invoice", authorize("staff", "admin"), asyncHandler(bookingController.stayInvoice));
router.post("/stays/:id/payments", authorize("staff"), asyncHandler(bookingController.collectStayPayment));
router.get("/refunds", authorize("staff", "admin"), asyncHandler(bookingController.listRefundRequests));
router.post("/refunds/:id/complete", authorize("admin"), asyncHandler(bookingController.completeRefund));
router.post("/check-in", authorize("staff"), asyncHandler(bookingController.staffCheckIn));
router.post("/check-out", authorize("staff"), asyncHandler(bookingController.staffCheckOut));

export default router;
