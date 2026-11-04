/** ERD entity: Booking */
export class BookingEntity {
  constructor({
    BookingID,
    CustomerID,
    RoomID,
    CodeID = null,
    CheckinDate,
    CheckOutDate,
    Status,
    TotalAmount,
    GuestName = null,
    ContactPhone = null,
    SpecialRequests = null
  }) {
    Object.assign(this, {
      BookingID,
      CustomerID,
      RoomID,
      CodeID,
      CheckinDate,
      CheckOutDate,
      Status,
      TotalAmount,
      GuestName,
      ContactPhone,
      SpecialRequests
    });
  }
}
