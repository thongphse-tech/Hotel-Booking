import { authService } from "../services/authService.js";
import { apiClient } from "../services/apiClient.js";

function persistSession(session) {
  if (!session?.token || !session?.user) {
    throw new Error("Login response is missing token or user information.");
  }
  apiClient.setSession(session);
  return session;
}

export const authController = {
  login: async (payload) => persistSession(await authService.login(payload)),
  register: (payload) => authService.register(payload),
  resendRegistrationOtp: (payload) => authService.resendRegistrationOtp(payload),
  verifyRegistrationOtp: (payload) => authService.verifyRegistrationOtp(payload),
  requestPasswordResetOtp: (payload) => authService.requestPasswordResetOtp(payload),
  verifyPasswordResetOtp: (payload) => authService.verifyPasswordResetOtp(payload),
  resetPasswordWithOtp: (payload) => authService.resetPasswordWithOtp(payload),
  logout: () => authService.logout()
};
