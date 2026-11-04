import bcrypt from "bcryptjs";
import { pool } from "../config/database.js";
import { userRepo } from "../repo/userRepo.js";
import { HttpError } from "./httpError.js";
import { validatePassword, validatePhone } from "../model/userModel.js";

const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

function validateProfileInput(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new HttpError(400, "Invalid profile data.");
  }

  const fullName = String(data.fullName || "").trim();
  const phone = String(data.phone || "").trim();
  const address = String(data.address || "").trim();

  if (!fullName) throw new HttpError(400, "Full name is required.");
  if (fullName.length > 100) throw new HttpError(400, "Full name must be 100 characters or fewer.");
  if (!validatePhone(phone)) throw new HttpError(400, "Enter a valid phone number.");
  if (address.length > 255) throw new HttpError(400, "Address must be 255 characters or fewer.");
  if (hasOwn(data, "email")) {
    throw new HttpError(400, "Email address cannot be changed here.");
  }

  return { fullName, phone, address: address || null };
}

export const customerProfileService = {
  getProfile: async (customerId, accountId) => {
    const profile = await userRepo.findCustomerProfile(customerId, accountId);
    if (!profile) throw new HttpError(404, "Customer profile not found.");
    return profile;
  },

  updateProfile: async (customerId, accountId, data = {}) => {
    const profileData = validateProfileInput(data);
    const passwordFields = ["currentPassword", "newPassword", "confirmPassword"];
    const passwordChangeRequested = passwordFields.some((field) => hasOwn(data, field));

    if (passwordChangeRequested) {
      if (passwordFields.some((field) => typeof data[field] !== "string" || !data[field])) {
        throw new HttpError(400, "Current password, new password, and confirmation are required.");
      }
      if (!validatePassword(data.newPassword)) {
        throw new HttpError(400, "Password must be at least 8 characters and include an uppercase letter, a number, and a special character.");
      }
      if (data.newPassword !== data.confirmPassword) {
        throw new HttpError(400, "Password confirmation does not match.");
      }
    }

    const client = await pool.connect();
    let transactionStarted = false;
    try {
      await client.query("BEGIN");
      transactionStarted = true;
      const current = await userRepo.findCustomerProfileForUpdate(client, customerId, accountId);
      if (!current) throw new HttpError(404, "Customer profile not found.");

      let passwordHash;
      if (passwordChangeRequested) {
        if (!(await bcrypt.compare(data.currentPassword, current.passwordhash))) {
          throw new HttpError(400, "Current password does not match.");
        }
        if (await bcrypt.compare(data.newPassword, current.passwordhash)) {
          throw new HttpError(400, "New password must be different from the current password.");
        }
        passwordHash = await bcrypt.hash(data.newPassword, 12);
      }

      const updatedProfile = await userRepo.updateCustomerProfile(
        client,
        customerId,
        accountId,
        profileData
      );
      if (passwordHash) {
        await userRepo.updatePasswordWithClient(client, accountId, passwordHash);
      }
      await client.query("COMMIT");
      transactionStarted = false;

      return {
        ...updatedProfile,
        message: "Profile updated successfully."
      };
    } catch (error) {
      if (transactionStarted) await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
};
