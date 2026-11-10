import { catalogService } from "../services/catalogService.js";
import { apiClient } from "../services/apiClient.js";

export const catalogController = {
  services: () => catalogService.getServices(),
  customers: () => catalogService.getCustomers(),
  customer: (id) => catalogService.getCustomer(id),
  roomTypes: () => catalogService.getRoomTypes(),
  discounts: () => catalogService.getDiscounts(),
  availableDiscounts: (roomTypeId) => catalogService.getAvailableDiscounts(roomTypeId),
  validateDiscount: (code, roomTypeId) => apiClient.request(`/discounts/validate?code=${encodeURIComponent(code)}&roomTypeId=${encodeURIComponent(roomTypeId)}`),
  reviews: (includePending = false) => catalogService.getReviews(includePending),
  reviewFeed: (filters) => catalogService.getReviewFeed(filters),
  eligibleReviewBookings: () => catalogService.getEligibleReviewBookings(),
  submitReview: (payload) => catalogService.submitReview(payload),
  serviceBookings: () => catalogService.getServiceBookings(),
  bookService: (payload) => catalogService.bookService(payload),
  createService: (data) => apiClient.request("/services", { method: "POST", body: JSON.stringify(data) }),
  updateService: (id, data) => apiClient.request(`/services/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteService: (id) => apiClient.request(`/services/${id}`, { method: "DELETE" }),
  updateCustomer: (id, data) => apiClient.request(`/customers/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  setCustomerActive: (id, active) => apiClient.request(`/customers/${id}/status`, { method: "PATCH", body: JSON.stringify({ isActive: active }) }),
  createDiscount: (data) => apiClient.request("/discounts", { method: "POST", body: JSON.stringify(data) }),
  updateDiscount: (id, data) => apiClient.request(`/discounts/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  setDiscountActive: (id, active) => apiClient.request(`/discounts/${id}/status`, { method: "PATCH", body: JSON.stringify({ isActive: active }) }),
  deleteDiscount: (id) => catalogService.deleteDiscount(id),
  approveReview: (id, approved) => apiClient.request(`/reviews/${id}/approval`, { method: "PATCH", body: JSON.stringify({ isApproved: approved }) })
};
