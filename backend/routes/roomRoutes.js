import { Router } from "express";
import { roomController } from "../controller/roomController.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { authenticate, authorize } from "../middleware/authMiddleware.js";

const router = Router();
const staff = ["admin", "staff"];
const admin = ["admin"];

router.get("/", asyncHandler(roomController.list));
router.get("/management", authenticate, authorize(...staff), asyncHandler(roomController.listManagement));
router.get("/search", asyncHandler(roomController.search));
router.get("/types", asyncHandler(roomController.listTypes));
router.get("/room-types", asyncHandler(roomController.listTypes));
router.get("/:id", asyncHandler(roomController.get));
router.patch("/:id/status", authenticate, authorize(...staff), asyncHandler(roomController.updateStatus));
router.post("/", authenticate, authorize(...admin), asyncHandler(roomController.create));
router.put("/:id", authenticate, authorize(...admin), asyncHandler(roomController.update));
router.patch("/:id", authenticate, authorize(...admin), asyncHandler(roomController.update));
router.delete("/:id", authenticate, authorize(...admin), asyncHandler(roomController.delete));
router.post("/types", authenticate, authorize(...admin), asyncHandler(roomController.createType));
router.patch("/types/:id", authenticate, authorize(...admin), asyncHandler(roomController.updateType));
router.delete("/types/:id", authenticate, authorize(...admin), asyncHandler(roomController.deleteType));

export default router;
