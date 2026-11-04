import { authService } from "../service/authService.js";

export const authController = {
  register: async (req, res) => res.status(201).json(await authService.register(req.body)),
  resendRegistrationOtp: async (req, res) => res.json(await authService.resendRegistrationOtp(req.body)),
  verifyRegistrationOtp: async (req, res) => res.json(await authService.verifyRegistrationOtp(req.body)),
  requestPasswordResetOtp: async (req, res) => res.json(await authService.requestPasswordResetOtp(req.body)),
  verifyPasswordResetOtp: async (req, res) => res.json(await authService.verifyPasswordResetOtp(req.body)),
  resetPasswordWithOtp: async (req, res) => res.json(await authService.resetPasswordWithOtp(req.body)),
  login: async (req, res) => res.json(await authService.login(req.body)),
  logout: async (req, res) => res.json(await authService.logout(req.user.sub)),
  profile: async (req, res) => res.json(await authService.profile(req.user.sub)),
  updateProfile: async (req, res) => res.json(await authService.updateProfile(req.user.sub, req.body)),
  changePassword: async (req, res) => res.json(await authService.changePassword(req.user.sub, req.body))
};
