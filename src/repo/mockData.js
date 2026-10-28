import { Room } from "../models/Room.js";
import { Booking } from "../models/Booking.js";
import { HotelService } from "../models/HotelService.js";
export const rooms = [
  new Room({ id: 1, name: "Deluxe River View", type: "Deluxe", price: 1250000, capacity: 2, beds: "1 King Bed", image: "https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1200&q=80", amenities: ["River view", "Wi-Fi", "Breakfast"], description: "A calm, bright room with a panoramic river view." }),
  new Room({ id: 2, name: "Executive Suite", type: "Suite", price: 2450000, capacity: 3, beds: "1 King Bed + Sofa", image: "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80", amenities: ["Lounge", "Wi-Fi", "Breakfast"], description: "A spacious suite designed for a comfortable stay." }),
  new Room({ id: 3, name: "Superior Twin", type: "Superior", price: 890000, capacity: 2, beds: "2 Single Beds", image: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1200&q=80", amenities: ["City view", "Wi-Fi", "Work desk"], description: "A practical and cozy room for friends or colleagues." })
];
export const bookings = [
  new Booking({ id: "HB-2026-0012", roomId: 1, roomName: "Deluxe River View", checkIn: "2026-11-12", checkOut: "2026-11-14", guests: 2, total: 2500000, status: "Confirmed", customerName: "Demo Customer" }),
  new Booking({ id: "HB-2026-0018", roomId: 3, roomName: "Superior Twin", checkIn: "2026-12-02", checkOut: "2026-12-04", guests: 2, total: 1780000, status: "Pending Payment", customerName: "Demo Customer" })
];
export const hotelServices = [
  new HotelService({ id: 1, name: "Airport transfer", description: "Private transfer to or from the airport.", price: 350000, unit: "per trip" }),
  new HotelService({ id: 2, name: "Spa & wellness", description: "Relaxing massage and wellness session.", price: 500000, unit: "per person" }),
  new HotelService({ id: 3, name: "Breakfast buffet", description: "Breakfast buffet with local and international dishes.", price: 180000, unit: "per person" })
];
export const users = [{ id: 1, fullName: "Demo Customer", email: "customer@example.com", phone: "0900000000", role: "Customer", status: "Active" }];
export const roomTypes = [
  { id: 1, name: "Superior", basePrice: 890000, capacity: 2, amenities: "Wi-Fi, Work desk" },
  { id: 2, name: "Deluxe", basePrice: 1250000, capacity: 2, amenities: "River view, Wi-Fi, Breakfast" },
  { id: 3, name: "Suite", basePrice: 2450000, capacity: 3, amenities: "Lounge, Wi-Fi, Breakfast" }
];
export const discountCodes = [{ id: 1, code: "WELCOME10", type: "Percentage", value: 10, status: "Active", usageLimit: 100 }];
export const reviews = [{ id: 1, author: "Linh N.", rating: 5, text: "Beautiful room and friendly staff." }, { id: 2, author: "Minh T.", rating: 4, text: "Comfortable stay and convenient location." }];
