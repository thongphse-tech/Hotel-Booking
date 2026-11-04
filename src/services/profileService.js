import { http } from "./apiClient.js";

export const profileService = {
  getProfile: async (customerId) => {
    const { data } = await http.get(`/customer/profile/${customerId}`);
    return data;
  },
  updateProfile: async (customerId, payload) => {
    const { data } = await http.put(`/customer/profile/${customerId}`, payload);
    return data;
  }
};
