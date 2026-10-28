import { rooms } from "./mockData.js";
export const roomRepo = {
  findAll: () => [...rooms],
  findById: (id) => rooms.find((room) => room.id === Number(id)),
  search: ({ type, guests }) => rooms.filter((r) => (!type || type === "All" || r.type === type) && r.capacity >= Number(guests || 1))
};
