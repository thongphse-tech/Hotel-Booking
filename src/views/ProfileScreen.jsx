import { useEffect, useState } from "react";
import { profileService } from "../services/profileService.js";
import LanguageToggle from "./LanguageToggle.jsx";
import { useLanguage } from "../i18n.js";

const emptyForm = {
  fullName: "",
  phone: "",
  address: "",
  currentPassword: "",
  newPassword: "",
  confirmPassword: ""
};

function validateForm(form, vi) {
  const errors = {};
  const phone = form.phone.trim();
  const passwordChangeRequested = Boolean(
    form.currentPassword || form.newPassword || form.confirmPassword
  );

  if (!phone || !/^[0-9+() -]{8,20}$/.test(phone)) {
    errors.phone = vi ? "Vui lòng nhập số điện thoại hợp lệ." : "Please enter a valid phone number.";
  }

  if (passwordChangeRequested) {
    if (!form.currentPassword) {
      errors.currentPassword = vi ? "Vui lòng nhập mật khẩu hiện tại." : "Enter your current password.";
    }
    if (
      form.newPassword.length < 8 ||
      !/[A-Z]/.test(form.newPassword) ||
      !/\d/.test(form.newPassword) ||
      !/[^A-Za-z0-9]/.test(form.newPassword)
    ) {
      errors.newPassword = vi
        ? "Mật khẩu phải có ít nhất 8 ký tự, gồm chữ hoa, số và ký tự đặc biệt."
        : "Use at least 8 characters, including an uppercase letter, a number, and a special character.";
    }
    if (form.newPassword !== form.confirmPassword) {
      errors.confirmPassword = vi ? "Xác nhận mật khẩu không khớp." : "Password confirmation does not match.";
    }
  }

  if (!form.fullName.trim()) {
    errors.fullName = vi ? "Vui lòng nhập họ và tên." : "Full name is required.";
  }

  return errors;
}

export default function ProfileScreen({ user, onProfileUpdated, onCancel }) {
  const [language] = useLanguage();
  const vi = language === "VI";
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;

    profileService.getProfile(user.customerId)
      .then((data) => {
        if (!active) return;
        const initialForm = {
          ...emptyForm,
          fullName: data.fullName || "",
          phone: data.phone || "",
          address: data.address || ""
        };
        setProfile(data);
        setForm(initialForm);
      })
      .catch((error) => {
        if (!active) return;
        setMessage(error.message || (vi ? "Không thể tải hồ sơ." : "Unable to load your profile."));
        setMessageType("error");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user.customerId]);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: "" }));
    setMessage("");
  }

  function cancelChanges() {
    if (profile) {
      setForm({
        ...emptyForm,
        fullName: profile.fullName || "",
        phone: profile.phone || "",
        address: profile.address || ""
      });
    } else {
      setForm(emptyForm);
    }
    setErrors({});
    setMessage("");
  }

  async function saveChanges(event) {
    event.preventDefault();
    const nextErrors = validateForm(form, vi);
    setErrors(nextErrors);
    setMessage("");
    if (Object.keys(nextErrors).length) return;

    const passwordChangeRequested = Boolean(
      form.currentPassword || form.newPassword || form.confirmPassword
    );
    const payload = {
      fullName: form.fullName.trim(),
      phone: form.phone.trim(),
      address: form.address.trim()
    };
    if (passwordChangeRequested) {
      payload.currentPassword = form.currentPassword;
      payload.newPassword = form.newPassword;
      payload.confirmPassword = form.confirmPassword;
    }

    setSaving(true);
    try {
      const updatedProfile = await profileService.updateProfile(user.customerId, payload);
      setProfile(updatedProfile);
      setForm({
        ...emptyForm,
        fullName: updatedProfile.fullName || "",
        phone: updatedProfile.phone || "",
        address: updatedProfile.address || ""
      });
      setErrors({});
      setMessage("Hồ sơ đã được cập nhật thành công");
      setMessageType("success");
      onProfileUpdated(updatedProfile);
    } catch (error) {
      if (error.message === "Current password does not match.") {
        setErrors((current) => ({
          ...current,
          currentPassword: error.message
        }));
      }
      setMessage(error.message || (vi ? "Không thể cập nhật hồ sơ." : "Unable to update your profile."));
      setMessageType("error");
    } finally {
      setSaving(false);
    }
  }

  function renderFieldError(name) {
    return errors[name] ? <span className="profile-field-error">{errors[name]}</span> : null;
  }

  return (
    <main className="profile-screen">
      <div className="page-language-toggle"><LanguageToggle /></div>
      <header className="profile-heading">
        <p className="eyebrow">{vi ? "CÀI ĐẶT TÀI KHOẢN" : "ACCOUNT SETTINGS"}</p>
        <h1 className="page-title">{vi ? "Hồ sơ cá nhân" : "My Profile"}</h1>
        <p>{vi ? "Quản lý thông tin cá nhân và mật khẩu." : "Manage your personal information and password."}</p>
      </header>

      {message && (
        <div className={`profile-banner ${messageType}`} role="status">
          {message}
        </div>
      )}

      {loading ? (
        <p className="hint" role="status">{vi ? "Đang tải hồ sơ…" : "Loading your profile…"}</p>
      ) : !profile ? (
        <button className="outline-btn" type="button" onClick={onCancel}>
          {vi ? "Về trang chủ" : "Back to Home"}
        </button>
      ) : (
        <form className="profile-form" onSubmit={saveChanges} noValidate>
          <section className="profile-card" aria-labelledby="personal-info-heading">
            <div className="profile-card-heading">
              <h2 id="personal-info-heading">{vi ? "Thông tin cá nhân" : "Personal information"}</h2>
              <p>{vi ? "Cập nhật thông tin liên hệ của bạn." : "Keep your contact details up to date."}</p>
            </div>

            <label>
              {vi ? "Địa chỉ email" : "Email address"}
              <input type="email" value={profile?.email || ""} readOnly />
              <span className="profile-field-hint">{vi ? "Không thể thay đổi email tại đây." : "Email address cannot be changed here."}</span>
            </label>

            <label>
              {vi ? "Họ và tên" : "Full name"}
              <input
                name="fullName"
                value={form.fullName}
                onChange={updateField}
                autoComplete="name"
                aria-invalid={Boolean(errors.fullName)}
              />
              {renderFieldError("fullName")}
            </label>

            <label>
              {vi ? "Số điện thoại" : "Phone number"}
              <input
                name="phone"
                type="tel"
                value={form.phone}
                onChange={updateField}
                autoComplete="tel"
                aria-invalid={Boolean(errors.phone)}
              />
              {renderFieldError("phone")}
            </label>

            <label>
              {vi ? "Địa chỉ" : "Address"}
              <input
                name="address"
                value={form.address}
                onChange={updateField}
                autoComplete="street-address"
              />
            </label>
          </section>

          <section className="profile-card" aria-labelledby="password-heading">
            <div className="profile-card-heading">
              <h2 id="password-heading">{vi ? "Đổi mật khẩu" : "Change password"}</h2>
              <p>{vi ? "Để trống nếu bạn không muốn đổi mật khẩu." : "Leave these fields blank if you do not want to change your password."}</p>
            </div>

            <label>
              {vi ? "Mật khẩu hiện tại" : "Current password"}
              <input
                name="currentPassword"
                type="password"
                value={form.currentPassword}
                onChange={updateField}
                autoComplete="current-password"
                aria-invalid={Boolean(errors.currentPassword)}
              />
              {renderFieldError("currentPassword")}
            </label>

            <label>
              {vi ? "Mật khẩu mới" : "New password"}
              <input
                name="newPassword"
                type="password"
                value={form.newPassword}
                onChange={updateField}
                autoComplete="new-password"
                aria-invalid={Boolean(errors.newPassword)}
              />
              {renderFieldError("newPassword")}
            </label>

            <label>
              {vi ? "Xác nhận mật khẩu mới" : "Confirm new password"}
              <input
                name="confirmPassword"
                type="password"
                value={form.confirmPassword}
                onChange={updateField}
                autoComplete="new-password"
                aria-invalid={Boolean(errors.confirmPassword)}
              />
              {renderFieldError("confirmPassword")}
            </label>
          </section>

          <div className="profile-actions">
            <button className="outline-btn" type="button" onClick={cancelChanges}>
              {vi ? "Hủy" : "Cancel"}
            </button>
            <button className="primary-btn" type="submit" disabled={saving}>
              {saving ? (vi ? "Đang lưu…" : "Saving…") : (vi ? "Lưu thay đổi" : "Save Changes")}
            </button>
            <button className="text-btn" type="button" onClick={onCancel}>
              {vi ? "Về trang chủ" : "Back to Home"}
            </button>
          </div>
        </form>
      )}
    </main>
  );
}
