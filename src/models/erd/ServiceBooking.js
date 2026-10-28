/** ERD entity: ServiceBooking */
export class ServiceBooking {
  constructor({ ServiceBookingID, BookingID, ServiceID, Quantity, TotalPrice, BookingDate = null }) {
    Object.assign(this, { ServiceBookingID, BookingID, ServiceID, Quantity, TotalPrice, BookingDate });
  }
}
