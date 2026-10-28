/** ERD entity: RoomType */
export class RoomType {
  constructor({ RoomTypeID, Name, Price, Capacity, Amenities = "" }) {
    Object.assign(this, { RoomTypeID, Name, Price, Capacity, Amenities });
  }
}
