import { roomRepo } from "../repo/roomRepo.js";
export const roomService = {
  getRooms: () => roomRepo.findAll(),
  getRoom: (id) => roomRepo.findById(id),
  searchRooms: (filters) => {
    if (filters.checkIn && filters.checkOut && filters.checkOut <= filters.checkIn) throw new Error("Check-out date must be after check-in date.");
    return roomRepo.search(filters);
  }
};
