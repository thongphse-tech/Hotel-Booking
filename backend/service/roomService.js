import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { roomRepo } from "../repo/roomRepo.js";
import { validateRoom, validateRoomType } from "../model/roomModel.js";
import { HttpError } from "./httpError.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsRoot = path.join(__dirname, "..", "uploads");

export const roomService = {
  list: (filters = {}) => {
    const minimumCapacity = filters.minimumCapacity === undefined || filters.minimumCapacity === ""
      ? null
      : Number(filters.minimumCapacity);
    if (minimumCapacity !== null && (!Number.isInteger(minimumCapacity) || minimumCapacity < 1)) {
      throw new HttpError(400, "Minimum capacity must be a positive whole number.");
    }
    const sort = filters.sort || "price-asc";
    if (!["price-asc", "price-desc", "capacity-asc", "capacity-desc"].includes(sort)) {
      throw new HttpError(400, "Invalid room catalog sort option.");
    }
    return roomRepo.list({ minimumCapacity, sort });
  },
  listManagement: () => roomRepo.listManagement(),
  get: async (id) => {
    if (!/^[1-9]\d*$/.test(String(id))) throw new HttpError(404, "Room not found.");
    const room = await roomRepo.findById(id);
    if (!room) throw new HttpError(404, "Room not found.");
    return room;
  },
  search: async (filters) => {
    if ((filters.checkIn && !filters.checkOut) || (!filters.checkIn && filters.checkOut)) throw new HttpError(400, "Provide both check-in and check-out dates.");
    if (filters.checkIn && (filters.checkOut <= filters.checkIn || new Date(filters.checkIn) < new Date(new Date().toISOString().slice(0, 10)))) throw new HttpError(400, "Choose valid future check-in and check-out dates.");
    if (filters.guests && (!Number.isInteger(Number(filters.guests)) || Number(filters.guests) < 1)) throw new HttpError(400, "Guest count must be a positive number.");
    return roomRepo.search(filters);
  },
  create: async (data) => {
    validateRoom(data);
    try { return await roomRepo.create(data); } catch (error) { if (error.code === "23505") throw new HttpError(409, "Room number is already in use."); throw error; }
  },
  update: async (id, data) => {
    if (!/^[1-9]\d*$/.test(String(id))) throw new HttpError(404, "Room not found.");
    if (!data || typeof data !== "object" || Array.isArray(data)) throw new HttpError(400, "Invalid room data.");
    const current = await roomRepo.findById(id);
    if (!current) throw new HttpError(404, "Room not found.");
    validateRoom({
      roomTypeId: data.roomTypeId,
      roomNumber: data.roomNumber,
      floor: data.floor,
      status: data.status
    });
    try { return await roomRepo.update(id, data); } catch (error) { if (error.code === "23505") throw new HttpError(409, "Room number is already in use."); throw error; }
  },
  updateStatus: async (id, status) => {
    if (!/^[1-9]\d*$/.test(String(id))) throw new HttpError(404, "Room not found.");
    if (!["available", "occupied", "maintenance", "cleaning"].includes(status)) throw new HttpError(400, "Invalid room status.");
    const room = await roomRepo.updateStatus(id, status);
    if (!room) throw new HttpError(404, "Room not found.");
    return room;
  },
  delete: async (id) => {
    if (!/^[1-9]\d*$/.test(String(id))) throw new HttpError(404, "Room not found.");
    const result = await roomRepo.softDelete(id);
    if (!result) throw new HttpError(404, "Room not found.");
    if (result.hasBookings) throw new HttpError(400, "Room cannot be deleted while it has active or future bookings.");
    return { message: "Room removed successfully." };
  },
  listTypes: () => roomRepo.listTypes(),
  createType: async (data) => { validateRoomType(data); return roomRepo.createType(data); },
  updateType: async (id, data) => {
    const current = (await roomRepo.listTypes()).find((item) => item.roomtypeid === Number(id));
    if (!current) throw new HttpError(404, "Room type not found.");
    validateRoomType({ ...current, ...data });
    return roomRepo.updateType(id, data);
  },
  setTypeImage: async (id, imagePath) => {
    if (!/^[1-9]\d*$/.test(String(id))) throw new HttpError(404, "Room type not found.");
    const current = (await roomRepo.listTypes()).find((item) => item.roomtypeid === Number(id));
    if (!current) throw new HttpError(404, "Room type not found.");
    const result = await roomRepo.setTypeImage(id, imagePath);
    if (!result) throw new HttpError(404, "Room type not found.");
    const previous = String(current.imageurl || "");
    if (previous.startsWith("/uploads/")) {
      const previousFile = path.join(uploadsRoot, previous.slice("/uploads/".length));
      if (previousFile.startsWith(uploadsRoot)) fs.promises.unlink(previousFile).catch(() => {});
    }
    return result;
  },
  deleteType: async (id) => {
    if (await roomRepo.typeHasRooms(id)) throw new HttpError(409, "Room type is assigned to rooms and cannot be removed.");
    try {
      const result = await roomRepo.deleteType(id);
      if (!result) throw new HttpError(404, "Room type not found.");
      return { message: "Room type removed successfully." };
    } catch (error) { if (error.code === "23503") throw new HttpError(409, "Room type is assigned to rooms and cannot be removed."); throw error; }
  }
};
