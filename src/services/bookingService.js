import { apiClient } from "./apiClient.js";

const moneyAmount = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;
const statuses = { pending: "Pending Payment", confirmed: "Confirmed", checked_in: "Checked In", checked_out: "Checked Out", cancelled: "Cancelled" };
const refundStatuses = { pending: "Refund pending", refunded: "Refunded" };
const paymentState = ({ total, paid, latestStatus, bookingStatus, refundStatus }) => {
  if (refundStatus === "refunded") return "Refunded";
  if (refundStatus === "pending") return "Refund pending";
  if (paid >= total && total > 0) return "Paid";
  if (paid > 0) return "Partially Paid";
  if (latestStatus === "pending") return "Pending Payment";
  if (latestStatus === "failed") return "Payment failed";
  if (bookingStatus === "cancelled") return "Cancelled";
  return "Unpaid";
};
const mapBooking = (item) => ({
  id: item.bookingid,
  roomId: item.roomid,
  roomName: `${item.roomtype || "Room"} ${item.roomnumber || ""}`.trim(),
  roomStatus: item.roomstatus || null,
  checkIn: String(item.checkindate).slice(0, 10),
  checkOut: String(item.checkoutdate).slice(0, 10),
  guests: Number(item.guestcount || 1),
  total: moneyAmount(item.totalamount || 0),
  paidAmount: moneyAmount(item.paidamount || 0),
  balance: item.refundstatus === "refunded"
    ? 0
    : Math.max(0, moneyAmount(Number(item.totalamount || 0) - Number(item.paidamount || 0))),
  serviceAmount: moneyAmount(item.serviceamount || 0),
  createdAt: item.createdat ? new Date(item.createdat).toISOString() : null,
  status: statuses[item.status] || item.status,
  refundStatus: refundStatuses[item.refundstatus] || null,
  refundAmount: moneyAmount(item.refundamount || 0),
  paymentStatus: paymentState({
    total: Number(item.totalamount || 0),
    paid: Number(item.paidamount || 0),
    latestStatus: item.paymentstatus,
    bookingStatus: item.status,
    refundStatus: item.refundstatus
  }),
  customerName: item.fullname || "Guest",
  contactPhone: item.contactphone || item.phone || ""
});

const mapInvoice = (item) => ({
  bookingId: item.bookingid,
  customerName: item.fullname || "Guest",
  contactPhone: item.contactphone || "",
  roomName: `${item.roomtype || "Room"} ${item.roomnumber || ""}`.trim(),
  roomStatus: item.roomstatus,
  checkIn: String(item.checkindate).slice(0, 10),
  checkOut: String(item.checkoutdate).slice(0, 10),
  bookingStatus: statuses[item.status] || item.status,
  roomCharge: Number(item.roomcharge),
  services: (item.services || []).map((service) => ({
    id: service.servicebookingid,
    name: service.servicename,
    quantity: Number(service.quantity),
    amount: Number(service.totalprice),
    serviceDate: service.servicedate ? String(service.servicedate).slice(0, 10) : "",
    status: service.status
  })),
  serviceAmount: Number(item.serviceamount),
  totalAmount: Number(item.totalamount),
  paidAmount: Number(item.paidamount),
  balance: Number(item.balance),
  refundStatus: refundStatuses[item.refundstatus] || null,
  refundAmount: Number(item.refundamount || 0)
});

export const bookingService = {
  getBookings: async (filters = {}) => {
    const user = apiClient.user();
    const isStaff = ["admin", "staff"].includes(String(user?.role || "").toLowerCase());
    const params = new URLSearchParams();
    for (const key of ["status", "from", "to"]) {
      if (filters[key]) params.set(key, filters[key]);
    }
    const query = params.toString();
    const endpoint = isStaff ? "/admin/bookings" : "/bookings";
    return (await apiClient.request(`${endpoint}${query ? `?${query}` : ""}`)).map(mapBooking);
  },
  getManagementBooking: async (id) => {
    const item = await apiClient.request(`/admin/bookings/${id}`);
    const paidAmount = moneyAmount((item.payments || [])
      .filter((payment) => payment.status === "completed")
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0));
    return {
      ...mapBooking(item),
      paidAmount,
      balance: item.refundstatus === "refunded"
        ? 0
        : Math.max(0, moneyAmount(Number(item.totalamount || 0) - paidAmount)),
      paymentStatus: paymentState({
        total: Number(item.totalamount || 0),
        paid: paidAmount,
        latestStatus: item.payments?.[0]?.status,
        bookingStatus: item.status,
        refundStatus: item.refundstatus
      }),
      payments: item.payments || []
    };
  },
  getPaymentStatus: async (id) => {
    const item = await apiClient.request(`/bookings/${id}`);
    const paidAmount = moneyAmount((item.payments || [])
      .filter((payment) => payment.status === "completed")
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0));
    return {
      ...mapBooking({ ...item, paidamount: paidAmount, paymentstatus: item.payments?.[0]?.status }),
      payments: item.payments || []
    };
  },
  getStayInvoice: async (id) => mapInvoice(await apiClient.request(`/staff/stays/${id}/invoice`)),
  collectStayPayment: async (id, method) => apiClient.request(`/staff/stays/${id}/payments`, {
    method: "POST",
    body: JSON.stringify({ method })
  }),
  updateManagementBooking: async (id, payload) => mapBooking(
    await apiClient.request(`/admin/bookings/${id}`, { method: "PUT", body: JSON.stringify(payload) })
  ),
  confirmManagementBooking: async (id) => mapBooking(
    await apiClient.request(`/admin/bookings/${id}/confirm`, { method: "PATCH" })
  ),
  createBooking: async (payload) => {
    const item = await apiClient.request("/bookings", { method: "POST", body: JSON.stringify(payload) });
    return { ...mapBooking(item), codeId: item.codeid };
  },
  cancelBooking: async (id) => {
    const item = await apiClient.request(`/bookings/${id}/cancel`, { method: "POST" });
    return {
      ...mapBooking(item),
      message: item.message,
      refundRequest: item.refundrequest ? {
        id: item.refundrequest.refundrequestid,
        amount: moneyAmount(item.refundrequest.amount),
        status: refundStatuses[item.refundrequest.status] || item.refundrequest.status
      } : null
    };
  },
  createPayment: async (id, method = "bank_transfer") => apiClient.request(`/bookings/${id}/payments`, { method: "POST", body: JSON.stringify({ method }) }),
  simulatePayment: async (bookingId, outcome = "completed") => apiClient.request("/payments", {
    method: "POST",
    body: JSON.stringify({ bookingId, outcome })
  }),
  getPaymentHistory: async (filters = {}) => {
    const params = new URLSearchParams(Object.entries(filters).filter(([, value]) => value));
    return apiClient.request(`/bookings/payments/history${params.toString() ? `?${params}` : ""}`);
  },
  getRefundRequests: async () => apiClient.request("/staff/refunds"),
  completeRefund: async (id) => apiClient.request(`/staff/refunds/${id}/complete`, { method: "POST" })
};
