import { Router } from "express";
import { bookingController } from "../controller/bookingController.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { authenticate, authorize } from "../middleware/authMiddleware.js";

const router = Router();

router.use(authenticate);
router.get("/", authorize("staff", "admin"), asyncHandler(bookingController.list));
router.get("/:id", authorize("staff", "admin"), asyncHandler(bookingController.get));
router.patch("/:id/confirm", authorize("staff"), asyncHandler(bookingController.confirm));
router.put("/:id", authorize("staff"), asyncHandler(bookingController.update));

export default router;
