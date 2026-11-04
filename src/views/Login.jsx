import { useState } from "react";
import { authController } from "../controllers/authController.js";
import { useLanguage } from "../i18n.js";
import BrandLogo from "./BrandLogo.jsx";

const copy = {
  VI: {
    brandTag: "Đặt phòng & Nghỉ dưỡng cao cấp",
    eyebrow: "CHÀO MỪNG TRỞ LẠI",
    headline: "Kỳ nghỉ sang trọng —\nphòng đẹp, dịch vụ chu đáo,\nđặt chỗ trong vài phút.",
    sub: "Đăng nhập để quản lý đặt phòng, check-in và nhận những ưu đãi đặc quyền dành riêng cho bạn.",
    trust: "Hệ thống quản lý khách sạn STAYORA · Bảo mật dữ liệu tiêu chuẩn cao.",
    back: "Về trang chủ",
    taglineRight: "HỆ THỐNG STAYORA",
    title: "Đăng nhập",
    subtitle: "Chào mừng bạn quay trở lại STAYORA.",
    emailLabel: "Email hoặc Tên đăng nhập",
    emailPlaceholder: "you@stayease.com hoặc email cá nhân",
    passwordLabel: "Mật khẩu",
    passwordPlaceholder: "••••••••",
    forgot: "Quên mật khẩu?",
    forgotTitle: "Đặt lại mật khẩu",
    forgotSubtitle: "Nhập email đã đăng ký để nhận mã OTP đặt lại mật khẩu.",
    forgotEmail: "Email đã đăng ký",
    forgotEmailPlaceholder: "Nhập email của bạn",
    sendOtp: "Gửi mã OTP",
    otpTitle: "Xác minh mã OTP",
    otpSubtitle: "Nhập mã 6 chữ số đã gửi đến email của bạn.",
    otpLabel: "Mã OTP",
    otpPlaceholder: "Nhập mã OTP 6 chữ số",
    verifyOtp: "Xác minh OTP",
    newPasswordTitle: "Tạo mật khẩu mới",
    newPasswordSubtitle: "Tạo mật khẩu mới và xác nhận để hoàn tất.",
    newPassword: "Mật khẩu mới",
    confirmNewPassword: "Xác nhận mật khẩu mới",
    updatePassword: "Cập nhật mật khẩu",
    backToSignIn: "Quay lại đăng nhập",
    changeEmail: "Đổi email",
    resendOtp: "Gửi lại mã OTP",
    resetRequestSent: "Nếu email thuộc tài khoản đang hoạt động, mã OTP sẽ được gửi đến email đó.",
    resetSuccess: "Mật khẩu đã được cập nhật. Vui lòng đăng nhập bằng mật khẩu mới.",
    passwordRequirements: "Tối thiểu 8 ký tự, gồm chữ hoa, chữ số và ký tự đặc biệt.",
    invalidOtp: "Mã OTP phải gồm 6 chữ số.",
    requiredNewPassword: "Vui lòng nhập mật khẩu mới.",
    passwordMismatch: "Mật khẩu xác nhận không khớp.",
    submit: "Đăng nhập",
    submitting: "Đang đăng nhập…",
    noAccount: "Chưa có tài khoản?",
    createAccount: "Tạo tài khoản",
    requiredEmail: "Vui lòng nhập email hoặc tên đăng nhập.",
    requiredPassword: "Vui lòng nhập mật khẩu."
  },
  EN: {
    brandTag: "Luxury Hotel & Resort Stays",
    eyebrow: "WELCOME BACK",
    headline: "A refined stay —\nthoughtful rooms, seamless booking,\ncomfort in every detail.",
    sub: "Sign in to manage bookings, check-in, and unlock exclusive STAYORA member benefits.",
    trust: "STAYORA hotel management · High-standard data protection.",
    back: "Back to home",
    taglineRight: "STAYORA SYSTEM",
    title: "Sign in",
    subtitle: "Welcome back to STAYORA.",
    emailLabel: "Email or Username",
    emailPlaceholder: "you@stayease.com or your email",
    passwordLabel: "Password",
    passwordPlaceholder: "••••••••",
    forgot: "Forgot password?",
    forgotTitle: "Reset password",
    forgotSubtitle: "Enter your registered email to receive a password reset OTP.",
    forgotEmail: "Registered email",
    forgotEmailPlaceholder: "Enter your email",
    sendOtp: "Send OTP",
    otpTitle: "Verify OTP",
    otpSubtitle: "Enter the 6-digit code sent to your email.",
    otpLabel: "OTP code",
    otpPlaceholder: "Enter the 6-digit OTP",
    verifyOtp: "Verify OTP",
    newPasswordTitle: "Create a new password",
    newPasswordSubtitle: "Choose and confirm your new password to finish.",
    newPassword: "New password",
    confirmNewPassword: "Confirm new password",
    updatePassword: "Update password",
    backToSignIn: "Back to sign in",
    changeEmail: "Change email",
    resendOtp: "Resend OTP",
    resetRequestSent: "If this email belongs to an active account, a reset code will be sent to it.",
    resetSuccess: "Password updated. Please sign in with your new password.",
    passwordRequirements: "At least 8 characters with an uppercase letter, a number, and a special character.",
    invalidOtp: "OTP must contain 6 digits.",
    requiredNewPassword: "Enter your new password.",
    passwordMismatch: "The passwords do not match.",
    submit: "Sign in",
    submitting: "Signing in…",
    noAccount: "Don't have an account?",
    createAccount: "Create account",
    requiredEmail: "Email or username is required.",
    requiredPassword: "Password is required."
  }
};

export default function Login({ onNavigateToRegister, onLoginSuccess, onBackToHome }) {
  const [lang, setLang] = useLanguage();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");
  const [forgotNotice, setForgotNotice] = useState("");
  const [forgotStep, setForgotStep] = useState(null);
  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const t = copy[lang];

  const toggleLanguage = (selectedLang) => {
    setLang(selectedLang);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
    setServerError("");
  };

  const validate = () => {
    const errs = {};
    if (forgotStep === null || forgotStep === "login" || forgotStep === "email") {
      if (!formData.email.trim()) errs.email = t.requiredEmail;
      if ((forgotStep === null || forgotStep === "login") && !formData.password) errs.password = t.requiredPassword;
    } else if (forgotStep === "otp" && !/^\d{6}$/.test(otp)) {
      errs.otp = t.invalidOtp;
    } else if (forgotStep === "reset") {
      if (!newPassword) errs.newPassword = t.requiredNewPassword;
      else if (newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/\d/.test(newPassword) || !/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(newPassword)) errs.newPassword = t.passwordRequirements;
      if (!confirmNewPassword) errs.confirmNewPassword = t.requiredNewPassword;
      else if (newPassword !== confirmNewPassword) errs.confirmNewPassword = t.passwordMismatch;
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setServerError("");
    setForgotNotice("");

    try {
      if (forgotStep === "email") {
        await authController.requestPasswordResetOtp({ email: formData.email.trim().toLowerCase() });
        setForgotStep("otp");
        setForgotNotice(t.resetRequestSent);
        return;
      }
      if (forgotStep === "otp") {
        const result = await authController.verifyPasswordResetOtp({
          email: formData.email.trim().toLowerCase(),
          otp: otp.trim()
        });
        setResetToken(result.resetToken);
        setForgotStep("reset");
        setForgotNotice("");
        return;
      }
      if (forgotStep === "reset") {
        await authController.resetPasswordWithOtp({
          resetToken,
          password: newPassword,
          confirmPassword: confirmNewPassword
        });
        setForgotStep(null);
        setFormData((previous) => ({ ...previous, password: "" }));
        setOtp("");
        setResetToken("");
        setNewPassword("");
        setConfirmNewPassword("");
        setForgotNotice(t.resetSuccess);
        return;
      }
      const identifier = formData.email.trim();
      const session = await authController.login({
        email: identifier,
        username: identifier,
        password: formData.password
      });
      if (onLoginSuccess) {
        onLoginSuccess(session);
      }
    } catch (err) {
      setServerError(err.message || (lang === "VI" ? "Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin." : "Sign in failed. Please verify credentials."));
    } finally {
      setLoading(false);
    }
  };

  const beginPasswordReset = () => {
    setForgotStep("email");
    setForgotNotice("");
    setServerError("");
    setErrors({});
  };

  const returnToSignIn = () => {
    setForgotStep(null);
    setForgotNotice("");
    setServerError("");
    setErrors({});
    setOtp("");
    setResetToken("");
    setNewPassword("");
    setConfirmNewPassword("");
  };

  const resendResetOtp = async () => {
    setLoading(true);
    setServerError("");
    try {
      await authController.requestPasswordResetOtp({ email: formData.email.trim().toLowerCase() });
      setForgotNotice(t.resetRequestSent);
    } catch (err) {
      setServerError(err.message || (lang === "VI" ? "Không thể gửi lại mã OTP." : "Unable to resend the OTP."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-split-layout">
      {/* CỘT TRÁI - GIAO DIỆN DARK VỚI HÌNH ẢNH KHÁCH SẠN VÀ SLOGAN */}
      <div className="auth-split-visual">
        <div className="auth-visual-top">
          <div className="auth-visual-brand">
            <div>
              <BrandLogo />
              <div className="auth-brand-tagline">{t.brandTag}</div>
            </div>
          </div>

          <div className="auth-lang-pill">
            <button
              type="button"
              className={lang === "VI" ? "active" : ""}
              onClick={() => toggleLanguage("VI")}
            >
              VI
            </button>
            <button
              type="button"
              className={lang === "EN" ? "active" : ""}
              onClick={() => toggleLanguage("EN")}
            >
              EN
            </button>
          </div>
        </div>

        <div className="auth-visual-bottom">
          <span className="auth-eyebrow-tag">{t.eyebrow}</span>
          <h1 className="auth-hero-headline">{t.headline}</h1>
          <p className="auth-hero-sub">{t.sub}</p>
          <div className="auth-trust-badge">
            <span className="trust-dot"></span>
            <span>{t.trust}</span>
          </div>
        </div>
      </div>

      {/* CỘT PHẢI - LIGHT THEME FORM */}
      <div className="auth-split-form-wrap">
        <div className="auth-form-container">
          {/* Nút quay lại và thanh chuyển ngôn ngữ phụ (hữu ích cho màn hình nhỏ) */}
          <div className="auth-top-action-row">
            <button
              type="button"
              className="auth-back-btn"
              onClick={forgotStep ? returnToSignIn : onBackToHome}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              <span>{forgotStep ? t.backToSignIn : t.back}</span>
            </button>

          </div>

          <div className="auth-header-group">
            <span className="auth-tagline-orange">{t.taglineRight}</span>
            <h2 className="auth-form-title">
              {forgotStep === "email" ? t.forgotTitle : forgotStep === "otp" ? t.otpTitle : forgotStep === "reset" ? t.newPasswordTitle : t.title}
            </h2>
            <p className="auth-form-subtitle">
              {forgotStep === "email" ? t.forgotSubtitle : forgotStep === "otp" ? t.otpSubtitle : forgotStep === "reset" ? t.newPasswordSubtitle : t.subtitle}
            </p>
          </div>

          {serverError && (
            <div className="auth-alert error">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{serverError}</span>
            </div>
          )}

          {forgotNotice && (
            <div className="auth-alert info">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              <span>{forgotNotice}</span>
            </div>
          )}

          <form className="auth-actual-form" onSubmit={handleSubmit} noValidate>
            {(forgotStep === null || forgotStep === "email") && <div className="auth-field">
              <label htmlFor="login-email">{forgotStep === "email" ? t.forgotEmail : t.emailLabel}</label>
              <input
                id="login-email"
                name="email"
                type={forgotStep === "email" ? "email" : "text"}
                autoComplete={forgotStep === "email" ? "email" : "username"}
                placeholder={forgotStep === "email" ? t.forgotEmailPlaceholder : t.emailPlaceholder}
                value={formData.email}
                onChange={handleChange}
                className={errors.email ? "input-error" : ""}
                disabled={loading}
              />
              {errors.email && <span className="error-text">{errors.email}</span>}
            </div>}

            {(forgotStep === null || forgotStep === "login") && <div className="auth-field">
              <label htmlFor="login-password">{t.passwordLabel}</label>
              <div className="password-input-wrapper">
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder={t.passwordPlaceholder}
                  value={formData.password}
                  onChange={handleChange}
                  className={errors.password ? "input-error" : ""}
                  disabled={loading}
                />
                <button
                  type="button"
                  className="eye-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>

              <div className="auth-field-aux">
                {errors.password ? <span className="error-text">{errors.password}</span> : <span></span>}
                <button
                  type="button"
                  className="auth-forgot-btn"
                  onClick={beginPasswordReset}
                >
                  {t.forgot}
                </button>
              </div>
            </div>}

            {forgotStep === "otp" && (
              <>
                <div className="auth-field">
                  <label htmlFor="password-reset-otp">{t.otpLabel}</label>
                  <input
                    id="password-reset-otp"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    placeholder={t.otpPlaceholder}
                    value={otp}
                    onChange={(event) => {
                      setOtp(event.target.value.replace(/\D/g, "").slice(0, 6));
                      setServerError("");
                    }}
                    className={errors.otp ? "input-error" : ""}
                    disabled={loading}
                  />
                  {errors.otp && <span className="error-text">{errors.otp}</span>}
                </div>
                <div className="auth-field-aux">
                  <button type="button" className="auth-forgot-btn" onClick={resendResetOtp} disabled={loading}>{t.resendOtp}</button>
                  <button type="button" className="auth-forgot-btn" onClick={() => {
                    setForgotStep("email");
                    setForgotNotice("");
                    setServerError("");
                  }}>{t.changeEmail}</button>
                </div>
              </>
            )}

            {forgotStep === "reset" && (
              <>
                <div className="auth-field">
                  <label htmlFor="new-password">{t.newPassword}</label>
                  <input
                    id="new-password"
                    type="password"
                    autoComplete="new-password"
                    placeholder={t.passwordPlaceholder}
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    className={errors.newPassword ? "input-error" : ""}
                    disabled={loading}
                  />
                  {errors.newPassword && <span className="error-text">{errors.newPassword}</span>}
                </div>
                <div className="auth-field">
                  <label htmlFor="confirm-new-password">{t.confirmNewPassword}</label>
                  <input
                    id="confirm-new-password"
                    type="password"
                    autoComplete="new-password"
                    placeholder={t.passwordPlaceholder}
                    value={confirmNewPassword}
                    onChange={(event) => setConfirmNewPassword(event.target.value)}
                    className={errors.confirmNewPassword ? "input-error" : ""}
                    disabled={loading}
                  />
                  {errors.confirmNewPassword && <span className="error-text">{errors.confirmNewPassword}</span>}
                </div>
              </>
            )}

            <button type="submit" className="auth-submit-btn" disabled={loading}>
              {loading ? (
                <span className="btn-loading-flex">
                  <span className="spinner-icon"></span>
                  {forgotStep === "email" ? t.sendOtp : forgotStep === "otp" ? t.verifyOtp : forgotStep === "reset" ? t.updatePassword : t.submitting}
                </span>
              ) : (
                forgotStep === "email" ? t.sendOtp : forgotStep === "otp" ? t.verifyOtp : forgotStep === "reset" ? t.updatePassword : t.submit
              )}
            </button>
          </form>

          {forgotStep === null && <div className="auth-form-footer">
            <span>{t.noAccount}</span>
            <button
              type="button"
              className="link-to-auth"
              onClick={onNavigateToRegister}
            >
              {t.createAccount}
            </button>
          </div>}
        </div>
      </div>
    </div>
  );
}
