import { useEffect, useMemo, useState } from "react";
import { bookingController } from "../../controllers/bookingController.js";
import { roomController } from "../../controllers/roomController.js";
import { translateCatalog, useLanguage } from "../../i18n.js";
import { useConfirmation } from "../useConfirmation.jsx";
import { useNotification } from "../useNotification.jsx";
import { Notification } from "../Notification.jsx";
import "./booking-management.css";

const money = (value) => new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0
}).format(Number(value || 0));
const statuses = [
  ["", "All statuses"],
  ["pending", "Pending"],
  ["confirmed", "Confirmed"],
  ["checked_in", "Checked-in"],
  ["checked_out", "Checked-out"],
  ["cancelled", "Cancelled"]
];
const isTerminal = (status) => ["Cancelled", "Checked Out"].includes(status);

export function BookingManagement({ onRefresh, user }) {
  const [language] = useLanguage();
  const { confirm, dialog: confirmationDialog } = useConfirmation();
  const vi = language === "VI";
  const isStaff = String(user?.role || "").toLowerCase() === "staff";
  const isAdmin = String(user?.role || "").toLowerCase() === "admin";
  const [bookings, setBookings] = useState([]);
  const [roomOptions, setRoomOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [confirmingId, setConfirmingId] = useState(null);
  const [processingRefundId, setProcessingRefundId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [refundRequests, setRefundRequests] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentFilters, setPaymentFilters] = useState({ from: "", to: "", method: "", status: "" });
  const [filters, setFilters] = useState({ status: "", from: "", to: "" });
  const [appliedFilters, setAppliedFilters] = useState({});
  const [searchText, setSearchText] = useState("");
  const [formData, setFormData] = useState({ roomId: "", checkIn: "", checkOut: "" });
  const { notification, showNotification, hideNotification } = useNotification();
  const visibleBookings = useMemo(() => {
    const term = searchText.trim().toLocaleLowerCase();
    if (!term) return bookings;
    const searchCode = term.replace(/^#/, "");
    const numericCode = searchCode.replace(/^bk[- ]?/, "");
    return bookings.filter((booking) =>
      `bk-${booking.id}`.includes(searchCode) ||
      (numericCode && String(booking.id).includes(numericCode)) ||
      booking.customerName.toLocaleLowerCase().includes(term)
    );
  }, [bookings, searchText]);

  useEffect(() => {
    loadBookings();
  }, []);

  async function loadBookings(nextFilters = appliedFilters) {
    setLoading(true);
    try {
      setBookings(await bookingController.list(nextFilters));
    } catch (error) {
      showNotification(error.message, "error");
    } finally {
      setLoading(false);
    }
  }

  async function loadRefundRequests() {
    setLoading(true);
    try {
      setRefundRequests(await bookingController.refundRequests() || []);
      setShowRefundModal(true);
    } catch (error) {
      showNotification(`${vi ? "Không thể tải yêu cầu hoàn tiền" : "Unable to load refund requests"}: ${error.message}`, "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleCompleteRefund(refund) {
    if (!isAdmin) return;
    const confirmed = await confirm({
      title: vi ? "Xác nhận đã hoàn tiền" : "Confirm refund sent",
      message: vi
        ? `Xác nhận khoản hoàn tiền ${money(refund.amount)} cho đặt phòng BK-${refund.bookingid} đã thực sự được gửi cho khách hàng.`
        : `Confirm that the refund of ${money(refund.amount)} for booking BK-${refund.bookingid} has actually been sent to the customer.`,
      cancelLabel: vi ? "Quay lại" : "Go back",
      confirmLabel: vi ? "Đã gửi hoàn tiền" : "Confirm refund sent",
      tone: "warning"
    });
    if (!confirmed) return;
    setProcessingRefundId(refund.refundrequestid);
    try {
      await bookingController.completeRefund(refund.refundrequestid);
      setRefundRequests(await bookingController.refundRequests() || []);
      await loadBookings();
      showNotification(vi ? "Đã hoàn tất hoàn tiền." : "Refund completed successfully.", "success");
    } catch (error) {
      showNotification(`${vi ? "Không thể hoàn tất hoàn tiền" : "Unable to complete refund"}: ${error.message}`, "error");
    } finally {
      setProcessingRefundId(null);
    }
  }

  async function applyFilters(event) {
    event.preventDefault();
    if (filters.from && filters.to && filters.to < filters.from) {
      showNotification(vi ? "Ngày kết thúc phải bằng hoặc sau ngày bắt đầu." : "End date must be on or after start date.", "error");
      return;
    }
    const next = Object.fromEntries(Object.entries(filters).filter(([, value]) => value));
    setAppliedFilters(next);
    await loadBookings(next);
  }

  async function loadPaymentHistory(nextFilters = paymentFilters) {
    setLoading(true);
    try {
      setPaymentHistory(await bookingController.paymentHistory(nextFilters) || []);
      setShowPaymentModal(true);
    } catch (error) {
      showNotification(`${vi ? "Không thể tải lịch sử thanh toán" : "Unable to load payment history"}: ${error.message}`, "error");
    } finally {
      setLoading(false);
    }
  }

  async function applyPaymentFilters(event) {
    event.preventDefault();
    await loadPaymentHistory(paymentFilters);
  }

  async function openDetails(booking) {
    setShowModal(true);
    setSelectedBooking(null);
    setSelectedInvoice(null);
    try {
      const details = await bookingController.managementDetails(booking.id);
      setSelectedBooking(details);
      try {
        setSelectedInvoice(await bookingController.stayInvoice(booking.id));
      } catch (error) {
        showNotification(`${vi ? "Không thể tải hóa đơn lưu trú" : "Unable to load stay invoice"}: ${error.message}`, "error");
      }
      setFormData({
        roomId: String(details.roomId),
        checkIn: details.checkIn,
        checkOut: details.checkOut
      });
      if (isStaff) setRoomOptions(await roomController.list());
    } catch (error) {
      showNotification(error.message, "error");
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!selectedBooking || !isStaff || isTerminal(selectedBooking.status)) return;
    setLoading(true);
    try {
      await bookingController.updateManagement(selectedBooking.id, {
        roomId: Number(formData.roomId),
        checkIn: formData.checkIn,
        checkOut: formData.checkOut
      });
      setShowModal(false);
      await loadBookings();
      showNotification(vi ? "Đã cập nhật đặt phòng." : "Booking updated successfully.", "success");
      onRefresh?.();
    } catch (error) {
      showNotification(error.message, "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm(id) {
    setConfirmingId(id);
    try {
      await bookingController.confirmManagement(id);
      await loadBookings();
      showNotification(vi ? "Đã xác nhận đặt phòng." : "Booking confirmed successfully.", "success");
      onRefresh?.();
    } catch (error) {
      showNotification(error.message, "error");
    } finally {
      setConfirmingId(null);
    }
  }

  async function handleCancel(id) {
    const booking = bookings.find((item) => item.id === id);
    const hasPaidAmount = Number(booking?.paidAmount || 0) > 0;
    const prompt = hasPaidAmount
      ? `Cancel BK-${id}? A refund request for ${money(booking.paidAmount)} will be added to the manual refund queue.`
      : `Cancel BK-${id}? This action cannot be undone.`;
    const confirmed = await confirm({
      title: vi ? "Hủy đặt phòng?" : "Cancel booking?",
      message: prompt,
      cancelLabel: vi ? "Giữ đặt phòng" : "Keep booking",
      confirmLabel: vi ? "Hủy đặt phòng" : "Cancel booking",
      tone: "danger"
    });
    if (!confirmed) return;
    setLoading(true);
    try {
      const result = await bookingController.cancel(id);
      await loadBookings();
      showNotification(result.message || (vi ? "Đã hủy đặt phòng." : "Booking cancelled."), "success");
      onRefresh?.();
    } catch (error) {
      showNotification(error.message, "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleTransition(id, action) {
    setLoading(true);
    try {
      await bookingController[action](id);
      await loadBookings();
      if (action === "checkOut") {
        const [details, invoice] = await Promise.all([
          bookingController.managementDetails(id),
          bookingController.stayInvoice(id)
        ]);
        setSelectedBooking(details);
        setSelectedInvoice(invoice);
        setShowModal(true);
      }
      const actionLabels = {
        checkIn: vi ? "Nhận phòng" : "Check-in",
        checkOut: vi ? "Trả phòng" : "Check-out"
      };
      showNotification(actionLabels[action] ? `${vi ? "Đã" : ""} ${actionLabels[action]} ${vi ? "thành công." : "successful."}` : "", "success");
      onRefresh?.();
    } catch (error) {
      showNotification(error.message, "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleCollectStayPayment() {
    if (!isStaff || !selectedBooking || !selectedInvoice || selectedInvoice.balance <= 0) return;
    setLoading(true);
    try {
      await bookingController.collectStayPayment(selectedBooking.id, paymentMethod);
      const [details, invoice] = await Promise.all([
        bookingController.managementDetails(selectedBooking.id),
        bookingController.stayInvoice(selectedBooking.id)
      ]);
      setSelectedBooking(details);
      setSelectedInvoice(invoice);
      await loadBookings();
      showNotification(vi ? "Đã thu tiền thành công." : "Payment collected successfully.", "success");
      onRefresh?.();
    } catch (error) {
      showNotification(error.message, "error");
    } finally {
      setLoading(false);
    }
  }

  function closeDetails() {
    setShowModal(false);
    setSelectedBooking(null);
    setSelectedInvoice(null);
  }

  async function refreshDetails() {
    if (!selectedBooking) return;
    setLoading(true);
    try {
      const [details, invoice] = await Promise.all([
        bookingController.managementDetails(selectedBooking.id),
        bookingController.stayInvoice(selectedBooking.id)
      ]);
      setSelectedBooking(details);
      setSelectedInvoice(invoice);
      await loadBookings();
      showNotification(vi ? "Đã cập nhật trạng thái thanh toán." : "Payment status refreshed successfully.", "success");
    } catch (error) {
      showNotification(`${vi ? "Không thể cập nhật trạng thái thanh toán" : "Unable to refresh payment status"}: ${error.message}`, "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="management-section booking-management">
      {confirmationDialog}
      <header className="section-header booking-management-header">
        <div>
          <h2>{vi ? "Quản lý đặt phòng" : "Manage Bookings"}</h2>
          <p>{isStaff ? (vi ? "Tìm đặt phòng, nhận phòng cho khách và xử lý trả phòng kèm hóa đơn cuối." : "Search reservations, check guests in, and process checkout with a final invoice.") : (vi ? "Xem trạng thái đặt phòng và hóa đơn lưu trú ở chế độ chỉ đọc." : "Review booking statuses and stay invoices in read-only mode.")}</p>
        </div>
        <button type="button" className="primary-btn booking-payment-history" onClick={loadPaymentHistory}>
          {vi ? "Lịch sử thanh toán" : "Payment history"}
        </button>
        <button type="button" className="outline-btn booking-refund-requests" onClick={loadRefundRequests}>
          {vi ? "Yêu cầu hoàn tiền" : "Refund requests"}
        </button>
      </header>

      <form className="booking-filters" onSubmit={applyFilters}>
        <label>{vi ? "Tìm đặt phòng" : "Find booking"}
          <input
            type="search"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder={vi ? "Mã đặt phòng hoặc tên khách hàng" : "Booking code or customer name"}
            aria-label={vi ? "Tìm theo mã đặt phòng hoặc tên khách hàng" : "Search bookings by booking code or customer name"}
          />
        </label>
        <label>{vi ? "Trạng thái" : "Status"}
          <select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}>
            {statuses.map(([value, label]) => <option key={value} value={value}>{vi ? ({
              "": "Tất cả trạng thái",
              Pending: "Chờ thanh toán",
              Confirmed: "Đã xác nhận",
              "Checked-in": "Đã nhận phòng",
              "Checked-out": "Đã trả phòng",
              Cancelled: "Đã hủy"
            }[label] || label) : label}</option>)}
          </select>
        </label>
        <label>{vi ? "Nhận phòng từ" : "Check-in from"}
          <input type="date" value={filters.from} onChange={(event) => setFilters({ ...filters, from: event.target.value })} />
        </label>
        <label>{vi ? "Trả phòng đến" : "Check-out through"}
          <input type="date" value={filters.to} onChange={(event) => setFilters({ ...filters, to: event.target.value })} />
        </label>
        <div className="booking-filter-actions">
          <button type="submit" disabled={loading}>{vi ? "Áp dụng bộ lọc" : "Apply filters"}</button>
          <button type="button" className="booking-filter-reset" onClick={() => {
            const empty = { status: "", from: "", to: "" };
            setFilters(empty);
            setAppliedFilters({});
            setSearchText("");
            loadBookings({});
          }}>{vi ? "Đặt lại" : "Reset"}</button>
        </div>
      </form>

      <Notification notification={notification} onClose={hideNotification} />
      {loading && <p className="loading" role="status">{vi ? "Đang tải đặt phòng…" : "Loading bookings..."}</p>}

      <div className="booking-table-wrap">
        <table className="data-table booking-table">
          <thead>
            <tr>
              <th>{vi ? "Mã đặt phòng" : "Booking Code"}</th>
              <th>{vi ? "Tên khách hàng" : "Customer Name"}</th>
              <th>{vi ? "Phòng" : "Room"}</th>
              <th>{vi ? "Ngày lưu trú" : "Dates"}</th>
              <th>{vi ? "Trạng thái" : "Status"}</th>
              <th>{vi ? "Thanh toán" : "Payment"}</th>
              {isStaff && <th>{vi ? "Thao tác" : "Actions"}</th>}
            </tr>
          </thead>
          <tbody>
            {visibleBookings.map((booking) => (
              <tr key={booking.id}>
                <td>
                  <button type="button" className="booking-code-button" onClick={() => openDetails(booking)}>
                    BK-{booking.id}
                  </button>
                </td>
                <td>{booking.customerName}</td>
                <td>{booking.roomName}</td>
                <td>{booking.checkIn} – {booking.checkOut}</td>
                <td>
                  <span className={`status ${booking.status.toLowerCase().replace(/\s+/g, "-")}`}>{vi ? ({
                    "Pending Payment": "Chờ thanh toán",
                    Confirmed: "Đã xác nhận",
                    "Checked In": "Đã nhận phòng",
                    "Checked Out": "Đã trả phòng",
                    Cancelled: "Đã hủy"
                  }[booking.status] || booking.status) : booking.status}</span>
                  {booking.roomStatus && <small className="booking-room-state">{vi ? "Phòng" : "Room"}: {booking.roomStatus}</small>}
                </td>
                <td>
                  <strong>{vi ? ({ Paid: "Đã thanh toán", Pending: "Chờ thanh toán", Failed: "Thất bại", Refunded: "Đã hoàn tiền" }[booking.paymentStatus] || booking.paymentStatus) : booking.paymentStatus}</strong>
                  {booking.balance > 0 && <small className="booking-balance-due">{vi ? "Còn nợ" : "Due"} {money(booking.balance)}</small>}
                </td>
                {isStaff && (
                  <td className="booking-actions">
                    {booking.status === "Pending Payment" && (
                      <button type="button" disabled={confirmingId === booking.id} onClick={() => handleConfirm(booking.id)}>
                        {confirmingId === booking.id ? (vi ? "Đang xác nhận…" : "Confirming...") : (vi ? "Xác nhận" : "Confirm")}
                      </button>
                    )}

                    {showRefundModal && (
                      <div className="modal-overlay" onClick={() => setShowRefundModal(false)}>
                        <div className="modal booking-payment-modal" role="dialog" aria-modal="true" aria-labelledby="refund-requests-title" onClick={(event) => event.stopPropagation()}>
                          <h3 id="refund-requests-title">{vi ? "Yêu cầu hoàn tiền thủ công" : "Manual refund requests"}</h3>
                          <p className="booking-customer-summary">
                            {vi ? "Hoàn tiền được xử lý bên ngoài hệ thống. Staff chỉ đánh dấu hoàn tất sau khi tiền đã thực sự được trả cho khách." : "Refunds are processed outside this system. Staff should mark a request complete only after the money has actually been returned."}
                          </p>
                          <div className="booking-table-wrap">
                            <table className="data-table">
                              <thead><tr><th>{vi ? "Đặt phòng" : "Booking"}</th><th>{vi ? "Khách hàng" : "Customer"}</th><th>{vi ? "Phòng" : "Room"}</th><th>{vi ? "Số tiền hoàn" : "Refund amount"}</th><th>{vi ? "Ngày yêu cầu" : "Requested"}</th><th>{vi ? "Trạng thái" : "Status"}</th>{isAdmin && <th>{vi ? "Thao tác" : "Action"}</th>}</tr></thead>
                              <tbody>
                                {refundRequests.map((refund) => (
                                  <tr key={refund.refundrequestid}>
                                    <td>BK-{refund.bookingid}</td>
                                    <td>{refund.customername}</td>
                                    <td>{refund.roomnumber}</td>
                                    <td>{money(refund.amount)}</td>
                                    <td>{refund.createdat ? String(refund.createdat).slice(0, 16).replace("T", " ") : "—"}</td>
                                    <td>{refund.status === "pending" ? (vi ? "Chờ xử lý thủ công" : "Pending manual review") : (vi ? "Đã hoàn tiền" : "Refunded")}</td>
                                    {isAdmin && (
                                      <td>
                                        {refund.status === "pending" && (
                                          <button
                                            type="button"
                                            className="stay-collect-payment"
                                            disabled={processingRefundId === refund.refundrequestid}
                                            onClick={() => handleCompleteRefund(refund)}
                                          >
                                            {processingRefundId === refund.refundrequestid ? (vi ? "Đang lưu…" : "Saving...") : (vi ? "Xác nhận đã hoàn" : "Confirm refunded")}
                                          </button>
                                        )}
                                      </td>
                                    )}
                                  </tr>
                                ))}
                                {refundRequests.length === 0 && (
                                  <tr><td colSpan={isStaff ? 7 : 6} className="booking-empty">{vi ? "Không có yêu cầu hoàn tiền." : "No refund requests found."}</td></tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                          <div className="modal-actions"><button type="button" onClick={() => setShowRefundModal(false)}>{vi ? "Đóng" : "Close"}</button></div>
                        </div>
                      </div>
                    )}
                    {["Pending Payment", "Confirmed"].includes(booking.status) && (
                      <button type="button" className="booking-cancel-button" onClick={() => handleCancel(booking.id)}>{vi ? "Hủy" : "Cancel"}</button>
                    )}
                    {booking.status === "Confirmed" && (
                      <>
                        <button
                          type="button"
                          className="booking-checkin-button"
                          disabled={loading || booking.paymentStatus !== "Paid" || booking.roomStatus !== "available"}
                          title={booking.paymentStatus !== "Paid"
                            ? (vi ? "Phải hoàn tất thanh toán trước khi nhận phòng." : "Payment must be completed before check-in.")
                            : booking.roomStatus !== "available"
                              ? `${vi ? "Phòng đang" : "Room is"} ${booking.roomStatus || (vi ? "chưa sẵn sàng" : "not ready")}; ${vi ? "phải ở trạng thái Trống." : "it must be Available."}`
                              : (vi ? "Xác nhận nhận phòng" : "Confirm check-in")}
                          onClick={() => handleTransition(booking.id, "checkIn")}
                        >{vi ? "Xác nhận nhận phòng" : "Confirm Check-in"}</button>
                        {booking.paymentStatus !== "Paid" && <small className="booking-action-reason">{vi ? "Cần thanh toán" : "Payment required"}</small>}
                        {["cleaning", "maintenance"].includes(booking.roomStatus) && (
                          <small className="booking-action-reason">{vi ? `Phòng đang ${booking.roomStatus}; không thể nhận phòng` : `Room is ${booking.roomStatus}; check-in blocked`}</small>
                        )}
                      </>
                    )}
                    {booking.status === "Checked In" && (
                      <button
                        type="button"
                        className="booking-checkout-button"
                        disabled={loading || booking.balance > 0}
                        title={booking.balance > 0 ? (vi ? "Thanh toán số dư còn lại trước khi trả phòng." : "Settle the outstanding balance before check-out.") : (vi ? "Xử lý trả phòng" : "Process check-out")}
                        onClick={() => handleTransition(booking.id, "checkOut")}
                      >{vi ? "Xử lý trả phòng" : "Process Checkout"}</button>
                    )}
                  </td>
                )}
              </tr>
            ))}
            {!loading && visibleBookings.length === 0 && (
              <tr><td colSpan={isStaff ? 7 : 6} className="booking-empty">{vi ? "Không có đặt phòng phù hợp với bộ lọc." : "No bookings match these filters."}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={closeDetails}>
          <div className="modal booking-details-modal" role="dialog" aria-modal="true" aria-labelledby="booking-details-title" onClick={(event) => event.stopPropagation()}>
            {selectedBooking ? (
              <>
                <div className="booking-modal-heading">
                  <div>
                    <p className="booking-modal-eyebrow">{vi ? "CHI TIẾT ĐẶT PHÒNG" : "BOOKING DETAILS"}</p>
                    <h3 id="booking-details-title">{vi ? "Đặt phòng" : "Booking"} #{selectedBooking.id}</h3>
                  </div>
                  <span className={`status ${selectedBooking.status.toLowerCase().replace(/\s+/g, "-")}`}>{selectedBooking.status}</span>
                </div>
                <p className="booking-customer-summary"><strong>{selectedBooking.customerName}</strong> · {selectedBooking.roomName} · {money(selectedBooking.total)}</p>
                <p className="booking-customer-summary">
                  {vi ? "Liên hệ" : "Contact"}: {selectedBooking.contactPhone || (vi ? "Chưa cung cấp" : "Not provided")} · {vi ? "Trạng thái phòng" : "Room status"}: {selectedBooking.roomStatus || (vi ? "Không rõ" : "Unknown")} · {vi ? "Thanh toán" : "Payment"}: {selectedBooking.paymentStatus}
                </p>
                {isStaff && isTerminal(selectedBooking.status) && (
                  <div className="booking-notice" role="alert">{vi ? `Không thể sửa đặt phòng vì trạng thái hiện tại là ${selectedBooking.status.toLowerCase()}.` : `This booking cannot be modified because its status is ${selectedBooking.status.toLowerCase()}.`}</div>
                )}
                {!isStaff && <div className="booking-readonly-note">{vi ? "Quyền Admin chỉ được xem." : "Administrator access is view-only."}</div>}
                {isStaff && selectedBooking.status === "Confirmed" && selectedBooking.paymentStatus !== "Paid" && (
                  <div className="booking-notice" role="alert">{vi ? "Không thể nhận phòng cho đến khi hoàn tất thanh toán." : "Check-in is blocked until the booking payment has been completed."}</div>
                )}
                {isStaff && selectedBooking.status === "Confirmed" && ["cleaning", "maintenance"].includes(selectedBooking.roomStatus) && (
                  <div className="booking-notice" role="alert">{vi ? `Không thể nhận phòng vì phòng được gán đang ở trạng thái ${selectedBooking.roomStatus}.` : `Check-in is blocked because the assigned room is ${selectedBooking.roomStatus}.`}</div>
                )}
                <form onSubmit={handleSubmit}>
                  <label>{vi ? "Phòng được gán" : "Assigned room"}
                    <select
                      disabled={!isStaff || isTerminal(selectedBooking.status)}
                      value={formData.roomId}
                      onChange={(event) => setFormData({ ...formData, roomId: event.target.value })}
                    >
                      {roomOptions.map((room) => (
                        <option key={room.id} value={room.id}>{room.roomNumber} · {translateCatalog(room.type, language)}</option>
                      ))}
                      {!roomOptions.some((room) => String(room.id) === formData.roomId) && (
                        <option value={formData.roomId}>{selectedBooking.roomName}</option>
                      )}
                    </select>
                  </label>
                  <div className="booking-date-fields">
                    <label>Check-in
                      <input type="date" required disabled={!isStaff || isTerminal(selectedBooking.status)} value={formData.checkIn} onChange={(event) => setFormData({ ...formData, checkIn: event.target.value })} />
                    </label>
                    <label>Check-out
                      <input type="date" required disabled={!isStaff || isTerminal(selectedBooking.status)} value={formData.checkOut} onChange={(event) => setFormData({ ...formData, checkOut: event.target.value })} />
                    </label>
                  </div>
                  <label>{vi ? "Trạng thái thanh toán" : "Payment status"}
                    <input disabled value={selectedBooking.paymentStatus} />
                  </label>
                  <div className="payment-status-summary">
                    <div><span>{vi ? "Tổng cộng" : "Total"}</span><strong>{money(selectedBooking.total)}</strong></div>
                    <div><span>{vi ? "Đã trả" : "Paid"}</span><strong>{money(selectedBooking.paidAmount)}</strong></div>
                    <div><span>{vi ? "Còn lại" : "Balance"}</span><strong>{money(selectedBooking.balance)}</strong></div>
                  </div>
                  <div className="modal-actions payment-status-actions">
                    <button type="button" onClick={refreshDetails} disabled={loading}>{loading ? (vi ? "Đang cập nhật…" : "Refreshing...") : (vi ? "Cập nhật trạng thái thanh toán" : "Refresh payment status")}</button>
                  </div>
                  {selectedBooking.payments?.length > 0 && <div className="booking-table-wrap payment-transactions">
                    <table className="data-table">
                      <thead><tr><th>{vi ? "Giao dịch" : "Transaction"}</th><th>{vi ? "Số tiền" : "Amount"}</th><th>{vi ? "Phương thức" : "Method"}</th><th>{vi ? "Trạng thái" : "Status"}</th></tr></thead>
                      <tbody>{selectedBooking.payments.map((payment) => <tr key={payment.paymentid}><td>#{payment.paymentid}</td><td>{money(payment.amount)}</td><td>{payment.paymentmethod}</td><td>{payment.status}</td></tr>)}</tbody>
                    </table>
                  </div>}
                  {selectedInvoice && (
                    <section className="stay-invoice" aria-label="Stay invoice">
                      <h4>{vi ? "Hóa đơn lưu trú" : "Stay invoice"}</h4>
                      <div className="stay-invoice-line"><span>{vi ? "Phòng và lưu trú" : "Room and stay"}</span><strong>{money(selectedInvoice.roomCharge)}</strong></div>
                      {selectedInvoice.services.map((service) => (
                        <div className={`stay-invoice-line ${service.status === "cancelled" ? "is-cancelled" : ""}`} key={service.id}>
                          <span>{translateCatalog(service.name, language)} × {service.quantity}{service.serviceDate ? ` · ${service.serviceDate}` : ""}{service.status === "cancelled" ? (vi ? " (Đã hủy)" : " (Cancelled)") : ""}</span>
                          <strong>{money(service.amount)}</strong>
                        </div>
                      ))}
                      {selectedInvoice.services.length === 0 && <p className="stay-invoice-empty">{vi ? "Chưa có dịch vụ phát sinh." : "No additional services recorded."}</p>}
                      <div className="stay-invoice-line stay-invoice-total"><span>{vi ? "Tổng chi phí" : "Total charges"}</span><strong>{money(selectedInvoice.totalAmount)}</strong></div>
                      <div className="stay-invoice-line"><span>{vi ? "Đã trả" : "Paid"}</span><strong>{money(selectedInvoice.paidAmount)}</strong></div>
                      <div className="stay-invoice-line stay-invoice-balance"><span>{vi ? "Số dư còn lại" : "Outstanding balance"}</span><strong>{money(selectedInvoice.balance)}</strong></div>
                      {isStaff && ["Checked In", "Checked Out"].includes(selectedBooking.status) && selectedInvoice.balance > 0 && (
                        <>
                          <div className="booking-notice" role="alert">
                            {selectedBooking.status === "Checked Out"
                              ? (vi ? "Lượt lưu trú đã hoàn tất nhưng vẫn còn số dư chưa thanh toán. Hãy xác minh đã nhận tiền trước khi ghi nhận quyết toán." : "This completed stay still has an unpaid balance. Verify that payment has actually been received before recording settlement.")
                              : (vi ? "Thu số dư còn lại trước khi xử lý trả phòng." : "Collect the outstanding balance before processing check-out.")}
                          </div>
                          <label className="stay-payment-method">{vi ? "Phương thức thanh toán" : "Payment method"}
                            <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} disabled={loading}>
                              <option value="cash">{vi ? "Tiền mặt" : "Cash"}</option>
                              <option value="bank_transfer">{vi ? "Chuyển khoản" : "Bank transfer"}</option>
                            </select>
                          </label>
                          <button type="button" className="stay-collect-payment" onClick={handleCollectStayPayment} disabled={loading}>
                            {loading ? (vi ? "Đang ghi nhận thanh toán…" : "Recording payment...") : selectedBooking.status === "Checked Out" ? (vi ? "Ghi nhận đã quyết toán" : "Record settlement received") : (vi ? "Ghi nhận đã thanh toán" : "Record payment received")}
                          </button>
                        </>
                      )}
                    </section>
                  )}
                  <div className="modal-actions">
                    <button type="button" onClick={closeDetails}>{vi ? "Đóng" : "Close"}</button>
                    {isStaff && !isTerminal(selectedBooking.status) && (
                      <button type="submit" disabled={loading}>{loading ? (vi ? "Đang lưu…" : "Saving...") : (vi ? "Cập nhật đặt phòng" : "Update Booking")}</button>
                    )}
                  </div>
                </form>
              </>
            ) : (
              <>
                <h3 id="booking-details-title">{vi ? "Đang tải chi tiết đặt phòng…" : "Loading booking details..."}</h3>
                <div className="modal-actions"><button type="button" onClick={closeDetails}>{vi ? "Đóng" : "Close"}</button></div>
              </>
            )}
          </div>
        </div>
      )}

      {showPaymentModal && (
        <div className="modal-overlay" onClick={() => setShowPaymentModal(false)}>
          <div className="modal booking-payment-modal" role="dialog" aria-modal="true" aria-labelledby="payment-history-title" onClick={(event) => event.stopPropagation()}>
            <h3 id="payment-history-title">{vi ? "Lịch sử thanh toán" : "Payment history"}</h3>
            <form className="payment-history-filters" onSubmit={applyPaymentFilters}>
             <label>{vi ? "Từ ngày" : "From"}<input type="date" value={paymentFilters.from} onChange={(event) => setPaymentFilters({ ...paymentFilters, from: event.target.value })} /></label>
             <label>{vi ? "Đến ngày" : "To"}<input type="date" value={paymentFilters.to} onChange={(event) => setPaymentFilters({ ...paymentFilters, to: event.target.value })} /></label>
             <label>{vi ? "Phương thức" : "Method"}<select value={paymentFilters.method} onChange={(event) => setPaymentFilters({ ...paymentFilters, method: event.target.value })}><option value="">{vi ? "Tất cả phương thức" : "All methods"}</option><option value="credit_card">{vi ? "Thẻ tín dụng" : "Credit card"}</option><option value="debit_card">{vi ? "Thẻ ghi nợ" : "Debit card"}</option><option value="cash">{vi ? "Tiền mặt" : "Cash"}</option><option value="bank_transfer">{vi ? "Chuyển khoản" : "Bank transfer"}</option><option value="paypal">PayPal</option></select></label>
             <label>{vi ? "Trạng thái" : "Status"}<select value={paymentFilters.status} onChange={(event) => setPaymentFilters({ ...paymentFilters, status: event.target.value })}><option value="">{vi ? "Tất cả trạng thái" : "All statuses"}</option><option value="completed">{vi ? "Đã hoàn tất" : "Completed"}</option><option value="pending">{vi ? "Đang chờ" : "Pending"}</option><option value="failed">{vi ? "Thất bại" : "Failed"}</option><option value="refunded">{vi ? "Đã hoàn tiền" : "Refunded"}</option></select></label>
             <button type="submit" className="outline-btn" disabled={loading}>{vi ? "Lọc" : "Filter"}</button>
             <button type="button" className="outline-btn" onClick={() => { const empty = { from: "", to: "", method: "", status: "" }; setPaymentFilters(empty); loadPaymentHistory(empty); }}>{vi ? "Đặt lại" : "Reset"}</button>
            </form>
            <div className="booking-table-wrap">
              <table className="data-table">
                <thead><tr><th>{vi ? "Giao dịch" : "Transaction"}</th><th>{vi ? "Đặt phòng" : "Booking"}</th><th>{vi ? "Khách hàng" : "Customer"}</th><th>{vi ? "Số tiền" : "Amount"}</th><th>{vi ? "Phương thức" : "Method"}</th><th>{vi ? "Trạng thái" : "Status"}</th><th>{vi ? "Ngày" : "Date"}</th><th>{vi ? "Biên lai" : "Receipt"}</th></tr></thead>
                <tbody>
                  {paymentHistory.map((payment) => (
                    <tr key={payment.paymentid}>
                      <td>#{payment.paymentid}</td>
                      <td>BK-{payment.bookingid}</td>
                      <td>{payment.fullname || "-"}</td>
                      <td>{money(payment.amount)}</td>
                      <td>{payment.paymentmethod || (vi ? "Chuyển khoản" : "Bank transfer")}</td>
                      <td>{payment.status}</td>
                      <td>{payment.transactiondate ? String(payment.transactiondate).slice(0, 16).replace("T", " ") : "-"}</td>
                      <td><button type="button" className="booking-code-button" onClick={() => setSelectedPayment(payment)}>{vi ? "Xem biên lai" : "View receipt"}</button></td>
                    </tr>
                  ))}
                  {paymentHistory.length === 0 && <tr><td colSpan="8" className="booking-empty">{vi ? "Không tìm thấy giao dịch thanh toán." : "No payment transactions found."}</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="modal-actions"><button type="button" onClick={() => setShowPaymentModal(false)}>{vi ? "Đóng" : "Close"}</button></div>
          </div>
        </div>
      )}

      {selectedPayment && (
        <div className="modal-overlay" onClick={() => setSelectedPayment(null)}>
          <div className="modal payment-history-receipt" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <h3>{vi ? "Biên lai thanh toán" : "Payment receipt"}</h3>
            <p><strong>{vi ? "Giao dịch" : "Transaction"}:</strong> #{selectedPayment.paymentid}</p>
            <p><strong>{vi ? "Đặt phòng" : "Booking"}:</strong> BK-{selectedPayment.bookingid}</p>
            <p><strong>{vi ? "Khách hàng" : "Customer"}:</strong> {selectedPayment.fullname || "-"}</p>
            <p><strong>Email:</strong> {selectedPayment.email || "-"}</p>
            <p><strong>{vi ? "Lưu trú" : "Stay"}:</strong> {String(selectedPayment.checkindate || "").slice(0, 10)} - {String(selectedPayment.checkoutdate || "").slice(0, 10)}</p>
            <p><strong>{vi ? "Số tiền" : "Amount"}:</strong> {money(selectedPayment.amount)}</p>
            <p><strong>{vi ? "Phương thức" : "Method"}:</strong> {selectedPayment.paymentmethod || "-"}</p>
            <p><strong>{vi ? "Trạng thái" : "Status"}:</strong> {selectedPayment.status}</p>
            <p><strong>{vi ? "Mã tham chiếu" : "Reference"}:</strong> {selectedPayment.transactionref || (vi ? "Không có" : "Not available")}</p>
            <p><strong>{vi ? "Ngày giao dịch" : "Transaction date"}:</strong> {selectedPayment.transactiondate ? new Date(selectedPayment.transactiondate).toLocaleString("vi-VN") : "-"}</p>
            <div className="modal-actions"><button type="button" onClick={() => window.print()}>{vi ? "In / Lưu PDF" : "Print / Save PDF"}</button><button type="button" onClick={() => setSelectedPayment(null)}>{vi ? "Đóng" : "Close"}</button></div>
          </div>
        </div>
      )}
    </section>
  );
}
