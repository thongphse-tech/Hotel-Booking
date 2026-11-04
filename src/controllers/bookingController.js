import { bookingService } from "../services/bookingService.js";
import { apiClient } from "../services/apiClient.js";

export const bookingController = {
  list: (filters) => bookingService.getBookings(filters),
  managementDetails: (id) => bookingService.getManagementBooking(id),
  stayInvoice: (id) => bookingService.getStayInvoice(id),
  collectStayPayment: (id, method) => bookingService.collectStayPayment(id, method),
  updateManagement: (id, data) => bookingService.updateManagementBooking(id, data),
  confirmManagement: (id) => bookingService.confirmManagementBooking(id),
  create: (payload) => bookingService.createBooking(payload),
  cancel: (id) => bookingService.cancelBooking(id),
  pay: (id, method) => bookingService.createPayment(id, method),
  simulatePayment: (bookingId, outcome) => bookingService.simulatePayment(bookingId, outcome),
  get: (id) => apiClient.request(`/bookings/${id}`),
  paymentStatus: (id) => bookingService.getPaymentStatus(id),
  update: (id, data) => apiClient.request(`/bookings/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  checkIn: (id) => apiClient.request("/staff/check-in", { method: "POST", body: JSON.stringify({ bookingId: id }) }),
  checkOut: (id) => apiClient.request("/staff/check-out", { method: "POST", body: JSON.stringify({ bookingId: id }) }),
  paymentHistory: (filters) => bookingService.getPaymentHistory(filters),
  refundRequests: () => bookingService.getRefundRequests(),
  completeRefund: (id) => bookingService.completeRefund(id)
};
