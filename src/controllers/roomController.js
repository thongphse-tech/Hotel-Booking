import { roomService } from "../services/roomService.js";
export const roomController = {
  list: () => roomService.getRooms(),
  search: (filters) => roomService.searchRooms(filters),
  details: (id) => roomService.getRoom(id)
};
