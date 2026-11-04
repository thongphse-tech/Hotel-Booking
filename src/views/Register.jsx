import { useState } from "react";
import { authController } from "../controllers/authController.js";
import { useLanguage } from "../i18n.js";
import BrandLogo from "./BrandLogo.jsx";

const copy = {
  VI: {
    brandTag: "Đặt phòng & Nghỉ dưỡng cao cấp",
    eyebrow: "NỀN TẢNG NGHỈ DƯỠNG CAO CẤP",
    headline: "Kỳ nghỉ trọn vẹn —\ntừ không gian tinh tế\nđến trải nghiệm đẳng cấp.",
    sub: "Khám phá dịch vụ lưu trú chuẩn 5 sao, quy trình đặt phòng tức thì và những đặc quyền dành riêng cho thành viên STAYORA.",
    trust: "Được tin dùng bởi hơn 10.000+ du khách mỗi tháng.",
    back: "Quay lại đăng nhập",
    taglineRight: "THAM GIA STAYORA",
    title: "Tạo tài khoản",
    subtitle: "Điền thông tin để bắt đầu kỳ nghỉ của bạn.",
    fullNameLabel: "Họ và tên",
    fullNamePlaceholder: "Nhập họ và tên đầy đủ",
    emailLabel: "Email",
    emailPlaceholder: "example@domain.com",
    phoneLabel: "Số điện thoại",
    phonePlaceholder: "Nhập số điện thoại (VD: 0912345678)",
    passwordLabel: "Mật khẩu",
    passwordPlaceholder: "Tối thiểu 8 ký tự (chữ hoa, số, ký tự đặc biệt)",
    confirmPasswordLabel: "Xác nhận mật khẩu",
    confirmPasswordPlaceholder: "Nhập lại mật khẩu",
    agreePrefix: "Tôi đồng ý với",
    termsLink: "Điều khoản dịch vụ",
    agreeAnd: "và",
    privacyLink: "Chính sách bảo mật",
    agreeSuffix: "của STAYORA",
    submit: "Đăng ký",
    submitting: "Đang khởi tạo tài khoản…",
    hasAccount: "Đã có tài khoản?",
    loginLink: "Đăng nhập",
    // Validation messages
    errName: "Họ và tên không được để trống.",
    errEmailEmpty: "Email không được để trống.",
    errEmailInvalid: "Email không đúng định dạng.",
    errPhoneEmpty: "Số điện thoại không được để trống.",
    errPhoneInvalid: "Số điện thoại không hợp lệ (8 - 15 chữ số).",
    errPasswordEmpty: "Mật khẩu không được để trống.",
    errPasswordLength: "Mật khẩu phải có tối thiểu 8 ký tự.",
    errPasswordUpper: "Mật khẩu phải chứa ít nhất 1 chữ cái viết hoa.",
    errPasswordNumber: "Mật khẩu phải chứa ít nhất 1 chữ số.",
    errPasswordSpecial: "Mật khẩu phải chứa ít nhất 1 ký tự đặc biệt (!@#$%...).",
    errConfirmEmpty: "Vui lòng xác nhận lại mật khẩu.",
    errConfirmMismatch: "Mật khẩu xác nhận không khớp.",
    errTerms: "Bạn cần đồng ý với Điều khoản dịch vụ và Chính sách bảo mật.",
    successMsg: "Đăng ký tài khoản thành công! Đang chuyển hướng sang đăng nhập...",
    otpTitle: "Xác minh email",
    otpDescription: "Nhập mã OTP 6 chữ số đã gửi đến email của bạn.",
    otpLabel: "Mã OTP",
    otpPlaceholder: "Nhập mã 6 chữ số",
    otpSubmit: "Xác minh và tiếp tục đăng nhập",
    otpSubmitting: "Đang xác minh…",
    otpSent: "Mã OTP đã được gửi đến email của bạn.",
    otpExisting: "Đăng ký này đã có mã OTP đang chờ. Hãy dùng mã và mật khẩu đã đăng ký trước đó.",
    otpVerified: "Xác minh thành công. Đang chuyển đến trang đăng nhập…",
    resendOtp: "Gửi lại mã OTP",
    resendSent: "Mã OTP mới đã được gửi.",
    editRegistration: "Quay lại thông tin đăng ký",
    otpRequired: "Vui lòng nhập mã OTP 6 chữ số."
  },
  EN: {
    brandTag: "Luxury Hotel & Resort Stays",
    eyebrow: "PREMIUM HOSPITALITY PLATFORM",
    headline: "A refined stay —\nfrom bespoke spaces\nto exquisite experiences.",
    sub: "Discover 5-star hospitality, seamless instant reservations, and exclusive privileges tailored for STAYORA members.",
    trust: "Trusted by over 10,000+ travelers every month.",
    back: "Back to sign in",
    taglineRight: "JOIN STAYORA",
    title: "Create an account",
    subtitle: "Fill in the details to start your luxury holiday.",
    fullNameLabel: "Full name",
    fullNamePlaceholder: "Enter your full name",
    emailLabel: "Email address",
    emailPlaceholder: "example@domain.com",
    phoneLabel: "Phone number",
    phonePlaceholder: "Enter phone number (e.g. 0912345678)",
    passwordLabel: "Password",
    passwordPlaceholder: "Min 8 characters (uppercase, number, special char)",
    confirmPasswordLabel: "Confirm password",
    confirmPasswordPlaceholder: "Re-enter your password",
    agreePrefix: "I agree to the",
    termsLink: "Terms of Service",
    agreeAnd: "and",
    privacyLink: "Privacy Policy",
    agreeSuffix: "of STAYORA",
    submit: "Create account",
    submitting: "Creating account…",
    hasAccount: "Already have an account?",
    loginLink: "Sign in",
    // Validation messages
    errName: "Full name is required.",
    errEmailEmpty: "Email is required.",
    errEmailInvalid: "Email format is invalid.",
    errPhoneEmpty: "Phone number is required.",
    errPhoneInvalid: "Phone number is invalid (8 - 15 digits).",
    errPasswordEmpty: "Password is required.",
    errPasswordLength: "Password must be at least 8 characters.",
    errPasswordUpper: "Password must contain at least 1 uppercase letter.",
    errPasswordNumber: "Password must contain at least 1 number.",
    errPasswordSpecial: "Password must contain at least 1 special character (!@#$%...).",
    errConfirmEmpty: "Please confirm your password.",
    errConfirmMismatch: "Passwords do not match.",
    errTerms: "You must agree to the Terms of Service and Privacy Policy.",
    successMsg: "Account created successfully! Redirecting to sign in...",
    otpTitle: "Verify your email",
    otpDescription: "Enter the 6-digit OTP sent to your email address.",
    otpLabel: "OTP code",
    otpPlaceholder: "Enter the 6-digit code",
    otpSubmit: "Verify and continue to sign in",
    otpSubmitting: "Verifying…",
    otpSent: "An OTP has been sent to your email address.",
    otpExisting: "An OTP is already pending for this registration. Use the code and password from your original registration.",
    otpVerified: "Verification successful. Redirecting to sign in…",
    resendOtp: "Resend OTP",
    resendSent: "A new OTP has been sent.",
    editRegistration: "Back to registration details",
    otpRequired: "Enter the 6-digit OTP."
  }
};

export default function Register({ onNavigateToLogin, onRegisterSuccess }) {
  const [lang, setLang] = useLanguage();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: ""
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");
  const [serverSuccess, setServerSuccess] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");

  const t = copy[lang];

  const toggleLanguage = (selectedLang) => {
    setLang(selectedLang);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
    setServerError("");
  };

  const validateForm = () => {
    const newErrors = {};

    // 1. Họ và tên
    if (!formData.fullName.trim()) {
      newErrors.fullName = t.errName;
    }

    // 2. Email
    if (!formData.email.trim()) {
      newErrors.email = t.errEmailEmpty;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = t.errEmailInvalid;
    }

    // 3. Số điện thoại
    if (!formData.phone.trim()) {
      newErrors.phone = t.errPhoneEmpty;
    } else if (!/^[0-9+() -]{8,15}$/.test(formData.phone.trim())) {
      newErrors.phone = t.errPhoneInvalid;
    }

    // 4. Mật khẩu (BR-05: >= 8 ký tự, 1 hoa, 1 số, 1 ký tự đặc biệt)
    if (!formData.password) {
      newErrors.password = t.errPasswordEmpty;
    } else if (formData.password.length < 8) {
      newErrors.password = t.errPasswordLength;
    } else if (!/[A-Z]/.test(formData.password)) {
      newErrors.password = t.errPasswordUpper;
    } else if (!/\d/.test(formData.password)) {
      newErrors.password = t.errPasswordNumber;
    } else if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(formData.password)) {
      newErrors.password = t.errPasswordSpecial;
    }

    // 5. Xác nhận mật khẩu
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = t.errConfirmEmpty;
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = t.errConfirmMismatch;
    }

    // Checkbox điều khoản
    if (!agreeTerms) {
      newErrors.agreeTerms = t.errTerms;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");
    setServerSuccess("");

    if (otpSent && !/^\d{6}$/.test(otp.trim())) {
      setServerError(t.otpRequired);
      return;
    }
    if (!otpSent && !validateForm()) return;

    setLoading(true);
    try {
      if (otpSent) {
        const response = await authController.verifyRegistrationOtp({
          email: formData.email.trim().toLowerCase(),
          otp: otp.trim()
        });
        setServerSuccess(t.otpVerified);
        if (onRegisterSuccess) setTimeout(() => onRegisterSuccess(response), 900);
      } else {
        const response = await authController.register({
          fullName: formData.fullName.trim(),
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone.trim(),
          password: formData.password,
          confirmPassword: formData.confirmPassword
        });
        setOtpSent(true);
        setServerSuccess(response.existingPending ? t.otpExisting : t.otpSent);
      }
    } catch (err) {
      setServerError(err.message || (lang === "VI" ? "Đăng ký thất bại. Vui lòng kiểm tra lại thông tin." : "Registration failed. Please check your data."));
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setServerError("");
    setServerSuccess("");
    setLoading(true);
    try {
      const response = await authController.resendRegistrationOtp({
        email: formData.email.trim().toLowerCase()
      });
      setServerSuccess(t.resendSent);
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

      {/* CỘT PHẢI - LIGHT THEME FORM ĐĂNG KÝ */}
      <div className="auth-split-form-wrap">
        <div className="auth-form-container">
          <div className="auth-top-action-row">
            <button
              type="button"
              className="auth-back-btn"
              onClick={onNavigateToLogin}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              <span>{t.back}</span>
            </button>

          </div>

          <div className="auth-header-group">
            <span className="auth-tagline-orange">{t.taglineRight}</span>
            <h2 className="auth-form-title">{otpSent ? t.otpTitle : t.title}</h2>
            <p className="auth-form-subtitle">{otpSent ? t.otpDescription : t.subtitle}</p>
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

          {serverSuccess && (
            <div className="auth-alert success">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <span>{serverSuccess}</span>
            </div>
          )}

          <form className="auth-actual-form" onSubmit={handleSubmit} noValidate>
            {!otpSent && <>
            {/* 1. Họ và tên */}
            <div className="auth-field">
              <label htmlFor="fullName">{t.fullNameLabel}</label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                placeholder={t.fullNamePlaceholder}
                value={formData.fullName}
                onChange={handleChange}
                className={errors.fullName ? "input-error" : ""}
                disabled={loading}
              />
              {errors.fullName && <span className="error-text">{errors.fullName}</span>}
            </div>

            {/* 2. Email */}
            <div className="auth-field">
              <label htmlFor="email">{t.emailLabel}</label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder={t.emailPlaceholder}
                value={formData.email}
                onChange={handleChange}
                className={errors.email ? "input-error" : ""}
                disabled={loading}
              />
              {errors.email && <span className="error-text">{errors.email}</span>}
            </div>

            {/* 3. Số điện thoại */}
            <div className="auth-field">
              <label htmlFor="phone">{t.phoneLabel}</label>
              <input
                id="phone"
                name="phone"
                type="tel"
                placeholder={t.phonePlaceholder}
                value={formData.phone}
                onChange={handleChange}
                className={errors.phone ? "input-error" : ""}
                disabled={loading}
              />
              {errors.phone && <span className="error-text">{errors.phone}</span>}
            </div>

            {/* 4. Mật khẩu */}
            <div className="auth-field">
              <label htmlFor="password">{t.passwordLabel}</label>
              <div className="password-input-wrapper">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
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
              {errors.password && <span className="error-text">{errors.password}</span>}
            </div>

            {/* 5. Xác nhận mật khẩu */}
            <div className="auth-field">
              <label htmlFor="confirmPassword">{t.confirmPasswordLabel}</label>
              <div className="password-input-wrapper">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder={t.confirmPasswordPlaceholder}
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={errors.confirmPassword ? "input-error" : ""}
                  disabled={loading}
                />
                <button
                  type="button"
                  className="eye-toggle-btn"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  tabIndex={-1}
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? (
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
              {errors.confirmPassword && <span className="error-text">{errors.confirmPassword}</span>}
            </div>

            {/* Checkbox Đồng ý điều khoản */}
            <div className="auth-terms-row">
              <label className="auth-checkbox-label">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => {
                    setAgreeTerms(e.target.checked);
                    if (errors.agreeTerms) setErrors((prev) => ({ ...prev, agreeTerms: "" }));
                  }}
                  disabled={loading}
                />
                <span>
                  {t.agreePrefix}{" "}
                  <a href="#terms" onClick={(e) => e.preventDefault()} className="orange-link">
                    {t.termsLink}
                  </a>{" "}
                  {t.agreeAnd}{" "}
                  <a href="#privacy" onClick={(e) => e.preventDefault()} className="orange-link">
                    {t.privacyLink}
                  </a>{" "}
                  {t.agreeSuffix}
                </span>
              </label>
              {errors.agreeTerms && <div className="error-text">{errors.agreeTerms}</div>}
            </div>
            </>}

            {otpSent && (
              <>
                <p className="auth-form-subtitle">
                  {t.emailLabel}: <strong>{formData.email.trim().toLowerCase()}</strong>
                </p>
                <div className="auth-field">
                  <label htmlFor="registrationOtp">{t.otpLabel}</label>
                  <input
                    id="registrationOtp"
                    name="registrationOtp"
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
                    disabled={loading}
                    autoFocus
                  />
                </div>
                <button type="button" className="auth-back-btn" onClick={handleResendOtp} disabled={loading}>
                  {t.resendOtp}
                </button>
                <button
                  type="button"
                  className="auth-back-btn"
                  onClick={() => {
                    setOtpSent(false);
                    setOtp("");
                    setServerError("");
                    setServerSuccess("");
                  }}
                  disabled={loading}
                >
                  {t.editRegistration}
                </button>
              </>
            )}

            {/* Nút Submit */}
            <button
              type="submit"
              className="auth-submit-btn"
              disabled={loading}
            >
              {loading ? (
                <span className="btn-loading-flex">
                  <span className="spinner-icon"></span>
                  {otpSent ? t.otpSubmitting : t.submitting}
                </span>
              ) : (
                otpSent ? t.otpSubmit : t.submit
              )}
            </button>
          </form>

          {/* Footer chuyển sang Đăng nhập */}
          <div className="auth-form-footer">
            <span>{t.hasAccount} </span>
            <button
              type="button"
              className="link-to-auth"
              onClick={onNavigateToLogin}
            >
              {t.loginLink}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
