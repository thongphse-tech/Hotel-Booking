import { catalogRepo } from "../repo/catalogRepo.js";
export const catalogService = {
  getServices: () => catalogRepo.services(),
  getCustomers: () => catalogRepo.customers(),
  getRoomTypes: () => catalogRepo.roomTypes(),
  getDiscounts: () => catalogRepo.discounts(),
  getReviews: () => catalogRepo.reviews()
};
