import { Router } from "express";
import { catalogController } from "../controller/catalogController.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { authenticate, authorize } from "../middleware/authMiddleware.js";

const router = Router();
const staff = ["admin", "staff"];
const admin = ["admin"];

router.get("/services", asyncHandler(catalogController.listServices));
router.get("/reviews", asyncHandler(catalogController.listReviews));
router.get("/reviews/moderation", authenticate, authorize("staff", "admin"), asyncHandler(catalogController.listReviews));
router.get("/reviews/eligible", authenticate, authorize("customer"), asyncHandler(catalogController.eligibleReviewBookings));
router.get("/discounts/validate", asyncHandler(catalogController.validateDiscount));
router.get("/discounts/available", asyncHandler(catalogController.availableDiscounts));
router.post("/reviews", authenticate, authorize("customer"), asyncHandler(catalogController.submitReview));
router.patch("/reviews/:id/approval", authenticate, authorize(...staff), asyncHandler(catalogController.approveReview));
router.get("/discounts", authenticate, authorize("admin"), asyncHandler(catalogController.listDiscounts));
router.post("/discounts", authenticate, authorize("admin"), asyncHandler(catalogController.createDiscount));
router.patch("/discounts/:id", authenticate, authorize("admin"), asyncHandler(catalogController.updateDiscount));
router.patch("/discounts/:id/status", authenticate, authorize("admin"), asyncHandler(catalogController.setDiscountActive));
router.delete("/discounts/:id", authenticate, authorize("admin"), asyncHandler(catalogController.deleteDiscount));
router.post("/services", authenticate, authorize(...admin), asyncHandler(catalogController.createService));
router.patch("/services/:id", authenticate, authorize(...admin), asyncHandler(catalogController.updateService));
router.delete("/services/:id", authenticate, authorize(...admin), asyncHandler(catalogController.deleteService));
router.get("/service-bookings", authenticate, asyncHandler(catalogController.listServiceBookings));
router.post("/service-bookings", authenticate, authorize("customer", "staff"), asyncHandler(catalogController.bookService));
router.get("/customers", authenticate, authorize(...staff), asyncHandler(catalogController.listCustomers));
router.get("/customers/:id", authenticate, authorize(...staff), asyncHandler(catalogController.getCustomer));
router.patch("/customers/:id", authenticate, authorize(...staff), asyncHandler(catalogController.updateCustomer));
router.patch("/customers/:id/status", authenticate, authorize("admin"), asyncHandler(catalogController.setCustomerActive));

export default router;
