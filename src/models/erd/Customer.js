/** ERD entity: Customer */
export class Customer {
  constructor({ CustomerID, AccountID = null, FullName, Email, Phone }) {
    Object.assign(this, { CustomerID, AccountID, FullName, Email, Phone });
  }
}
