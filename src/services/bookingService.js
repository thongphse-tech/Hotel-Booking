import { Booking } from "../models/Booking.js";
import { bookingRepo } from "../repo/bookingRepo.js";
import { roomRepo } from "../repo/roomRepo.js";
export const bookingService = {
  getBookings: () => bookingRepo.findAll(),
  createBooking: ({ roomId, checkIn, checkOut, guests, customerName }) => {
    if (!checkIn || !checkOut || checkOut <= checkIn) throw new Error("Choose a valid check-in and check-out date.");
    const room = roomRepo.findById(roomId);
    if (!room) throw new Error("Please select a valid room.");
    if (Number(guests) > room.capacity) throw new Error(`This room supports up to ${room.capacity} guests.`);
    const nights = Math.max(1, Math.round((new Date(checkOut) - new Date(checkIn)) / 86400000));
    return bookingRepo.create(new Booking({ id: `HB-${Date.now().toString().slice(-8)}`, roomId: room.id, roomName: room.name, checkIn, checkOut, guests: Number(guests), total: room.price * nights, status: "Pending Payment", customerName: customerName || "Demo Customer" }));
  },
  cancelBooking: (id) => bookingRepo.updateStatus(id, "Cancelled"),
  confirmPayment: (id) => bookingRepo.updateStatus(id, "Confirmed")
};
