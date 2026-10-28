export class Room {
  constructor({ id, name, type, price, capacity, beds, image, amenities = [], description = "" }) {
    Object.assign(this, { id, name, type, price, capacity, beds, image, amenities, description });
  }
}
