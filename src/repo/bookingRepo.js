import { bookings } from "./mockData.js";
export const bookingRepo = {
  findAll: () => [...bookings],
  findById: (id) => bookings.find((b) => b.id === id),
  create: (booking) => { bookings.unshift(booking); return booking; },
  updateStatus: (id, status) => { const item = bookings.find((b) => b.id === id); if (item) item.status = status; return item; }
};
