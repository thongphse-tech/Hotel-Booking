export class Booking {
  constructor({ id, roomId, roomName, checkIn, checkOut, guests, total, status = "Pending Payment", customerName = "Guest" }) {
    Object.assign(this, { id, roomId, roomName, checkIn, checkOut, guests, total, status, customerName });
  }
}
