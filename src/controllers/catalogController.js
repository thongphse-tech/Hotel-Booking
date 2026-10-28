import { catalogService } from "../services/catalogService.js";
export const catalogController = {
  services: () => catalogService.getServices(),
  customers: () => catalogService.getCustomers(),
  roomTypes: () => catalogService.getRoomTypes(),
  discounts: () => catalogService.getDiscounts(),
  reviews: () => catalogService.getReviews()
};
