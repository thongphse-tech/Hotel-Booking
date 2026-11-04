import { Router } from "express";
import { customerController } from "../controller/customerController.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { authenticate, authorize } from "../middleware/authMiddleware.js";

const router = Router();

router.use(authenticate, authorize("customer"));
router.get("/profile/:customerId", asyncHandler(customerController.getProfile));
router.put("/profile/:customerId", asyncHandler(customerController.updateProfile));

export default router;
