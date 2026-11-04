export const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

export function validatePassword(password) {
  return typeof password === "string" && password.length >= 8 && /[A-Z]/.test(password) && /\d/.test(password) && /[^A-Za-z0-9]/.test(password);
}

export function validatePhone(phone) {
  if (!phone || typeof phone !== "string") return false;
  const trimmed = phone.trim();
  return /^[0-9+() -]{8,20}$/.test(trimmed);
}

