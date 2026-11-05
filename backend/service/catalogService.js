import { catalogRepo } from "../repo/catalogRepo.js";
import { HttpError } from "./httpError.js";
import { sendNotification } from "./notificationService.js";
import { validatePhone, normalizeEmail } from "../model/userModel.js";

function validateDiscount(data) {
  const code = String(data?.codeString || "").trim().toUpperCase();
  const type = String(data?.discountType || "percentage").toLowerCase();
  const value = Number(data?.discountValue);
  const roomTypeId = data?.roomTypeId === null || data?.roomTypeId === "" || data?.roomTypeId === undefined
    ? null
    : Number(data.roomTypeId);
  if (!/^[A-Z0-9][A-Z0-9_-]{2,49}$/.test(code)) throw new HttpError(400, "Code must be 3-50 characters and contain only letters, numbers, hyphens, or underscores.");
  if (!["percentage", "fixed"].includes(type) || !Number.isFinite(value) || value < 0 || (type === "percentage" && value > 100) || (type === "fixed" && value <= 0)) throw new HttpError(400, type === "fixed" ? "Fixed discount must be greater than zero." : "Percentage discount must be between 0 and 100.");
  if (roomTypeId !== null && (!Number.isInteger(roomTypeId) || roomTypeId <= 0)) throw new HttpError(400, "Select a valid room type for this discount.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(data.validFrom)) || !/^\d{4}-\d{2}-\d{2}$/.test(String(data.validTo)) || data.validTo < data.validFrom) throw new HttpError(400, "Start and end dates must be valid and chronological.");
  if (data.usageLimit !== undefined && data.usageLimit !== null && (!Number.isInteger(Number(data.usageLimit)) || Number(data.usageLimit) <= 0)) throw new HttpError(400, "Usage limit must be a positive number or unlimited.");
  return { codeString: code, roomTypeId, discountType: type, discountValue: value, validFrom: data.validFrom, validTo: data.validTo, usageLimit: data.usageLimit === null || data.usageLimit === "" ? null : Number(data.usageLimit) };
}

function validateService(data) {
  const name = String(data.name || "").trim();
  const category = String(data.category || "General").trim();
  if (!name || name.length > 100 || !category || category.length > 50 || !Number.isFinite(Number(data.price)) || Number(data.price) < 0) throw new HttpError(400, "Service name, category, and a non-negative price are required. Names must be 100 characters or fewer.");
  if (String(data.description || "").length > 2000 || String(data.conditions || "").length > 2000) throw new HttpError(400, "Service description and conditions must be 2000 characters or fewer.");
  if (String(data.operatingHours || "").length > 120) throw new HttpError(400, "Operating hours must be 120 characters or fewer.");
  if (data.capacity !== undefined && data.capacity !== null && (!Number.isInteger(Number(data.capacity)) || Number(data.capacity) <= 0)) throw new HttpError(400, "Service capacity must be a positive number.");
}

export const catalogService = {
  listDiscounts: () => catalogRepo.listDiscounts(),
  availableDiscounts: async (roomTypeId) => {
    const id = Number(roomTypeId);
    if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, "A valid room type is required.");
    return catalogRepo.listAvailableDiscounts(id);
  },
  validateDiscount: async (code, roomTypeId) => {
    if (!String(code || "").trim()) throw new HttpError(400, "Enter a discount code.");
    const id = Number(roomTypeId);
    if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, "A valid room type is required.");
    const result = await catalogRepo.findValidDiscount(code.trim(), id);
    if (!result) throw new HttpError(404, "Discount code is invalid, expired, or fully used.");
    return result;
  },
  createDiscount: async (data) => {
    const validated = validateDiscount(data);
    if (validated.roomTypeId !== null && !await catalogRepo.getActiveRoomType(validated.roomTypeId)) {
      throw new HttpError(400, "Selected room type does not exist or is inactive.");
    }
    try { return await catalogRepo.createDiscount(validated); } catch (error) { if (error.code === "23505") throw new HttpError(409, "Discount code already exists."); throw error; }
  },
  updateDiscount: async (id, data) => {
    const current = await catalogRepo.getDiscount(id);
    if (!current) throw new HttpError(404, "Discount code not found.");
    const validated = validateDiscount({ codeString: current.codestring, roomTypeId: current.roomtypeid, discountType: current.discounttype, discountValue: current.discountvalue, validFrom: String(current.validfrom).slice(0, 10), validTo: String(current.validto).slice(0, 10), usageLimit: current.usagelimit, ...data });
    if (validated.usageLimit !== null && validated.usageLimit < Number(current.usedcount)) {
      throw new HttpError(400, "Usage limit cannot be lower than the number of redemptions already recorded.");
    }
    if (Number(current.usedcount) > 0 && (validated.codeString !== current.codestring || validated.roomTypeId !== current.roomtypeid || validated.discountType !== current.discounttype || validated.discountValue !== Number(current.discountvalue))) {
      throw new HttpError(409, "A discount already used cannot change its code, room type, or value. Deactivate it and create a new code instead.");
    }
    if (validated.roomTypeId !== null && !await catalogRepo.getActiveRoomType(validated.roomTypeId)) {
      throw new HttpError(400, "Selected room type does not exist or is inactive.");
    }
    try {
      const updated = await catalogRepo.updateDiscount(id, validated);
      if (!updated) throw new HttpError(404, "Discount code not found.");
      return updated;
    } catch (error) { if (error.code === "23505") throw new HttpError(409, "Discount code already exists."); throw error; }
  },
  setDiscountActive: async (id, active) => {
    if (typeof active !== "boolean") throw new HttpError(400, "isActive must be true or false.");
    const result = await catalogRepo.setDiscountActive(id, active);
    if (!result) throw new HttpError(404, "Discount code not found.");
    return result;
  },
  listServices: (filters) => catalogRepo.listServices(filters),
  createService: async (data) => {
    validateService(data);
    const category = String(data.category || "General").trim();
    const name = String(data.name).trim();
    if (await catalogRepo.findServiceName(name, category)) throw new HttpError(409, "A service with this name already exists in this category.");
    return catalogRepo.createService({ ...data, name, category });
  },
  updateService: async (id, data) => {
    const current = await catalogRepo.getService(id);
    if (!current) throw new HttpError(404, "Service not found.");
    validateService({ ...current, ...data });
    if (await catalogRepo.findServiceName(data.name || current.name, data.category || current.category, Number(id))) throw new HttpError(409, "A service with this name already exists in this category.");
    return catalogRepo.updateService(id, data);
  },
  deleteService: async (id) => {
    const activeReservations = await catalogRepo.countActiveServiceBookings(id);
    if (Number(activeReservations) > 0) throw new HttpError(409, "Cannot delete a service with active reservations. Deactivate it after the reservations are completed.");
    const result = await catalogRepo.deleteService(id);
    if (!result) {
      if (Number(await catalogRepo.countActiveServiceBookings(id)) > 0) throw new HttpError(409, "Cannot delete a service with active reservations. Deactivate it after the reservations are completed.");
      throw new HttpError(404, "Service not found.");
    }
    return { message: "Service deactivated successfully." };
  },
  listServiceBookings: (user) => catalogRepo.listServiceBookings(user.role === "customer" ? user.customerId : null),
  bookService: async (user, data) => {
    const bookingId = Number(data.bookingId);
    const serviceId = Number(data.serviceId);
    const quantity = Number(data.quantity);
    const serviceDate = String(data.serviceDate || "");
    const timeSlot = String(data.timeSlot || "").trim();
    const specialNotes = String(data.specialNotes || "").trim();
    if (!Number.isInteger(bookingId) || bookingId <= 0 || !Number.isInteger(serviceId) || serviceId <= 0 || !Number.isInteger(quantity) || quantity <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(serviceDate)) throw new HttpError(400, "Booking, service, date, and a positive quantity are required.");
    const parsedServiceDate = new Date(`${serviceDate}T00:00:00Z`);
    if (Number.isNaN(parsedServiceDate.getTime()) || parsedServiceDate.toISOString().slice(0, 10) !== serviceDate) throw new HttpError(400, "Service date must be a valid calendar date.");
    if (timeSlot.length > 50 || specialNotes.length > 500) throw new HttpError(400, "Time slot must be 50 characters or fewer and notes must be 500 characters or fewer.");
    const booking = await catalogRepo.reviewBooking(bookingId);
    if (!booking) throw new HttpError(404, "Room booking not found.");
    if (user.role === "customer" && booking.customerid !== user.customerId) throw new HttpError(403, "You do not have permission to book a service for this stay.");
    if (user.role === "staff" && booking.status !== "checked_in") throw new HttpError(409, "Staff can book services on behalf of an in-house guest only.");
    if (user.role === "customer" && !["confirmed", "checked_in"].includes(booking.status)) throw new HttpError(409, "Services can only be booked for confirmed or checked-in bookings.");
    const serviceBooking = await catalogRepo.createServiceBooking({ bookingId, serviceId, quantity, serviceDate, timeSlot: timeSlot || "Theo yêu cầu", specialNotes });
    const notification = await catalogRepo.serviceBookingNotification(bookingId, serviceId);
    const notificationDelivered = notification
      ? await sendNotification({ to: notification.email, subject: "Hotel service booking confirmed", text: `Hello ${notification.fullname}, ${notification.servicename} has been added to booking ${notification.bookingid} for ${serviceDate} at ${timeSlot}.` })
      : false;
    if (!notificationDelivered) process.stderr.write(`Service booking ${serviceBooking.servicebookingid} created, but confirmation notification was not delivered.\n`);
    return { ...serviceBooking, notificationDelivered };
  },
  listReviews: async (filters) => {
    const limit = Math.min(Math.max(Number(filters.limit) || 50, 1), 100);
    const offset = Math.max(Number(filters.offset) || 0, 0);
    const rating = filters.rating ? Number(filters.rating) : null;
    if (rating && (!Number.isInteger(rating) || rating < 1 || rating > 5)) throw new HttpError(400, "Rating filter must be from 1 to 5.");
    if (filters.sort && !["recent", "highest", "lowest"].includes(filters.sort)) throw new HttpError(400, "Invalid review sort order.");
    const all = (filters.all === "true" || filters.all === true) && ["staff", "admin"].includes(filters.user?.role);
    return { summary: await catalogRepo.reviewSummary(), items: await catalogRepo.listReviews({ ...filters, rating, limit, offset, all }) };
  },
  eligibleReviewBookings: async (user) => {
    if (user.role !== "customer" || !user.customerId) throw new HttpError(403, "A customer account is required.");
    return catalogRepo.eligibleReviewBookings(user.customerId);
  },
  submitReview: async (user, data) => {
    if (user.role !== "customer" || !user.customerId) throw new HttpError(403, "A customer account is required to submit a review.");
    const rating = Number(data.rating);
    if (!Number.isInteger(Number(data.bookingId)) || Number(data.bookingId) <= 0) throw new HttpError(400, "Select a valid booking.");
    const comment = String(data.comment || "").trim();
    const title = String(data.title || "").trim();
    if (!Number.isInteger(rating) || rating < 1 || rating > 5 || !comment) throw new HttpError(400, "Please provide both a star rating and review comments.");
    if (comment.length < 10 || comment.length > 2000) throw new HttpError(400, "Review comments must be between 10 and 2000 characters.");
    if (title.length > 120) throw new HttpError(400, "Review title must be 120 characters or fewer.");
    const booking = await catalogRepo.reviewBooking(data.bookingId);
    if (!booking || booking.customerid !== user.customerId || booking.status !== "checked_out") throw new HttpError(403, "Only your completed stays can be reviewed.");
    try { return await catalogRepo.createReview({ bookingId: data.bookingId, customerId: user.customerId, rating, title, comment }); }
    catch (error) { if (error.code === "23505") throw new HttpError(409, "This booking already has a review."); throw error; }
  },
  approveReview: async (id, approved) => {
    if (typeof approved !== "boolean") throw new HttpError(400, "isApproved must be true or false.");
    const result = await catalogRepo.approveReview(id, approved);
    if (!result) throw new HttpError(404, "Review not found.");
    return result;
  },
  listCustomers: () => catalogRepo.listCustomers(),
  getCustomer: async (id) => {
    if (!/^[1-9]\d*$/.test(String(id))) throw new HttpError(400, "Invalid customer ID.");
    const result = await catalogRepo.getCustomer(id);
    if (!result) throw new HttpError(404, "Customer not found.");
    return result;
  },
  updateCustomer: async (id, data) => {
    if (!/^[1-9]\d*$/.test(String(id))) throw new HttpError(400, "Invalid customer ID.");
    const fullName = String(data?.fullName || "").trim();
    const email = normalizeEmail(data?.email);
    const phone = String(data?.phone || "").trim();
    const address = String(data?.address || "").trim();
    if (!fullName || fullName.length > 100) throw new HttpError(400, "Full name is required and must be 100 characters or fewer.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 100) throw new HttpError(400, "Please enter a valid email address.");
    if (phone && !validatePhone(phone)) throw new HttpError(400, "Please enter a valid phone number.");
    if (address.length > 255) throw new HttpError(400, "Address must be 255 characters or fewer.");
    let result;
    try {
      result = await catalogRepo.updateCustomer(id, { fullName, email, phone, address });
    } catch (error) {
      if (error.code === "23505") throw new HttpError(409, "That email address is already in use.");
      throw error;
    }
    if (!result) throw new HttpError(404, "Customer not found.");
    return { ...result, message: "Customer details updated successfully." };
  },
  setCustomerActive: async (id, active) => {
    if (typeof active !== "boolean") throw new HttpError(400, "isActive must be true or false.");
    const result = await catalogRepo.setCustomerActive(id, active);
    if (!result) throw new HttpError(404, "Customer not found.");
    return result;
  }
};
