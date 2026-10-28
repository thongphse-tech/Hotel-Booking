import { hotelServices, users, roomTypes, discountCodes, reviews } from "./mockData.js";
export const catalogRepo = {
  services: () => [...hotelServices],
  customers: () => [...users],
  roomTypes: () => [...roomTypes],
  discounts: () => [...discountCodes],
  reviews: () => [...reviews]
};
