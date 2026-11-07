import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import { bookingController } from "../controllers/bookingController.js";
import LanguageToggle from "./LanguageToggle.jsx";
import { useLanguage } from "../i18n.js";
import "./payment-screen.css";

const HOLD_DURATION_MS = 15 * 60 * 1000;

const money = (value) => new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0
}).format(Number(value || 0));

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

export default function PaymentScreen({ booking, onCancel, onExpired, onPaymentComplete, onDone }) {
  const [language] = useLanguage();
  const vi = language === "VI";
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [paymentRequest, setPaymentRequest] = useState(null);
  const [payment, setPayment] = useState(null);
  const [error, setError] = useState("");
  const [syncError, setSyncError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const expiryHandled = useRef(false);
  const redirectTimer = useRef(null);
  const onExpiredRef = useRef(onExpired);
  onExpiredRef.current = onExpired;
  const expiresAt = useMemo(
    () => Date.parse(booking.createdAt) + HOLD_DURATION_MS,
    [booking.createdAt]
  );
  const bookingCode = `BK-${booking.id}`;
  const transferMemo = `STAY ${bookingCode}`;

  useEffect(() => {
    let active = true;
    const qrPayload = `${transferMemo}\nAmount: ${Number(paymentRequest?.amount || booking.total).toFixed(2)} VND`;
    QRCode.toDataURL(qrPayload, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 248,
      color: { dark: "#203b2a", light: "#ffffff" }
    }).then((dataUrl) => {
      if (active) setQrDataUrl(dataUrl);
    }).catch((qrError) => {
      if (active) setError(`${vi ? "Không thể tạo mã QR thanh toán" : "Unable to generate the payment QR code"}: ${qrError.message}`);
    });
    return () => { active = false; };
  }, [booking.id, booking.total, paymentRequest?.amount, transferMemo]);

  useEffect(() => {
    let active = true;
    if (booking.status !== "Pending Payment") return undefined;
    setRequesting(true);
    bookingController.pay(booking.id, "mock")
      .then((result) => {
        if (active) setPaymentRequest(result.payment);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || (vi ? "Không thể tạo yêu cầu thanh toán." : "Unable to create payment request."));
      })
      .finally(() => {
        if (active) setRequesting(false);
      });
    return () => { active = false; };
  }, [booking.id, booking.status]);

  useEffect(() => {
    let active = true;
    if (payment) return undefined;
    if (!Number.isFinite(expiresAt)) {
      setSyncError(vi ? "Không xác định được thời gian giữ phòng. Hãy mở lại đặt phòng từ lịch sử." : "The booking hold time is unavailable. Reopen this booking from your history.");
      return undefined;
    }

    async function expireSession() {
      if (expiryHandled.current) return;
      expiryHandled.current = true;
      setSecondsLeft(0);
      setError(vi ? "Phiên thanh toán đã hết hạn. Vui lòng đặt phòng lại." : "Payment session expired. Please re-initiate booking.");
      try {
        await bookingController.get(booking.id);
      } catch (requestError) {
        if (active) setSyncError(`${vi ? "Không thể cập nhật đặt phòng đã hết hạn" : "Unable to refresh the expired booking"}: ${requestError.message}`);
      }
      if (active) {
        redirectTimer.current = setTimeout(
          () => onExpiredRef.current(vi ? "Phiên thanh toán đã hết hạn. Vui lòng đặt phòng lại." : "Payment session expired. Please re-initiate booking."),
          2500
        );
      }
    }

    function updateCountdown() {
      const remaining = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining === 0) void expireSession();
    }

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => {
      active = false;
      clearInterval(interval);
      if (redirectTimer.current) clearTimeout(redirectTimer.current);
    };
  }, [booking.id, expiresAt, payment]);

  async function simulatePayment(outcome) {
    setSubmitting(true);
    setError("");
    try {
      const result = await bookingController.simulatePayment(booking.id, outcome);
      await bookingController.get(booking.id);
      if (outcome === "completed") {
        setPayment(result);
        onPaymentComplete();
      } else {
        const retryRequest = await bookingController.pay(booking.id, "bank_transfer");
        setPaymentRequest(retryRequest.payment);
        setError(vi ? "Mock Payment thất bại. Bạn có thể thử lại khi thời gian giữ phòng còn hiệu lực." : "Mock payment failed. You can retry while the room hold remains active.");
      }
    } catch (paymentError) {
      if (paymentError.status === 408) {
        setError(vi ? "Phiên thanh toán đã hết hạn. Vui lòng đặt phòng lại." : "Payment session expired. Please re-initiate booking.");
        expiryHandled.current = true;
        redirectTimer.current = setTimeout(
          () => onExpiredRef.current(vi ? "Phiên thanh toán đã hết hạn. Vui lòng đặt phòng lại." : "Payment session expired. Please re-initiate booking."),
          2500
        );
      } else {
        setError(paymentError.message || (vi ? "Mock Payment thất bại. Vui lòng thử lại khi thời gian giữ phòng còn hiệu lực." : "Mock payment failed. Please retry while the room hold remains active."));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="page-content payment-page">
      <div className="page-language-toggle"><LanguageToggle /></div>
      <button className="booking-back-link" type="button" onClick={onCancel}>← {vi ? "Quay lại lịch sử đặt phòng" : "Back to booking history"}</button>
      <p className="eyebrow">{vi ? "THANH TOÁN AN TOÀN" : "SECURE CHECKOUT"}</p>
      <h1 className="page-title">{vi ? "Hoàn tất thanh toán" : "Complete your payment"}</h1>

      <div className="payment-layout">
        <section className="payment-card payment-qr-card">
          {payment ? (
            <div className="payment-success" role="status">
              <span className="payment-success-icon" aria-hidden="true">✓</span>
              <p className="eyebrow">{vi ? "ĐÃ XÁC NHẬN THANH TOÁN" : "PAYMENT CONFIRMED"}</p>
              <h2>{vi ? "Cảm ơn bạn đã thanh toán" : "Thank you for your payment"}</h2>
              <p>{vi ? `Đặt phòng ${bookingCode} đã được xác nhận.` : `Booking ${bookingCode} is confirmed.`}</p>
              <dl className="payment-receipt">
                <div><dt>{vi ? "Số tiền đã trả" : "Amount paid"}</dt><dd>{money(payment.amount)}</dd></div>
                <div><dt>{vi ? "Phương thức thanh toán" : "Payment method"}</dt><dd>{vi ? "Chuyển khoản (QR)" : "Bank transfer (QR)"}</dd></div>
                <div><dt>{vi ? "Mã giao dịch" : "Transaction reference"}</dt><dd>{payment.transactionref}</dd></div>
              </dl>
              <button className="primary-btn full" type="button" onClick={onDone}>{vi ? "Xem đặt phòng" : "View my bookings"}</button>
            </div>
          ) : (
            <>
              <h2>{vi ? "Quét để thanh toán" : "Scan to pay"}</h2>
              <p className="payment-instructions">{vi ? "Quét mã QR Mock Payment, sau đó chọn kết quả mô phỏng bên dưới." : "Scan this Mock Payment QR code with a QR reader. Then use the buttons below to simulate a payment result."}</p>
              <div className="payment-qr-frame">
                {qrDataUrl
                  ? <img src={qrDataUrl} alt={`Payment QR for booking ${bookingCode}`} />
                  : <span>{vi ? "Đang tạo mã QR…" : "Generating QR code…"}</span>}
              </div>
              <p className="payment-demo-note">{vi ? "Chỉ là Mock Payment — không sử dụng tài khoản ngân hàng, thông tin thẻ hoặc giao dịch thật." : "Mock Payment only — no bank account, card details, or real transaction are used."}</p>
              <div className="payment-memo">
                <span>{vi ? "Nội dung chuyển khoản" : "Transfer description"}</span>
                <strong>{transferMemo}</strong>
              </div>
            </>
          )}
        </section>

        <aside className="payment-card payment-summary-card">
          <p className="eyebrow">{vi ? "TÓM TẮT ĐẶT PHÒNG" : "BOOKING SUMMARY"}</p>
          <h2>{vi ? "Đặt phòng" : "Booking"} {bookingCode}</h2>
          <div className="payment-summary-line"><span>{vi ? "Phòng" : "Room"}</span><strong>{booking.roomName || (vi ? "Phòng khách sạn" : "Hotel room")}</strong></div>
          <div className="payment-summary-line"><span>{vi ? "Nhận phòng" : "Check-in"}</span><strong>{booking.checkIn || "—"}</strong></div>
          <div className="payment-summary-line"><span>{vi ? "Trả phòng" : "Check-out"}</span><strong>{booking.checkOut || "—"}</strong></div>
          <div className="payment-total"><span>{vi ? "Tổng thanh toán" : "Total to pay"}</span><strong>{money(booking.total)}</strong></div>
          {!payment && (
            <>
              <div className={secondsLeft <= 60 ? "payment-countdown urgent" : "payment-countdown"}>
                <span>{vi ? "Thời gian giữ phòng còn lại" : "Room hold expires in"}</span>
                <strong aria-live="polite">{formatTime(secondsLeft)}</strong>
              </div>
              {error && <div className="payment-alert" role="alert">{error}</div>}
              {syncError && <div className="payment-alert payment-sync-alert" role="alert">{syncError}</div>}
              <button
                className="primary-btn full"
                type="button"
                onClick={() => simulatePayment("completed")}
                disabled={requesting || submitting || !paymentRequest || !qrDataUrl || secondsLeft <= 0 || booking.status !== "Pending Payment"}
              >
                {requesting ? (vi ? "Đang tạo yêu cầu thanh toán…" : "Creating mock payment request…") : submitting ? (vi ? "Đang xử lý Mock Payment…" : "Processing mock payment…") : (vi ? "Mô phỏng thanh toán thành công" : "Simulate successful payment")}
              </button>
              <button
                className="secondary-btn full"
                type="button"
                onClick={() => simulatePayment("failed")}
                disabled={requesting || submitting || !paymentRequest || secondsLeft <= 0 || booking.status !== "Pending Payment"}
              >
                {vi ? "Mô phỏng thanh toán thất bại" : "Simulate failed payment"}
              </button>
              {booking.status !== "Pending Payment" && (
                <p className="payment-status-note">{vi ? "Đặt phòng này không chờ thanh toán." : "This booking is not awaiting payment."}</p>
              )}
              <button className="booking-cancel-link payment-cancel" type="button" onClick={onCancel}>{vi ? "Hủy giao dịch" : "Cancel Transaction"}</button>
            </>
          )}
        </aside>
      </div>
    </main>
  );
}
