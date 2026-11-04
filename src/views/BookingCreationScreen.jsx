import { useEffect, useMemo, useState } from "react";
import { catalogController } from "../controllers/catalogController.js";
import { bookingController } from "../controllers/bookingController.js";
import LanguageToggle from "./LanguageToggle.jsx";
import { useLanguage } from "../i18n.js";
import { translateCatalog } from "../i18n.js";
import "./booking-creation.css";

const money = (value) => new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0
}).format(Number(value || 0));

function stayNights(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 0;
  const start = Date.parse(`${checkIn}T00:00:00Z`);
  const end = Date.parse(`${checkOut}T00:00:00Z`);
  const nights = Math.round((end - start) / 86_400_000);
  return Number.isFinite(nights) && nights > 0 ? nights : 0;
}

export default function BookingCreationScreen({ room, search, user, onCancel, onProceedToPayment }) {
  const [language] = useLanguage();
  const vi = language === "VI";
  const [form, setForm] = useState({
    guestName: user?.fullName || "",
    contactPhone: user?.phone || "",
    checkIn: search?.checkIn || "",
    checkOut: search?.checkOut || "",
    guests: search?.guests || "1",
    specialRequests: "",
    codeString: ""
  });
  const [discount, setDiscount] = useState(null);
  const [availableDiscounts, setAvailableDiscounts] = useState([]);
  const [discountsLoading, setDiscountsLoading] = useState(true);
  const [discountsError, setDiscountsError] = useState("");
  const [errors, setErrors] = useState({});
  const [notice, setNotice] = useState("");
  const [validatingCode, setValidatingCode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createdBooking, setCreatedBooking] = useState(null);

  useEffect(() => {
    let active = true;
    setDiscountsLoading(true);
    setDiscountsError("");
    catalogController.availableDiscounts(room.roomTypeId)
      .then((items) => {
        if (active) setAvailableDiscounts(items);
      })
      .catch((error) => {
        if (active) setDiscountsError(`${vi ? "Không thể tải mã giảm giá" : "Unable to load discount codes"}: ${error.message}`);
      })
      .finally(() => {
        if (active) setDiscountsLoading(false);
      });
    return () => { active = false; };
  }, [room.roomTypeId, vi]);

  const nights = stayNights(form.checkIn, form.checkOut);
  const basePrice = Number(room?.price || 0);
  const subtotal = basePrice * nights;
  const discountAmount = discount
    ? discount.discountType === "fixed"
      ? Math.min(Number(discount.discountValue), subtotal)
      : subtotal * Number(discount.discountValue) / 100
    : 0;
  const total = Math.max(0, subtotal - discountAmount);
  const today = new Date();
  const minDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const discountDescription = useMemo(
    () => discount
      ? `${discount.codeString} · ${discount.discountType === "fixed" ? `${money(discount.discountValue)} off` : `${discount.discountValue}% off`}`
      : "",
    [discount]
  );

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
    if (field === "codeString") setDiscount(null);
    setNotice("");
  }

  async function applyCode() {
    const code = form.codeString.trim();
    if (!code) {
      setDiscount(null);
      setNotice(vi ? "Vui lòng nhập mã giảm giá." : "Enter a discount code.");
      return;
    }
    setValidatingCode(true);
    setNotice("");
    try {
      const result = await catalogController.validateDiscount(code, room.roomTypeId);
      setDiscount({
        codeId: result.codeid,
        codeString: result.codestring,
        discountType: result.discounttype || "percentage",
        discountValue: Number(result.discountvalue)
      });
    } catch (error) {
      setDiscount(null);
      setNotice([400, 404].includes(error.status)
        ? (vi ? "Mã giảm giá không hợp lệ hoặc đã hết hạn." : "Invalid or expired discount code")
        : `${vi ? "Không thể kiểm tra mã giảm giá" : "Unable to validate discount code"}: ${error.message}`);
    } finally {
      setValidatingCode(false);
    }
  }

  function validateForm() {
    const next = {};
    if (!form.guestName.trim()) next.guestName = vi ? "Vui lòng nhập họ và tên." : "Name is required.";
    if (!form.contactPhone.trim()) next.contactPhone = vi ? "Vui lòng nhập số điện thoại." : "Contact phone is required.";
    else if (!/^[0-9+() -]{8,20}$/.test(form.contactPhone.trim())) next.contactPhone = vi ? "Vui lòng nhập số điện thoại hợp lệ." : "Enter a valid phone number.";
    if (!form.checkIn) next.checkIn = vi ? "Vui lòng chọn ngày nhận phòng." : "Check-in date is required.";
    if (!form.checkOut) next.checkOut = vi ? "Vui lòng chọn ngày trả phòng." : "Check-out date is required.";
    else if (form.checkOut <= form.checkIn) next.checkOut = vi ? "Ngày trả phòng phải sau ngày nhận phòng." : "Check-out must be after check-in.";
    if (form.checkIn && form.checkIn < minDate) next.checkIn = vi ? "Ngày nhận phòng không được ở quá khứ." : "Check-in date cannot be in the past.";
    if (Number(form.guests) < 1 || Number(form.guests) > Number(room.capacity)) next.guests = vi ? `Nhập từ 1 đến ${room.capacity} khách.` : `Enter 1 to ${room.capacity} guests.`;
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submitBooking(event) {
    event.preventDefault();
    if (!validateForm()) return;
    setSubmitting(true);
    setNotice("");
    try {
      const booking = await bookingController.create({
        roomId: room.id,
        checkIn: form.checkIn,
        checkOut: form.checkOut,
        guests: Number(form.guests),
        codeString: discount?.codeString || "",
        guestName: form.guestName.trim(),
        contactPhone: form.contactPhone.trim(),
        specialRequests: form.specialRequests.trim()
      });
      setCreatedBooking(booking);
      setNotice(vi ? `Đã tạo đặt phòng #${booking.id}. Vui lòng thanh toán trong 15 phút để giữ phòng.` : `Booking #${booking.id} created successfully. Complete payment within 15 minutes to hold this room.`);
    } catch (error) {
      if (error.status === 409) {
        setNotice(vi ? "Phòng đã chọn không còn trống. Vui lòng chọn phòng khác." : "Selected room is no longer available. Please choose another room.");
      } else {
        setNotice(error.message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="page-content booking-create-page">
      <div className="page-language-toggle"><LanguageToggle /></div>
      <button className="booking-back-link" type="button" onClick={onCancel}>← {vi ? "Quay lại danh sách phòng" : "Back to rooms"}</button>
      <p className="eyebrow">{vi ? "KỲ NGHỈ THEO CÁCH CỦA BẠN" : "YOUR STAY, YOUR WAY"}</p>
      <h1 className="page-title">{vi ? "Hoàn tất đặt phòng" : "Complete your booking"}</h1>

      {createdBooking ? (
        <section className="booking-created-card" aria-live="polite">
          <div className="booking-created-check" aria-hidden="true">✓</div>
          <p className="eyebrow">{vi ? "ĐÃ TẠO ĐẶT PHÒNG" : "BOOKING CREATED"}</p>
          <h2>Booking #{createdBooking.id}</h2>
          <p>{notice}</p>
          <p className="booking-hold-note">{vi ? "Phòng sẽ được giữ trong 15 phút nếu chưa hoàn tất thanh toán." : "This room hold expires 15 minutes after booking if payment is not completed."}</p>
          <div className="booking-created-actions">
            <button type="button" className="outline-btn" onClick={onCancel}>{vi ? "Quay lại danh sách phòng" : "Back to rooms"}</button>
            <button type="button" className="primary-btn" onClick={() => onProceedToPayment(createdBooking)}>{vi ? "Tiến hành thanh toán" : "Proceed to Payment"}</button>
          </div>
        </section>
      ) : (
        <form className="booking-create-layout" onSubmit={submitBooking} noValidate>
          <section className="booking-create-card">
            <h2>{vi ? "Thông tin khách và lưu trú" : "Guest and stay details"}</h2>
            <div className="booking-room-summary">
              <img src={room.imagePreview || room.image} alt={`${translateCatalog(room.type, language)} room`} />
              <div>
                <span className="booking-room-type">{translateCatalog(room.type, language)}</span>
                <strong>Room {room.roomNumber}</strong>
                <span>{vi ? "Giá cơ bản" : "Base price"} {money(basePrice)} {vi ? "/ đêm" : "/ night"}</span>
              </div>
            </div>

            <div className="booking-form-grid">
              <label className={errors.guestName ? "booking-field has-error" : "booking-field"}>
                {vi ? "Họ và tên" : "Full name"}
                <input value={form.guestName} onChange={(event) => updateField("guestName", event.target.value)} autoComplete="name" aria-invalid={Boolean(errors.guestName)} />
                {errors.guestName && <span className="booking-field-error">{errors.guestName}</span>}
              </label>
              <label className={errors.contactPhone ? "booking-field has-error" : "booking-field"}>
                {vi ? "Số điện thoại liên hệ" : "Contact phone"}
                <input type="tel" value={form.contactPhone} onChange={(event) => updateField("contactPhone", event.target.value)} autoComplete="tel" aria-invalid={Boolean(errors.contactPhone)} />
                {errors.contactPhone && <span className="booking-field-error">{errors.contactPhone}</span>}
              </label>
              <label className={errors.checkIn ? "booking-field has-error" : "booking-field"}>
                Check-in
                <input type="date" min={minDate} value={form.checkIn} onChange={(event) => updateField("checkIn", event.target.value)} aria-invalid={Boolean(errors.checkIn)} />
                {errors.checkIn && <span className="booking-field-error">{errors.checkIn}</span>}
              </label>
              <label className={errors.checkOut ? "booking-field has-error" : "booking-field"}>
                Check-out
                <input type="date" min={form.checkIn || minDate} value={form.checkOut} onChange={(event) => updateField("checkOut", event.target.value)} aria-invalid={Boolean(errors.checkOut)} />
                {errors.checkOut && <span className="booking-field-error">{errors.checkOut}</span>}
              </label>
              <label className={errors.guests ? "booking-field has-error" : "booking-field"}>
                {vi ? "Số khách" : "Guests"}
                <input type="number" min="1" max={room.capacity} value={form.guests} onChange={(event) => updateField("guests", event.target.value)} aria-invalid={Boolean(errors.guests)} />
                {errors.guests && <span className="booking-field-error">{errors.guests}</span>}
              </label>
              <label className="booking-field booking-special-requests">
                {vi ? "Yêu cầu đặc biệt" : "Special requests"} <span className="booking-optional">({vi ? "không bắt buộc" : "optional"})</span>
                <textarea maxLength="2000" rows="3" value={form.specialRequests} onChange={(event) => updateField("specialRequests", event.target.value)} placeholder={vi ? "Hãy cho chúng tôi biết cách làm kỳ nghỉ của bạn đặc biệt hơn." : "Let us know how we can make your stay special."} />
              </label>
            </div>

            <div className="booking-discount-field">
              <label className="booking-field" htmlFor="booking-discount-code">{vi ? "Mã giảm giá" : "Discount code"}</label>
              <div className="booking-code-entry">
                <select id="booking-discount-code" value={form.codeString} onChange={(event) => updateField("codeString", event.target.value)} disabled={Boolean(discount) || discountsLoading || availableDiscounts.length === 0}>
                  <option value="">{discountsLoading ? (vi ? "Đang tải mã…" : "Loading codes…") : (vi ? "Chọn mã giảm giá" : "Select a discount code")}</option>
                  {availableDiscounts.map((item) => (
                    <option key={item.id} value={item.codeString}>
                      {item.codeString} · {item.discountType === "fixed" ? money(item.discountValue) : `${item.discountValue}%`} · {vi ? "đến" : "until"} {item.validTo}
                    </option>
                  ))}
                </select>
                {discount ? (
                  <button type="button" className="outline-btn" onClick={() => { setDiscount(null); setForm({ ...form, codeString: "" }); }}>{vi ? "Xóa" : "Remove"}</button>
                ) : (
                  <button type="button" className="outline-btn" onClick={applyCode} disabled={validatingCode || !form.codeString}>{validatingCode ? (vi ? "Đang kiểm tra…" : "Checking...") : (vi ? "Áp dụng mã" : "Apply Code")}</button>
                )}
              </div>
              {discountsError && <p className="booking-inline-notice" role="alert">{discountsError}</p>}
              {!discountsLoading && !discountsError && availableDiscounts.length === 0 && <p className="booking-discount-empty">{vi ? "Hiện không có mã giảm giá áp dụng cho hạng phòng này." : "No discount codes are currently available for this room type."}</p>}
              {discount && <p className="booking-discount-success">{discountDescription} applied.</p>}
            </div>
          </section>

          <aside className="booking-order-card">
            <h2>{vi ? "Tóm tắt đơn đặt phòng" : "Order summary"}</h2>
            <div className="booking-order-room"><span>{translateCatalog(room.type, language)} · {vi ? "Phòng" : "Room"} {room.roomNumber}</span><strong>{money(basePrice)} / {vi ? "đêm" : "night"}</strong></div>
            <div className="booking-order-line"><span>{vi ? "Thời gian lưu trú" : "Stay length"}</span><strong>{nights || "—"} {nights === 1 ? (vi ? "đêm" : "night") : (vi ? "đêm" : "nights")}</strong></div>
            <div className="booking-order-line"><span>{vi ? "Tiền phòng" : "Room subtotal"}</span><strong>{money(subtotal)}</strong></div>
            <div className="booking-order-line booking-discount-line"><span>{vi ? "Giảm giá" : "Discount"}{discount ? ` (${discount.discountType === "fixed" ? money(discount.discountValue) : `${discount.discountValue}%`})` : ""}</span><strong>− {money(discountAmount)}</strong></div>
            <div className="booking-order-total"><span>{vi ? "Tổng cộng" : "Grand total"}</span><strong>{money(total)}</strong></div>
            {notice && <div className={discount || createdBooking ? "booking-inline-notice success" : "booking-inline-notice"} role="alert">{notice}</div>}
            <button className="primary-btn full" type="submit" disabled={submitting}>{submitting ? (vi ? "Đang tạo đặt phòng…" : "Creating booking...") : (vi ? "Xác nhận đặt phòng" : "Confirm Booking")}</button>
            <button className="booking-cancel-link" type="button" onClick={onCancel}>{vi ? "Hủy" : "Cancel"}</button>
            <p className="booking-hold-note">{vi ? "Phòng sẽ được giữ trong 15 phút sau khi xác nhận." : "The room will be held for 15 minutes after confirmation."}</p>
          </aside>
        </form>
      )}
    </main>
  );
}
