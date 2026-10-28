/** ERD entity: Payment */
export class Payment {
  constructor({ PaymentID, BookingID, Amount, PaymentMethod, Status, TransactionDate = null }) {
    Object.assign(this, { PaymentID, BookingID, Amount, PaymentMethod, Status, TransactionDate });
  }
}
