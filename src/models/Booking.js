export class Booking {
  constructor({
    id,
    roomId,
    roomName,
    checkIn,
    checkOut,
    guests,
    total,
    status = "Pending Payment",
    customerName = "Guest",
    guestName = customerName,
    contactPhone = "",
    specialRequests = ""
  }) {
    Object.assign(this, { id, roomId, roomName, checkIn, checkOut, guests, total, status, customerName, guestName, contactPhone, specialRequests });
  }
}
