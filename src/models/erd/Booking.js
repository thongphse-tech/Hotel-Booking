/** ERD entity: Booking */
export class BookingEntity {
  constructor({ BookingID, CustomerID, RoomID, CodeID = null, CheckinDate, CheckOutDate, Status, TotalAmount }) {
    Object.assign(this, { BookingID, CustomerID, RoomID, CodeID, CheckinDate, CheckOutDate, Status, TotalAmount });
  }
}
