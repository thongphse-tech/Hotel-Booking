import { HttpError } from "../service/httpError.js";
import { customerProfileService } from "../service/customerProfileService.js";

function assertOwnCustomerProfile(req) {
  const customerId = Number(req.params.customerId);
  if (!Number.isSafeInteger(customerId) || customerId <= 0) {
    throw new HttpError(400, "Invalid customer ID.");
  }
  if (customerId !== Number(req.user.customerId)) {
    throw new HttpError(403, "You can only access your own profile.");
  }
  return customerId;
}

export const customerController = {
  getProfile: async (req, res) => {
    const customerId = assertOwnCustomerProfile(req);
    res.json(await customerProfileService.getProfile(customerId, req.user.sub));
  },
  updateProfile: async (req, res) => {
    const customerId = assertOwnCustomerProfile(req);
    res.json(await customerProfileService.updateProfile(customerId, req.user.sub, req.body));
  }
};
