export class HotelService {
  constructor({ id, name, description, price, unit }) {
    Object.assign(this, { id, name, description, price, unit });
  }
}
