import jwt from "jsonwebtoken";
import { query } from "../config/database.js";

export async function authenticate(req, res, next) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token) return res.status(401).json({ message: "Authentication required." });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    const account = (await query("SELECT role, isactive, tokenversion FROM useraccount WHERE accountid = $1", [req.user.sub])).rows[0];
    if (!account || !account.isactive || Number(account.tokenversion) !== Number(req.user.version)) return res.status(401).json({ message: "Session is no longer valid." });
    req.user.role = account.role;
    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired session." });
  }
}

export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) return res.status(403).json({ message: "You do not have permission to perform this action." });
    next();
  };
}
