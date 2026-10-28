/** ERD entity: Review */
export class Review {
  constructor({ ReviewID, BookingID, CustomerID, Rating, Comment = "", CreatedAt = null }) {
    Object.assign(this, { ReviewID, BookingID, CustomerID, Rating, Comment, CreatedAt });
  }
}
