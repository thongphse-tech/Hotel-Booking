import { HttpError } from "../service/httpError.js";

export function validateStayDates(checkIn, checkOut) {
  const isValidDate = (value) => {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const parsed = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  };
  if (!isValidDate(checkIn) || !isValidDate(checkOut)) throw new HttpError(400, "Provide valid check-in and check-out dates.");
  if (!checkIn || !checkOut || checkOut <= checkIn) throw new HttpError(400, "Check-out date must be after check-in date.");
  if (checkIn < new Date().toISOString().slice(0, 10)) throw new HttpError(400, "Check-in date cannot be in the past.");
}
