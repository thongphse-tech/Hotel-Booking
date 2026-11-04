import { apiClient } from "./apiClient.js";

export const catalogService = {
  getServices: async () => (await apiClient.request("/services")).map((item) => ({ id: item.serviceid, name: item.name, category: item.category, description: item.description || "", conditions: item.conditions || "", operatingHours: item.operatinghours || "", price: Number(item.price), unit: "per booking", capacity: item.capacity })),
  getCustomers: async () => (await apiClient.request("/customers")).map((item) => ({
    id: item.customerid,
    fullName: item.fullname,
    email: item.email,
    phone: item.phone,
    address: item.address,
    isActive: Boolean(item.isactive),
    bookingCount: Number(item.bookingcount || 0),
    createdAt: item.createdat
  })),
  getCustomer: async (id) => {
    const item = await apiClient.request(`/customers/${id}`);
    return {
      id: item.customerid,
      fullName: item.fullname,
      email: item.email,
      phone: item.phone,
      address: item.address,
      isActive: Boolean(item.isactive),
      createdAt: item.createdat,
      bookings: (item.bookings || []).map((booking) => ({
        id: booking.bookingid,
        checkIn: booking.checkindate,
        checkOut: booking.checkoutdate,
        status: booking.status,
        totalAmount: Number(booking.totalamount),
        roomNumber: booking.roomnumber,
        roomType: booking.roomtype
      }))
    };
  },
  getRoomTypes: async () => (await apiClient.request("/rooms/room-types")).map((item) => ({
    id: item.roomtypeid,
    name: item.name,
    price: Number(item.price),
    basePrice: Number(item.price),
    capacity: Number(item.capacity),
    amenities: item.amenities || "",
    description: item.description || ""
  })),
  getDiscounts: async () => (await apiClient.request("/discounts")).map((item) => ({
    id: item.codeid,
    code: item.codestring,
    codeString: item.codestring,
    roomTypeId: item.roomtypeid == null ? "" : String(item.roomtypeid),
    roomTypeName: item.roomtypename || "",
    discountValue: Number(item.discountvalue),
    discountType: item.discounttype || "percentage",
    validFrom: item.validfrom ? String(item.validfrom).slice(0, 10) : "",
    validTo: item.validto ? String(item.validto).slice(0, 10) : "",
    usageLimit: item.usagelimit,
    usedCount: item.usedcount || 0,
    isActive: Boolean(item.isactive)
  })),
  getAvailableDiscounts: async (roomTypeId) => (await apiClient.request(`/discounts/available?roomTypeId=${encodeURIComponent(roomTypeId)}`)).map((item) => ({
    id: item.codeid,
    codeString: item.codestring,
    roomTypeId: item.roomtypeid,
    discountValue: Number(item.discountvalue),
    discountType: item.discounttype || "percentage",
    validFrom: item.validfrom ? String(item.validfrom).slice(0, 10) : "",
    validTo: item.validto ? String(item.validto).slice(0, 10) : ""
  })),
  getServiceBookings: () => apiClient.request("/service-bookings"),
  bookService: (payload) => apiClient.request("/service-bookings", { method: "POST", body: JSON.stringify(payload) }),
  getReviews: async (includePending = false) => {
    const result = await apiClient.request(includePending ? "/reviews/moderation?all=true" : "/reviews");
    return (result.items || []).map((item) => ({
      id: item.reviewid,
      author: item.author,
      rating: item.rating,
      title: item.title || "",
      text: item.comment || "",
      isApproved: Boolean(item.isapproved)
    }));
  },
  getReviewFeed: async ({ rating = "", sort = "recent", limit = 6, offset = 0 } = {}) => {
    const params = new URLSearchParams({ sort, limit: String(limit), offset: String(offset) });
    if (rating) params.set("rating", String(rating));
    const result = await apiClient.request(`/reviews?${params.toString()}`);
    return {
      summary: {
        average: Number(result.summary?.average || 0),
        count: Number(result.summary?.count || 0),
        five: Number(result.summary?.five || 0),
        four: Number(result.summary?.four || 0),
        three: Number(result.summary?.three || 0),
        two: Number(result.summary?.two || 0),
        one: Number(result.summary?.one || 0)
      },
      items: (result.items || []).map((item) => ({
        id: item.reviewid,
        author: item.author,
        rating: Number(item.rating),
        title: item.title || "",
        text: item.comment || "",
        createdAt: item.createdat
      }))
    };
  },
  getEligibleReviewBookings: () => apiClient.request("/reviews/eligible"),
  submitReview: (payload) => apiClient.request("/reviews", { method: "POST", body: JSON.stringify(payload) })
};
