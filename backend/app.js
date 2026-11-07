import "dotenv/config";
import express from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes.js";
import roomRoutes from "./routes/roomRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import staffRoutes from "./routes/staffRoutes.js";
import adminBookingRoutes from "./routes/adminBookingRoutes.js";
import catalogRoutes from "./routes/catalogRoutes.js";
import customerRoutes from "./routes/customerRoutes.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";
import { query } from "./config/database.js";

const app = express();

const corsOrigin = process.env.CLIENT_ORIGIN === "*" ? "*" : (process.env.CLIENT_ORIGIN?.split(",") || ["http://localhost:5173", "http://localhost:5174"]);
app.use(cors({ origin: corsOrigin }));
app.use(express.json({ limit: "1mb" }));
app.get("/health", async (req, res, next) => {
  try {
    await query("SELECT 1");
    res.json({ status: "ok", database: "connected" });
  } catch (error) {
    next(error);
  }
});
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/customer", customerRoutes);
app.use("/api/v1/rooms", roomRoutes);
app.use("/api/v1/payments", paymentRoutes);
app.use("/api/v1/staff", staffRoutes);
app.use("/api/v1/admin/bookings", adminBookingRoutes);
app.use("/api/v1/bookings", bookingRoutes);
app.use("/api/v1", catalogRoutes);
app.use(notFound);
app.use(errorHandler);

export default app;
