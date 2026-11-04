import { apiClient, http } from "./apiClient.js";

export const authService = {
  login: async (payload) => {
    const { data } = await http.post("/auth/login", payload);
    return data;
  },
  register: (payload) => apiClient.request("/auth/register", { method: "POST", body: JSON.stringify(payload) }),
  resendRegistrationOtp: (payload) => apiClient.request("/auth/register/resend-otp", { method: "POST", body: JSON.stringify(payload) }),
  verifyRegistrationOtp: (payload) => apiClient.request("/auth/register/verify-otp", { method: "POST", body: JSON.stringify(payload) }),
  requestPasswordResetOtp: (payload) => apiClient.request("/auth/password-reset/request-otp", { method: "POST", body: JSON.stringify(payload) }),
  verifyPasswordResetOtp: (payload) => apiClient.request("/auth/password-reset/verify-otp", { method: "POST", body: JSON.stringify(payload) }),
  resetPasswordWithOtp: (payload) => apiClient.request("/auth/password-reset/reset", { method: "POST", body: JSON.stringify(payload) }),
  logout: async () => {
    try { await http.post("/auth/logout"); }
    finally { apiClient.clearSession(); }
  }
};
