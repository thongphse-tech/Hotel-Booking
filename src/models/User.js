export class User {
  constructor({ id, fullName, email, phone = "", role = "Customer" }) {
    Object.assign(this, { id, fullName, email, phone, role });
  }
}
