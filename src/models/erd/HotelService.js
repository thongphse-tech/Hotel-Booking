/** ERD entity: HotelService */
export class HotelServiceEntity {
  constructor({ ServiceID, Name, Description = "", Price, Conditions = "", IsDeleted = false }) {
    Object.assign(this, { ServiceID, Name, Description, Price, Conditions, IsDeleted });
  }
}
