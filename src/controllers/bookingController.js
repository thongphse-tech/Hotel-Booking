import { bookingService } from "../services/bookingService.js";
export const bookingController = {
  list: () => bookingService.getBookings(),
  create: (payload) => bookingService.createBooking(payload),
  cancel: (id) => bookingService.cancelBooking(id),
  pay: (id) => bookingService.confirmPayment(id)
};
