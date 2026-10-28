/** ERD entity: Room */
export class RoomEntity {
  constructor({ RoomID, RoomTypeID, RoomNumber, Status, IsDeleted = false }) {
    Object.assign(this, { RoomID, RoomTypeID, RoomNumber, Status, IsDeleted });
  }
}
