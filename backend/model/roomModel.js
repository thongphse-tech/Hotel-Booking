import { HttpError } from "../service/httpError.js";

export function validateRoom(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new HttpError(400, "Invalid room data.");
  const { roomTypeId, roomNumber, floor, status } = data;
  if (!Number.isInteger(Number(roomTypeId)) || Number(roomTypeId) < 1 || !String(roomNumber || "").trim()) throw new HttpError(400, "Room type and room number are required.");
  if (!Number.isInteger(Number(floor)) || Number(floor) < 0) throw new HttpError(400, "Floor must be a non-negative whole number.");
  if (status && !["available", "occupied", "maintenance", "cleaning"].includes(status)) throw new HttpError(400, "Invalid room status.");
}

export function validateRoomType({ name, price, capacity }) {
  if (!String(name || "").trim() || !Number.isFinite(Number(price)) || Number(price) < 0 || !Number.isInteger(Number(capacity)) || Number(capacity) <= 0) throw new HttpError(400, "Room type requires a name, a non-negative price, and a positive capacity.");
}
