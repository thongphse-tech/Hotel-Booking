import { bookingRepo } from "../repo/bookingRepo.js";
import { query } from "../config/database.js";
import { validateStayDates } from "../model/bookingModel.js";
import { HttpError } from "./httpError.js";
import { sendNotification } from "./notificationService.js";
import { validatePhone } from "../model/userModel.js";

const paymentMethods = ["credit_card", "debit_card", "cash", "bank_transfer", "paypal"];

export const bookingService = {
  list: async (user, filters = {}) => {
    await bookingRepo.expirePendingBookings();
    const status = filters.status ? String(filters.status).toLowerCase() : null;
    if (status && !["pending", "confirmed", "checked_in", "checked_out", "cancelled"].includes(status)) {
      throw new HttpError(400, "Invalid booking status filter.");
    }
    for (const date of [filters.from, filters.to]) {
      const parsed = date ? new Date(`${date}T00:00:00Z`) : null;
      if (date && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date)) {
        throw new HttpError(400, "Invalid booking date filter.");
      }
    }
    if (filters.from && filters.to && filters.to < filters.from) throw new HttpError(400, "End date must be on or after start date.");
    return bookingRepo.list({
      ...filters,
      status,
      customerId: user.role === "customer" ? user.customerId : null
    });
  },
  get: async (id, user) => {
    await bookingRepo.expirePendingBookings();
    const booking = await bookingRepo.findById(id);
    if (!booking) throw new HttpError(404, "Booking not found.");
    if (user.role === "customer" && booking.customerid !== user.customerId) throw new HttpError(403, "You do not have permission to view this booking.");
    return { ...booking, payments: await bookingRepo.findPayments(id) };
  },
  create: async (user, data) => {
    if (user.role !== "customer" || !user.customerId) throw new HttpError(403, "A customer account is required to create a booking.");
    if (!data || typeof data !== "object" || Array.isArray(data)) throw new HttpError(400, "Invalid booking data.");
    validateStayDates(data.checkIn, data.checkOut);
    if (!Number.isInteger(Number(data.roomId)) || Number(data.roomId) <= 0) throw new HttpError(400, "Select a valid room.");
    const guestName = String(data.guestName || "").trim();
    const contactPhone = String(data.contactPhone || "").trim();
    if (!guestName) throw new HttpError(400, "Guest name is required.");
    if (guestName.length > 100) throw new HttpError(400, "Guest name must be 100 characters or fewer.");
    if (!validatePhone(contactPhone)) throw new HttpError(400, "Enter a valid contact phone number.");
    if (String(data.specialRequests || "").length > 2000) throw new HttpError(400, "Special requests must be 2000 characters or fewer.");
    const guests = Number(data.guests || 1);
    if (!Number.isInteger(guests) || guests < 1) throw new HttpError(400, "Guest count must be a positive number.");
    return bookingRepo.create({
      customerId: user.customerId,
      roomId: Number(data.roomId),
      checkIn: data.checkIn,
      checkOut: data.checkOut,
      codeString: data.codeString,
      guestName,
      contactPhone,
      specialRequests: String(data.specialRequests || "").trim() || null,
      guests
    });
  },
  update: async (id, data) => {
    if (!/^[1-9]\d*$/.test(String(id))) throw new HttpError(404, "Booking not found.");
    if (!data || typeof data !== "object" || Array.isArray(data) || "status" in data) {
      throw new HttpError(400, "Only room and stay dates can be updated.");
    }
    const { roomId, checkIn, checkOut } = data;
    const targetRoomId = Number(roomId);
    validateStayDates(checkIn, checkOut);
    if (!Number.isInteger(targetRoomId) || targetRoomId <= 0) throw new HttpError(400, "Select a valid room.");
    const updated = await bookingRepo.updateStaffBooking(id, { roomId: targetRoomId, checkIn, checkOut });
    if (!updated) throw new HttpError(404, "Booking not found.");
    return updated;
  },
  confirm: async (id) => {
    if (!/^[1-9]\d*$/.test(String(id))) throw new HttpError(404, "Booking not found.");
    await bookingRepo.expirePendingBookings();
    const updated = await bookingRepo.confirmPending(id);
    if (!updated) {
      const current = await bookingRepo.findById(id);
      if (!current) throw new HttpError(404, "Booking not found.");
      throw new HttpError(409, "Only pending bookings can be confirmed.");
    }
    return updated;
  },
  cancel: async (id, user) => {
    const booking = await bookingRepo.findById(id);
    if (!booking) throw new HttpError(404, "Booking not found.");
    if (user.role === "customer" && booking.customerid !== user.customerId) throw new HttpError(403, "You do not have permission to cancel this booking.");
    if (!["customer", "staff"].includes(user.role)) throw new HttpError(403, "You do not have permission to cancel this booking.");
    if (!["pending", "confirmed"].includes(booking.status) || booking.checkindate <= new Date().toISOString().slice(0, 10)) throw new HttpError(409, "This booking can no longer be cancelled.");
    const updated = await bookingRepo.cancelBooking(id);
    if (!updated) throw new HttpError(409, "This booking can no longer be cancelled.");
    return {
      ...updated,
      message: updated.refundrequest
        ? "Booking cancelled. Your refund request is pending manual staff review."
        : "Booking cancelled successfully."
    };
  },
  checkIn: async (id) => {
    if (!/^[1-9]\d*$/.test(String(id))) throw new HttpError(404, "Booking not found.");
    return bookingRepo.checkIn(Number(id));
  },
  checkOut: async (id) => {
    if (!/^[1-9]\d*$/.test(String(id))) throw new HttpError(404, "Booking not found.");
    return bookingRepo.checkOut(Number(id));
  },
  stayInvoice: async (id) => {
    if (!/^[1-9]\d*$/.test(String(id))) throw new HttpError(404, "Booking not found.");
    const invoice = await bookingRepo.getInvoice(Number(id));
    if (!invoice) throw new HttpError(404, "Booking not found.");
    return invoice;
  },
  collectStayPayment: async (id, method) => {
    if (!/^[1-9]\d*$/.test(String(id))) throw new HttpError(404, "Booking not found.");
    if (!["cash", "bank_transfer"].includes(method)) throw new HttpError(400, "Select a supported payment method.");
    return bookingRepo.recordStayPayment(Number(id), method);
  },
  listRefundRequests: async (user) => {
    if (!["staff", "admin"].includes(user.role)) throw new HttpError(403, "Staff access is required.");
    return bookingRepo.listRefundRequests();
  },
  completeRefund: async (id, user) => {
    if (user.role !== "admin") throw new HttpError(403, "Only an administrator can confirm that a manual refund was completed.");
    if (!/^[1-9]\d*$/.test(String(id))) throw new HttpError(404, "Refund request not found.");
    if (!Number.isInteger(Number(user.sub))) throw new HttpError(403, "Staff account identity is unavailable.");
    return bookingRepo.completeRefund(Number(id), Number(user.sub));
  },
  createPayment: async (id, user, method) => {
    await bookingRepo.expirePendingBookings();
    const booking = await bookingRepo.findById(id);
    if (!booking) throw new HttpError(404, "Booking not found.");
    if (user.role === "customer" && booking.customerid !== user.customerId) throw new HttpError(403, "You do not have permission to pay for this booking.");
    if (booking.status !== "pending") throw new HttpError(409, "Only pending bookings can be paid.");
    if (await bookingRepo.holdExpired(id)) {
      await bookingRepo.expirePendingBookings();
      throw new HttpError(409, "The booking hold has expired. Please create a new booking.");
    }
    if (!paymentMethods.includes(method)) throw new HttpError(400, "Invalid payment method.");
    return { payment: await bookingRepo.createPayment({ bookingId: id, amount: booking.totalamount, method }), message: "Payment request created. Booking will be confirmed after payment gateway confirmation." };
  },
  paymentHistory: async (user, filters = {}) => {
    const values = {
      from: filters.from ? String(filters.from) : null,
      to: filters.to ? String(filters.to) : null,
      method: filters.method ? String(filters.method).toLowerCase() : null,
      status: filters.status ? String(filters.status).toLowerCase() : null
    };
    for (const date of [values.from, values.to]) {
      if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new HttpError(400, "Invalid payment date filter.");
    }
    if (values.from && values.to && values.to < values.from) throw new HttpError(400, "Payment end date must be on or after start date.");
    if (values.method && !paymentMethods.includes(values.method)) throw new HttpError(400, "Invalid payment method filter.");
    if (values.status && !["pending", "completed", "failed", "refunded"].includes(values.status)) throw new HttpError(400, "Invalid payment status filter.");
    return bookingRepo.listPayments({
      ...values,
      customerId: user.role === "customer" ? user.customerId : null
    });
  },
  confirmPayment: async ({ paymentId, status, reference, amount }) => {
    await bookingRepo.expirePendingBookings();
    if (!/^[1-9]\d*$/.test(String(paymentId))) throw new HttpError(400, "Invalid payment id.");
    if (!["completed", "failed"].includes(status)) throw new HttpError(400, "Invalid payment result.");
    if (!Number.isFinite(Number(amount)) || Number(amount) < 0) throw new HttpError(400, "A valid payment amount is required.");
    const payment = await bookingRepo.settlePayment(Number(paymentId), status, reference, Number(amount));
    if (!payment) throw new HttpError(404, "Pending payment not found.");
    if (status === "completed") {
      const booking = await bookingRepo.findById(payment.bookingid);
      await sendNotification({ to: booking.email, subject: "Booking confirmed", text: `Your booking ${booking.bookingid} has been confirmed.` });
    }
    return payment;
  },
  simulatePayment: async (bookingId, user, outcome = "completed") => {
    if (process.env.NODE_ENV === "production") {
      throw new HttpError(404, "Payment simulation is unavailable.");
    }
    if (!/^[1-9]\d*$/.test(String(bookingId))) throw new HttpError(404, "Booking not found.");
    if (user.role !== "customer" || !user.customerId) throw new HttpError(403, "A customer account is required to pay for a booking.");
    if (!["completed", "failed"].includes(outcome)) throw new HttpError(400, "Invalid mock payment result.");
    const result = await bookingRepo.simulatePayment({ bookingId: Number(bookingId), customerId: user.customerId, outcome });
    if (result.expired) throw new HttpError(408, "Payment session expired. Please re-initiate booking.");
    if (outcome === "failed") return { ...result.payment, message: "Mock payment failed." };
    try {
      await sendNotification({
        to: result.email,
        subject: "Booking payment confirmed",
        text: `Payment for booking ${bookingId} was confirmed successfully.`
      });
    } catch (error) {
      process.stderr.write(`Payment confirmation notification failed: ${error.message}\n`);
    }
    return { ...result.payment, message: "Payment successful." };
  }
};
