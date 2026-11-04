import "dotenv/config";
import app from "./app.js";
import { pool } from "./config/database.js";
import { bookingRepo } from "./repo/bookingRepo.js";

const port = Number(process.env.PORT || 3000);

if (!process.env.DATABASE_URL || !process.env.JWT_SECRET) throw new Error("DATABASE_URL and JWT_SECRET must be configured.");

const server = app.listen(port, () => process.stdout.write(`StayEase API listening on port ${port}\n`));
const pendingBookingExpiry = setInterval(() => {
  bookingRepo.expirePendingBookings().catch((error) => {
    process.stderr.write(`Failed to expire pending bookings: ${error.stack || error.message}\n`);
  });
}, 60_000);
pendingBookingExpiry.unref();
bookingRepo.expirePendingBookings().catch((error) => {
  process.stderr.write(`Failed to expire pending bookings: ${error.stack || error.message}\n`);
});

async function shutdown() {
  clearInterval(pendingBookingExpiry);
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
