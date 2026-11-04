import { pool, query } from "../config/database.js";
import { randomUUID } from "node:crypto";

function calculateDiscountedTotal(roomPrice, nights, discountType, discountValue) {
  const subtotal = Number(roomPrice) * nights;
  const discount = discountType === "fixed"
    ? Math.min(Number(discountValue || 0), subtotal)
    : subtotal * Number(discountValue || 0) / 100;
  return Math.max(0, subtotal - discount).toFixed(2);
}

export const bookingRepo = {
  list: async ({ customerId, status, from, to }) => (await query("SELECT b.bookingid, b.customerid, COALESCE(b.guestname, c.fullname) AS fullname, c.email, b.contactphone, b.roomid, r.roomnumber, r.status AS roomstatus, rt.name AS roomtype, b.codeid, b.checkindate, b.checkoutdate, b.guestcount, b.status, b.totalamount, b.createdat, (SELECT p.status FROM payment p WHERE p.bookingid = b.bookingid ORDER BY p.transactiondate DESC, p.paymentid DESC LIMIT 1) AS paymentstatus, (SELECT COALESCE(SUM(p.amount), 0) FROM payment p WHERE p.bookingid = b.bookingid AND p.status = 'completed') AS paidamount, (SELECT COALESCE(SUM(sb.totalprice), 0) FROM servicebooking sb WHERE sb.bookingid = b.bookingid AND sb.status IN ('confirmed', 'completed')) AS serviceamount, (SELECT rr.status FROM refundrequest rr WHERE rr.bookingid = b.bookingid) AS refundstatus, (SELECT rr.amount FROM refundrequest rr WHERE rr.bookingid = b.bookingid) AS refundamount FROM booking b JOIN customer c ON c.customerid = b.customerid JOIN room r ON r.roomid = b.roomid JOIN roomtype rt ON rt.roomtypeid = r.roomtypeid WHERE ($1::int IS NULL OR b.customerid = $1) AND ($2::text IS NULL OR b.status = $2) AND ($3::date IS NULL OR b.checkindate >= $3) AND ($4::date IS NULL OR b.checkoutdate <= $4) ORDER BY b.createdat DESC", [customerId || null, status || null, from || null, to || null])).rows,
  findById: async (id) => (await query("SELECT b.*, COALESCE(b.guestname, c.fullname) AS fullname, c.email, c.phone, r.roomnumber, r.status AS roomstatus, rt.name AS roomtype, (SELECT rr.status FROM refundrequest rr WHERE rr.bookingid = b.bookingid) AS refundstatus, (SELECT rr.amount FROM refundrequest rr WHERE rr.bookingid = b.bookingid) AS refundamount FROM booking b JOIN customer c ON c.customerid = b.customerid JOIN room r ON r.roomid = b.roomid JOIN roomtype rt ON rt.roomtypeid = r.roomtypeid WHERE b.bookingid = $1", [id])).rows[0],
  create: async ({ customerId, roomId, checkIn, checkOut, codeString, guestName, contactPhone, specialRequests, guests }) => {
    await bookingRepo.expirePendingBookings();
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const room = (await client.query("SELECT r.roomid, r.status, r.isdeleted, rt.roomtypeid, rt.price, rt.capacity FROM room r JOIN roomtype rt ON rt.roomtypeid = r.roomtypeid WHERE r.roomid = $1 AND rt.isdeleted = false FOR UPDATE OF r", [roomId])).rows[0];
      if (!room || room.isdeleted) throw Object.assign(new Error("Room not found."), { status: 404 });
      if (room.status !== "available") throw Object.assign(new Error("Selected room is no longer available. Please choose another room."), { status: 409 });
      if (Number(guests) > room.capacity) throw Object.assign(new Error(`This room supports up to ${room.capacity} guests.`), { status: 400 });
      const overlap = await client.query("SELECT 1 FROM booking WHERE roomid = $1 AND (status IN ('confirmed','checked_in') OR (status = 'pending' AND createdat > NOW() - INTERVAL '15 minutes')) AND checkindate < $3 AND checkoutdate > $2 LIMIT 1", [roomId, checkIn, checkOut]);
      if (overlap.rowCount) throw Object.assign(new Error("Room is not available for the selected dates."), { status: 409 });
      const nights = Math.ceil((new Date(`${checkOut}T00:00:00Z`) - new Date(`${checkIn}T00:00:00Z`)) / 86400000);
      let codeId = null;
      let discount = 0;
      if (codeString) {
        const code = (await client.query("SELECT * FROM discountcode WHERE codestring = upper($1) AND (roomtypeid IS NULL OR roomtypeid = $2) AND isactive = true AND validfrom <= CURRENT_DATE AND validto >= CURRENT_DATE AND (usagelimit IS NULL OR usedcount < usagelimit) FOR UPDATE", [String(codeString).trim(), room.roomtypeid])).rows[0];
        if (!code) throw Object.assign(new Error("Discount code is invalid, expired, or fully used."), { status: 400 });
        codeId = code.codeid;
        discount = code.discounttype === "fixed"
          ? Math.min(Number(code.discountvalue), Number(room.price) * nights)
          : Number(room.price) * nights * Number(code.discountvalue) / 100;
        const reserved = await client.query("UPDATE discountcode SET usedcount = usedcount + 1 WHERE codeid = $1 AND (usagelimit IS NULL OR usedcount < usagelimit)", [codeId]);
        if (!reserved.rowCount) throw Object.assign(new Error("Discount code is invalid, expired, or fully used."), { status: 400 });
      }
      const total = Math.max(0, Number(room.price) * nights - discount).toFixed(2);
      const booking = (await client.query("INSERT INTO booking (customerid, roomid, codeid, checkindate, checkoutdate, guestcount, status, totalamount, guestname, contactphone, specialrequests) VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, $8, $9, $10) RETURNING *", [customerId, roomId, codeId, checkIn, checkOut, guests, total, guestName, contactPhone, specialRequests])).rows[0];
      await client.query("COMMIT");
      return booking;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },
  expirePendingBookings: async () => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const expired = (await client.query(
        "UPDATE booking SET status = 'cancelled' WHERE status = 'pending' AND createdat <= NOW() - INTERVAL '15 minutes' RETURNING bookingid, codeid"
      )).rows;
      if (expired.length) {
        await client.query(
          "UPDATE payment SET status = 'failed' WHERE bookingid = ANY($1::int[]) AND status = 'pending'",
          [expired.map((booking) => booking.bookingid)]
        );
        const usageByCode = new Map();
        for (const booking of expired) {
          if (booking.codeid) usageByCode.set(booking.codeid, (usageByCode.get(booking.codeid) || 0) + 1);
        }
        for (const [codeId, count] of usageByCode) {
          await client.query("UPDATE discountcode SET usedcount = GREATEST(0, usedcount - $2) WHERE codeid = $1", [codeId, count]);
        }
      }
      await client.query("COMMIT");
      return expired.length;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },
  holdExpired: async (id) => (await query(
    "SELECT createdat <= NOW() - INTERVAL '15 minutes' AS expired FROM booking WHERE bookingid = $1",
    [id]
  )).rows[0]?.expired || false,
  updatePending: async (id, { roomId, checkIn, checkOut, guests }) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const current = (await client.query("SELECT * FROM booking WHERE bookingid = $1 FOR UPDATE", [id])).rows[0];
      if (!current || current.status !== "pending") { await client.query("ROLLBACK"); return null; }
      const room = (await client.query("SELECT r.roomid, r.status, r.isdeleted, rt.roomtypeid, rt.price, rt.capacity FROM room r JOIN roomtype rt ON rt.roomtypeid = r.roomtypeid WHERE r.roomid = $1 AND rt.isdeleted = false FOR UPDATE OF r", [roomId])).rows[0];
      if (!room || room.isdeleted || !["available", "occupied"].includes(room.status)) throw Object.assign(new Error("Room is not available."), { status: 409 });
      if (guests > room.capacity) throw Object.assign(new Error(`This room supports up to ${room.capacity} guests.`), { status: 400 });
      const overlap = await client.query("SELECT 1 FROM booking WHERE roomid = $1 AND bookingid <> $2 AND status IN ('pending','confirmed','checked_in') AND checkindate < $4 AND checkoutdate > $3 LIMIT 1", [roomId, id, checkIn, checkOut]);
      if (overlap.rowCount) throw Object.assign(new Error("Room is not available for the selected dates."), { status: 409 });
      const discountCode = current.codeid
        ? (await client.query("SELECT roomtypeid, discounttype, discountvalue FROM discountcode WHERE codeid = $1", [current.codeid])).rows[0]
        : null;
      if (discountCode?.roomtypeid && Number(discountCode.roomtypeid) !== Number(room.roomtypeid)) {
        throw Object.assign(new Error("The applied discount code is not valid for the selected room type."), { status: 400 });
      }
      const nights = Math.ceil((new Date(`${checkOut}T00:00:00Z`) - new Date(`${checkIn}T00:00:00Z`)) / 86400000);
      const total = calculateDiscountedTotal(room.price, nights, discountCode?.discounttype, discountCode?.discountvalue);
      const updated = (await client.query("UPDATE booking SET roomid = $2, checkindate = $3, checkoutdate = $4, guestcount = $5, totalamount = $6 WHERE bookingid = $1 RETURNING *", [id, roomId, checkIn, checkOut, guests, total])).rows[0];
      await client.query("COMMIT");
      return updated;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },
  confirmPending: async (id) => (await query(
    "UPDATE booking SET status = 'confirmed' WHERE bookingid = $1 AND status = 'pending' RETURNING *",
    [id]
  )).rows[0],
  checkIn: async (id) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const booking = (await client.query(
        "SELECT bookingid, roomid, status, totalamount FROM booking WHERE bookingid = $1 FOR UPDATE",
        [id]
      )).rows[0];
      if (!booking) throw Object.assign(new Error("Booking not found."), { status: 404 });
      if (booking.status !== "confirmed") throw Object.assign(new Error("Only confirmed bookings can be checked in."), { status: 409 });

      const fullyPaid = (await client.query(
        "SELECT COALESCE(SUM(amount), 0) >= $2::numeric AS fully_paid FROM payment WHERE bookingid = $1 AND status = 'completed'",
        [id, booking.totalamount]
      )).rows[0].fully_paid;
      if (!fullyPaid) {
        throw Object.assign(new Error("Payment is required before check-in. Please settle the outstanding booking amount."), { status: 409 });
      }

      const room = (await client.query(
        "SELECT roomid, status, isdeleted FROM room WHERE roomid = $1 FOR UPDATE",
        [booking.roomid]
      )).rows[0];
      if (!room || room.isdeleted) throw Object.assign(new Error("The assigned room is unavailable."), { status: 409 });
      if (room.status === "cleaning" || room.status === "maintenance") {
        throw Object.assign(new Error(`Check-in blocked: the assigned room is currently ${room.status}.`), { status: 409 });
      }
      if (room.status !== "available") throw Object.assign(new Error("The assigned room is not available for check-in."), { status: 409 });

      const updatedBooking = (await client.query(
        "UPDATE booking SET status = 'checked_in' WHERE bookingid = $1 AND status = 'confirmed' RETURNING *",
        [id]
      )).rows[0];
      await client.query("UPDATE room SET status = 'occupied' WHERE roomid = $1", [booking.roomid]);
      await client.query("COMMIT");
      return { ...updatedBooking, roomstatus: "occupied" };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },
  invoiceFor: async (client, id) => {
    const booking = (await client.query(
      "SELECT b.bookingid, b.customerid, COALESCE(b.guestname, c.fullname) AS fullname, b.contactphone, b.roomid, r.roomnumber, r.status AS roomstatus, rt.name AS roomtype, b.checkindate, b.checkoutdate, b.status, b.totalamount, (SELECT rr.status FROM refundrequest rr WHERE rr.bookingid = b.bookingid) AS refundstatus, (SELECT rr.amount FROM refundrequest rr WHERE rr.bookingid = b.bookingid) AS refundamount FROM booking b JOIN customer c ON c.customerid = b.customerid JOIN room r ON r.roomid = b.roomid JOIN roomtype rt ON rt.roomtypeid = r.roomtypeid WHERE b.bookingid = $1",
      [id]
    )).rows[0];
    if (!booking) return null;
    const services = (await client.query(
      "SELECT sb.servicebookingid, hs.name AS servicename, sb.quantity, sb.totalprice, sb.servicedate, sb.timeslot, sb.status FROM servicebooking sb JOIN hotelservice hs ON hs.serviceid = sb.serviceid WHERE sb.bookingid = $1 ORDER BY sb.servicebookingid",
      [id]
    )).rows;
    const paidAmount = Number((await client.query(
      "SELECT COALESCE(SUM(amount), 0) AS paidamount FROM payment WHERE bookingid = $1 AND status = 'completed'",
      [id]
    )).rows[0].paidamount);
    const serviceAmount = services
      .filter((service) => ["confirmed", "completed"].includes(service.status))
      .reduce((sum, service) => sum + Number(service.totalprice), 0);
    const totalAmount = Number(Number(booking.totalamount).toFixed(2));
    const roundedServiceAmount = Number(serviceAmount.toFixed(2));
    const roundedPaidAmount = Number(paidAmount.toFixed(2));
    return {
      ...booking,
      roomcharge: Math.max(0, Number((totalAmount - roundedServiceAmount).toFixed(2))),
      services,
      serviceamount: roundedServiceAmount,
      totalamount: totalAmount,
      paidamount: roundedPaidAmount,
      balance: booking.refundstatus === "refunded"
        ? 0
        : Math.max(0, Number((totalAmount - roundedPaidAmount).toFixed(2)))
    };
  },
  getInvoice: async (id) => {
    const client = await pool.connect();
    try {
      return await bookingRepo.invoiceFor(client, id);
    } finally {
      client.release();
    }
  },
  recordStayPayment: async (id, method) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const booking = (await client.query(
        "SELECT bookingid, status FROM booking WHERE bookingid = $1 FOR UPDATE",
        [id]
      )).rows[0];
      if (!booking) throw Object.assign(new Error("Booking not found."), { status: 404 });
      if (!["checked_in", "checked_out"].includes(booking.status)) {
        throw Object.assign(new Error("Stay payments can only be recorded for checked-in guests or to settle an outstanding checkout invoice."), { status: 409 });
      }
      const invoice = await bookingRepo.invoiceFor(client, id);
      if (invoice.balance <= 0) throw Object.assign(new Error("There is no outstanding balance to collect."), { status: 409 });
      const payment = (await client.query(
        "INSERT INTO payment (bookingid, amount, paymentmethod, status, transactionref) VALUES ($1, $2, $3, 'completed', $4) RETURNING paymentid, amount, paymentmethod, status, transactiondate",
        [id, invoice.balance.toFixed(2), method, `STAY-${id}-${randomUUID()}`]
      )).rows[0];
      await client.query("UPDATE payment SET status = 'failed' WHERE bookingid = $1 AND status = 'pending'", [id]);
      const updatedInvoice = await bookingRepo.invoiceFor(client, id);
      await client.query("COMMIT");
      return { payment, invoice: updatedInvoice };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },
  checkOut: async (id) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const booking = (await client.query(
        "SELECT bookingid, roomid, status, checkoutdate <= CURRENT_DATE AS checkout_allowed FROM booking WHERE bookingid = $1 FOR UPDATE",
        [id]
      )).rows[0];
      if (!booking) throw Object.assign(new Error("Booking not found."), { status: 404 });
      if (booking.status !== "checked_in") throw Object.assign(new Error("Only checked-in bookings can be checked out."), { status: 409 });
      if (!booking.checkout_allowed) throw Object.assign(new Error("Check-out is not available before the scheduled departure date."), { status: 409 });

      const room = (await client.query(
        "SELECT roomid FROM room WHERE roomid = $1 FOR UPDATE",
        [booking.roomid]
      )).rows[0];
      if (!room) throw Object.assign(new Error("The assigned room is unavailable."), { status: 409 });
      const invoice = await bookingRepo.invoiceFor(client, id);
      if (invoice.balance > 0) {
        throw Object.assign(new Error(`Check-out blocked: outstanding balance of ${invoice.balance.toFixed(2)} remains. Complete payment before checking out.`), { status: 409 });
      }

      await client.query("UPDATE booking SET status = 'checked_out' WHERE bookingid = $1", [id]);
      await client.query("UPDATE room SET status = 'cleaning' WHERE roomid = $1", [booking.roomid]);
      const result = await bookingRepo.invoiceFor(client, id);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },
  updateStaffBooking: async (id, { roomId, checkIn, checkOut }) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const current = (await client.query(
        "SELECT * FROM booking WHERE bookingid = $1 FOR UPDATE",
        [id]
      )).rows[0];
      if (!current) {
        await client.query("ROLLBACK");
        return null;
      }
      if (["cancelled", "checked_out"].includes(current.status)) {
        throw Object.assign(new Error("Cancelled or checked-out bookings cannot be modified."), { status: 400 });
      }

      const room = (await client.query(
        "SELECT r.roomid, r.roomtypeid, r.status, r.isdeleted, rt.price, rt.capacity FROM room r JOIN roomtype rt ON rt.roomtypeid = r.roomtypeid WHERE r.roomid = $1 AND rt.isdeleted = false FOR UPDATE OF r",
        [roomId]
      )).rows[0];
      if (!room || room.isdeleted) throw Object.assign(new Error("Selected room is unavailable."), { status: 404 });
      if (!["available", "occupied"].includes(room.status)) {
        throw Object.assign(new Error("Selected room is not operationally available."), { status: 409 });
      }
      if (Number(current.guestcount) > Number(room.capacity)) {
        throw Object.assign(new Error(`Selected room supports up to ${room.capacity} guests.`), { status: 400 });
      }

      const overlap = await client.query(
        "SELECT 1 FROM booking WHERE roomid = $1 AND bookingid <> $2 AND status IN ('pending', 'confirmed', 'checked_in') AND checkindate < $4 AND checkoutdate > $3 LIMIT 1",
        [roomId, id, checkIn, checkOut]
      );
      if (overlap.rowCount) {
        throw Object.assign(new Error("Selected room is already booked for these dates."), { status: 409 });
      }

      const discountCode = current.codeid
        ? (await client.query("SELECT roomtypeid, discounttype, discountvalue FROM discountcode WHERE codeid = $1", [current.codeid])).rows[0]
        : null;
      if (discountCode?.roomtypeid && Number(discountCode.roomtypeid) !== Number(room.roomtypeid)) {
        throw Object.assign(new Error("The applied discount code is not valid for the selected room type."), { status: 400 });
      }
      const nights = Math.ceil((new Date(`${checkOut}T00:00:00Z`) - new Date(`${checkIn}T00:00:00Z`)) / 86400000);
      const total = calculateDiscountedTotal(room.price, nights, discountCode?.discounttype, discountCode?.discountvalue);
      const updated = (await client.query(
        "UPDATE booking SET roomid = $2, checkindate = $3, checkoutdate = $4, totalamount = $5 WHERE bookingid = $1 RETURNING *",
        [id, roomId, checkIn, checkOut, total]
      )).rows[0];
      await client.query("COMMIT");
      return updated;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },
  updateStatus: async (id, status) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const current = (await client.query("SELECT * FROM booking WHERE bookingid = $1 FOR UPDATE", [id])).rows[0];
      if (!current) { await client.query("ROLLBACK"); return null; }
      const updated = (await client.query("UPDATE booking SET status = $2 WHERE bookingid = $1 RETURNING *", [id, status])).rows[0];
      if (status === "cancelled" && current.codeid && current.status === "pending") {
        await client.query("UPDATE discountcode SET usedcount = GREATEST(0, usedcount - 1) WHERE codeid = $1", [current.codeid]);
      }
      await client.query("COMMIT");
      return updated;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },
  cancelBooking: async (id) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const current = (await client.query("SELECT status, codeid, customerid FROM booking WHERE bookingid = $1 FOR UPDATE", [id])).rows[0];
      if (!current || !["pending", "confirmed"].includes(current.status)) { await client.query("ROLLBACK"); return null; }
      const paidAmount = Number((await client.query(
        "SELECT COALESCE(SUM(amount), 0) AS amount FROM payment WHERE bookingid = $1 AND status = 'completed'",
        [id]
      )).rows[0].amount);
      let refundRequest = null;
      if (paidAmount > 0) {
        refundRequest = (await client.query(
          "INSERT INTO refundrequest (bookingid, customerid, amount) VALUES ($1, $2, $3) ON CONFLICT (bookingid) DO UPDATE SET bookingid = EXCLUDED.bookingid RETURNING refundrequestid, amount, status, createdat",
          [id, current.customerid, paidAmount.toFixed(2)]
        )).rows[0];
      }
      const updated = (await client.query("UPDATE booking SET status = 'cancelled' WHERE bookingid = $1 RETURNING *", [id])).rows[0];
      await client.query("UPDATE payment SET status = 'failed' WHERE bookingid = $1 AND status = 'pending'", [id]);
      if (current.codeid && current.status === "pending") {
        await client.query("UPDATE discountcode SET usedcount = GREATEST(0, usedcount - 1) WHERE codeid = $1", [current.codeid]);
      }
      await client.query("COMMIT");
      return { ...updated, refundrequest: refundRequest };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },
  listRefundRequests: async () => (await query(
    "SELECT rr.refundrequestid, rr.bookingid, rr.customerid, rr.amount, rr.status, rr.createdat, rr.processedat, COALESCE(b.guestname, c.fullname) AS customername, r.roomnumber FROM refundrequest rr JOIN booking b ON b.bookingid = rr.bookingid JOIN customer c ON c.customerid = rr.customerid JOIN room r ON r.roomid = b.roomid ORDER BY CASE WHEN rr.status = 'pending' THEN 0 ELSE 1 END, rr.createdat DESC"
  )).rows,
  completeRefund: async (id, processedBy) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const request = (await client.query(
        "SELECT refundrequestid, bookingid, amount, status FROM refundrequest WHERE refundrequestid = $1 FOR UPDATE",
        [id]
      )).rows[0];
      if (!request) throw Object.assign(new Error("Refund request not found."), { status: 404 });
      if (request.status !== "pending") {
        throw Object.assign(new Error("This refund request has already been processed."), { status: 409 });
      }

      const booking = (await client.query(
        "SELECT status FROM booking WHERE bookingid = $1 FOR UPDATE",
        [request.bookingid]
      )).rows[0];
      if (!booking || booking.status !== "cancelled") {
        throw Object.assign(new Error("Refund request is not associated with a cancelled booking."), { status: 409 });
      }
      const totalPaid = Number((await client.query(
        "SELECT COALESCE(SUM(amount), 0) AS amount FROM payment WHERE bookingid = $1 AND status = 'completed'",
        [request.bookingid]
      )).rows[0].amount);
      if (totalPaid < Number(request.amount)) {
        throw Object.assign(new Error("Completed payment records do not cover the requested refund amount."), { status: 409 });
      }

      await client.query(
        "UPDATE payment SET status = 'refunded' WHERE bookingid = $1 AND status = 'completed'",
        [request.bookingid]
      );
      const completed = (await client.query(
        "UPDATE refundrequest SET status = 'refunded', processedat = CURRENT_TIMESTAMP, processedby = $2 WHERE refundrequestid = $1 RETURNING refundrequestid, bookingid, amount, status, createdat, processedat",
        [id, processedBy]
      )).rows[0];
      await client.query("COMMIT");
      return completed;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },
  updateStatusIf: async (id, allowed, status) => (await query("UPDATE booking SET status = $3 WHERE bookingid = $1 AND status = ANY($2::varchar[]) RETURNING *", [id, allowed, status])).rows[0],
  findPayments: async (bookingId) => (await query("SELECT paymentid, bookingid, amount, paymentmethod, status, transactiondate, transactionref FROM payment WHERE bookingid = $1 ORDER BY transactiondate DESC", [bookingId])).rows,
  hasCompletedPayment: async (bookingId) => (await query("SELECT 1 FROM payment WHERE bookingid = $1 AND status = 'completed' LIMIT 1", [bookingId])).rowCount > 0,
  listPayments: async ({ customerId = null, from = null, to = null, method = null, status = null }) => (await query(
    `SELECT p.paymentid, p.bookingid, p.amount, p.paymentmethod, p.status, p.transactiondate, p.transactionref,
            b.customerid, c.fullname, c.email, b.checkindate, b.checkoutdate
     FROM payment p
     JOIN booking b ON b.bookingid = p.bookingid
     JOIN customer c ON c.customerid = b.customerid
     WHERE ($1::int IS NULL OR b.customerid = $1)
       AND ($2::date IS NULL OR p.transactiondate::date >= $2)
       AND ($3::date IS NULL OR p.transactiondate::date <= $3)
       AND ($4::text IS NULL OR p.paymentmethod = $4)
       AND ($5::text IS NULL OR p.status = $5)
     ORDER BY p.transactiondate DESC, p.paymentid DESC`,
    [customerId, from, to, method, status]
  )).rows,
  createPayment: async ({ bookingId, amount, method }) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const booking = (await client.query(
        "SELECT bookingid, status, totalamount FROM booking WHERE bookingid = $1 FOR UPDATE",
        [bookingId]
      )).rows[0];
      if (!booking) throw Object.assign(new Error("Booking not found."), { status: 404 });
      if (booking.status !== "pending") {
        throw Object.assign(new Error("Only pending bookings can have a payment request."), { status: 409 });
      }

      const existing = (await client.query(
        "SELECT * FROM payment WHERE bookingid = $1 AND status = 'pending' ORDER BY paymentid DESC LIMIT 1 FOR UPDATE",
        [bookingId]
      )).rows[0];
      if (existing) {
        if (existing.paymentmethod !== method || Number(existing.amount) !== Number(booking.totalamount)) {
          throw Object.assign(new Error("A payment request is already in progress for this booking."), { status: 409 });
        }
        await client.query("COMMIT");
        return existing;
      }

      const authoritativeAmount = Number(booking.totalamount);
      if (!Number.isFinite(authoritativeAmount) || authoritativeAmount < 0 || Number(amount) !== authoritativeAmount) {
        throw Object.assign(new Error("Payment amount does not match the booking total."), { status: 400 });
      }
      const payment = (await client.query(
        "INSERT INTO payment (bookingid, amount, paymentmethod, status) VALUES ($1, $2, $3, 'pending') RETURNING *",
        [bookingId, authoritativeAmount.toFixed(2), method]
      )).rows[0];
      await client.query("COMMIT");
      return payment;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },
  paymentById: async (id) => (await query("SELECT * FROM payment WHERE paymentid = $1", [id])).rows[0],
  simulatePayment: async ({ bookingId, customerId, outcome = "completed" }) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const booking = (await client.query(
        "SELECT b.bookingid, b.customerid, b.status, b.totalamount, b.codeid, c.email FROM booking b JOIN customer c ON c.customerid = b.customerid WHERE b.bookingid = $1 FOR UPDATE OF b",
        [bookingId]
      )).rows[0];
      if (!booking) throw Object.assign(new Error("Booking not found."), { status: 404 });
      if (booking.customerid !== customerId) throw Object.assign(new Error("You do not have permission to pay for this booking."), { status: 403 });
      const expired = booking.status === "pending" && (await client.query(
        "SELECT createdat <= clock_timestamp() - INTERVAL '15 minutes' AS expired FROM booking WHERE bookingid = $1",
        [bookingId]
      )).rows[0].expired;
      if (expired) {
        await client.query("UPDATE booking SET status = 'cancelled' WHERE bookingid = $1", [bookingId]);
        await client.query("UPDATE payment SET status = 'failed' WHERE bookingid = $1 AND status = 'pending'", [bookingId]);
        if (booking.codeid) await client.query("UPDATE discountcode SET usedcount = GREATEST(0, usedcount - 1) WHERE codeid = $1", [booking.codeid]);
        await client.query("COMMIT");
        return { expired: true };
      }
      if (booking.status !== "pending") {
        throw Object.assign(new Error("Only pending bookings can be paid."), { status: 409 });
      }
      const pendingPayment = (await client.query(
        "SELECT * FROM payment WHERE bookingid = $1 AND status = 'pending' ORDER BY paymentid DESC LIMIT 1 FOR UPDATE",
        [bookingId]
      )).rows[0];
      if (!pendingPayment) throw Object.assign(new Error("Create a payment request before simulating payment."), { status: 409 });
      if (Number(pendingPayment.amount) !== Number(booking.totalamount)) {
        throw Object.assign(new Error("Payment amount does not match the booking total."), { status: 409 });
      }
      if (!["completed", "failed"].includes(outcome)) {
        throw Object.assign(new Error("Invalid mock payment result."), { status: 400 });
      }
      const reference = `MOCK-${bookingId}-${randomUUID()}`;
      const payment = (await client.query(
        "UPDATE payment SET status = $2, transactionref = $3 WHERE paymentid = $1 RETURNING paymentid, bookingid, amount, paymentmethod, status, transactiondate, transactionref",
        [pendingPayment.paymentid, outcome, reference]
      )).rows[0];
      if (outcome === "failed") {
        await client.query("COMMIT");
        return { payment, email: booking.email };
      }
      const confirmed = await client.query(
        "UPDATE booking SET status = 'confirmed' WHERE bookingid = $1 AND status = 'pending'",
        [bookingId]
      );
      if (!confirmed.rowCount) throw Object.assign(new Error("Booking is no longer awaiting payment."), { status: 409 });
      await client.query("COMMIT");
      return { payment, email: booking.email };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },
  settlePayment: async (id, status, reference, amount) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const paymentReference = (await client.query("SELECT bookingid FROM payment WHERE paymentid = $1", [id])).rows[0];
      if (!paymentReference) { await client.query("ROLLBACK"); return null; }
      const current = (await client.query("SELECT * FROM payment WHERE paymentid = $1 FOR UPDATE", [id])).rows[0];
      if (!current) { await client.query("ROLLBACK"); return null; }
      if (!Number.isFinite(Number(amount)) || Number(amount) !== Number(current.amount)) {
        throw Object.assign(new Error("Payment callback amount does not match the payment request."), { status: 400 });
      }
      if (current.status !== "pending") {
        if (current.status === status) {
          await client.query("COMMIT");
          return current;
        }
        throw Object.assign(new Error("Payment callback conflicts with the current payment status."), { status: 409 });
      }
      const booking = (await client.query("SELECT status, createdat <= NOW() - INTERVAL '15 minutes' AS expired, codeid FROM booking WHERE bookingid = $1 FOR UPDATE", [paymentReference.bookingid])).rows[0];
      if (booking?.status === "pending" && booking.expired) {
        await client.query("UPDATE booking SET status = 'cancelled' WHERE bookingid = $1", [paymentReference.bookingid]);
        await client.query("UPDATE payment SET status = 'failed' WHERE bookingid = $1 AND status = 'pending'", [paymentReference.bookingid]);
        if (booking.codeid) await client.query("UPDATE discountcode SET usedcount = GREATEST(0, usedcount - 1) WHERE codeid = $1", [booking.codeid]);
        await client.query("COMMIT");
        return null;
      }
      if (!booking || booking.status !== "pending") { await client.query("ROLLBACK"); return null; }
      const payment = (await client.query("UPDATE payment SET status = $2, transactionref = $3 WHERE paymentid = $1 RETURNING *", [id, status, reference || null])).rows[0];
      if (status === "completed") await client.query("UPDATE booking SET status = 'confirmed' WHERE bookingid = $1 AND status = 'pending'", [payment.bookingid]);
      await client.query("COMMIT");
      return payment;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
};
