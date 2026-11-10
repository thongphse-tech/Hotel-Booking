import { useState, useEffect } from "react";
import { catalogController } from "../../controllers/catalogController.js";
import { useLanguage } from "../../i18n.js";
import { useNotification } from "../useNotification.jsx";
import { useConfirmation } from "../useConfirmation.jsx";
import { Notification } from "../Notification.jsx";

export function DiscountManagement({ onRefresh }) {
  const [language] = useLanguage();
  const vi = language === "VI";
  const { confirm, dialog: confirmationDialog } = useConfirmation();
  const [discounts, setDiscounts] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [roomTypesError, setRoomTypesError] = useState("");
  const [discountsError, setDiscountsError] = useState("");
  const { notification, showNotification, hideNotification } = useNotification();

  useEffect(() => {
    loadDiscounts();
  }, []);

  async function loadDiscounts() {
    setLoading(true);
    const [discountResult, roomTypeResult] = await Promise.allSettled([
      catalogController.discounts(),
      catalogController.roomTypes()
    ]);
    if (discountResult.status === "fulfilled") {
      setDiscounts(discountResult.value);
      setDiscountsError("");
    } else {
      setDiscountsError(discountResult.reason.message);
    }
    if (roomTypeResult.status === "fulfilled") {
      setRoomTypes(roomTypeResult.value);
      setRoomTypesError("");
    } else {
      setRoomTypesError(roomTypeResult.reason.message);
    }
    setLoading(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...formData,
        codeString: (formData.code || formData.codeString || "").trim().toUpperCase(),
        roomTypeId: formData.roomTypeId === "all" ? null : Number(formData.roomTypeId),
        discountType: formData.discountType || "percentage",
        discountValue: Number(formData.discountValue),
        usageLimit: formData.usageLimit === "" || formData.usageLimit == null ? null : Number(formData.usageLimit)
      };
      if (editingItem) {
        await catalogController.updateDiscount(editingItem.id, payload);
      } else {
        await catalogController.createDiscount(payload);
      }
      setShowModal(false);
      setEditingItem(null);
      setFormData({});
      await loadDiscounts();
      showNotification(editingItem ? (vi ? "Đã cập nhật mã giảm giá." : "Discount code updated successfully.") : (vi ? "Đã tạo mã giảm giá." : "Discount code created successfully."), "success");
      onRefresh?.();
    } catch (error) {
      showNotification(error.message, "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleStatus(id, currentStatus) {
    setLoading(true);
    try {
      await catalogController.setDiscountActive(id, !currentStatus);
      await loadDiscounts();
      showNotification(currentStatus ? (vi ? "Đã vô hiệu hóa mã giảm giá." : "Discount code deactivated.") : (vi ? "Đã kích hoạt mã giảm giá." : "Discount code activated."), "success");
    } catch (error) {
      showNotification(error.message, "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(discount) {
    const confirmed = await confirm({
      title: vi ? "Xóa mã giảm giá?" : "Delete discount code?",
      message: vi
        ? `Xóa mã ${discount.code}? Hành động này không thể hoàn tác. Mã đang gắn với đặt phòng chưa hủy sẽ không thể xóa.`
        : `Delete code ${discount.code}? This action cannot be undone. Codes linked to active bookings cannot be deleted.`,
      cancelLabel: vi ? "Giữ lại" : "Keep it",
      confirmLabel: vi ? "Xóa" : "Delete",
      tone: "danger"
    });
    if (!confirmed) return;
    setLoading(true);
    try {
      await catalogController.deleteDiscount(discount.id);
      await loadDiscounts();
      showNotification(vi ? "Đã xóa mã giảm giá." : "Discount code deleted successfully.", "success");
      onRefresh?.();
    } catch (error) {
      showNotification(error.message, "error");
    } finally {
      setLoading(false);
    }
  }

  function openModal(item = null) {
    setEditingItem(item);
    setFormData(item
      ? { ...item, roomTypeId: item.roomTypeId || "all" }
      : { discountType: "percentage", usageLimit: "", roomTypeId: "" });
    setShowModal(true);
  }

  return (
    <div className="management-section">
      {confirmationDialog}
      <div className="section-header">
        <h2>{vi ? "Quản lý mã giảm giá" : "Manage Discount Codes"}</h2>
        <button className="primary-btn" onClick={() => openModal()}>+ {vi ? "Thêm mã giảm giá" : "Add Discount"}</button>
      </div>
      <Notification notification={notification} onClose={hideNotification} />
      {discountsError && <div className="booking-notice" role="alert">{discountsError}</div>}
      {roomTypesError && <div className="booking-notice" role="alert">{vi ? `Không tải được danh sách hạng phòng: ${roomTypesError}` : `Could not load room types: ${roomTypesError}`}</div>}

      {loading && <p className="loading">{vi ? "Đang tải…" : "Loading..."}</p>}

      <table className="data-table">
        <thead>
          <tr>
            <th>Code</th>
            <th>{vi ? "Hạng phòng" : "Room type"}</th>
            <th>{vi ? "Mức giảm" : "Discount"}</th>
            <th>{vi ? "Có hiệu lực từ" : "Valid From"}</th>
            <th>{vi ? "Có hiệu lực đến" : "Valid To"}</th>
            <th>{vi ? "Lượt dùng" : "Usage"}</th>
            <th>{vi ? "Trạng thái" : "Status"}</th>
            <th>{vi ? "Thao tác" : "Actions"}</th>
          </tr>
        </thead>
        <tbody>
          {discounts.map((discount) => (
            <tr key={discount.id}>
              <td><strong>{discount.code}</strong></td>
              <td>{discount.roomTypeName || (vi ? "Tất cả hạng phòng" : "All room types")}</td>
              <td>{discount.discountType === "fixed" ? `${new Intl.NumberFormat("vi-VN").format(discount.discountValue)} VND` : `${discount.discountValue}%`}</td>
              <td>{discount.validFrom}</td>
              <td>{discount.validTo}</td>
              <td>{discount.usedCount}/{discount.usageLimit ?? (vi ? "Không giới hạn" : "Unlimited")}</td>
              <td>
                <span className={`status ${discount.isActive ? "active" : "inactive"}`}>
                  {discount.isActive ? (vi ? "Đang hoạt động" : "Active") : (vi ? "Không hoạt động" : "Inactive")}
                </span>
              </td>
              <td>
                <button onClick={() => openModal(discount)}>{vi ? "Sửa" : "Edit"}</button>
                <button onClick={() => handleToggleStatus(discount.id, discount.isActive)}>
                  {discount.isActive ? (vi ? "Vô hiệu hóa" : "Deactivate") : (vi ? "Kích hoạt" : "Activate")}
                </button>
                <button className="booking-cancel-button" onClick={() => handleDelete(discount)}>{vi ? "Xóa" : "Delete"}</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{editingItem ? (vi ? "Sửa" : "Edit") : (vi ? "Thêm" : "Add")} {vi ? "mã giảm giá" : "Discount Code"}</h3>
            <form onSubmit={handleSubmit}>
              <label>Code
                <input required value={formData.code || ""} onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })} placeholder="CODE10" />
              </label>
              <label>{vi ? "Loại giảm giá" : "Discount Type"}
                <select value={formData.discountType || "percentage"} onChange={(e) => setFormData({ ...formData, discountType: e.target.value })}>
                  <option value="percentage">{vi ? "Phần trăm" : "Percentage"}</option>
                  <option value="fixed">{vi ? "Số tiền cố định (VND)" : "Fixed amount (VND)"}</option>
                </select>
              </label>
              <label>{vi ? "Hạng phòng áp dụng" : "Applicable room type"}
                <select required value={formData.roomTypeId || ""} onChange={(e) => setFormData({ ...formData, roomTypeId: e.target.value })}>
                  <option value="" disabled>{vi ? "Chọn hạng phòng áp dụng" : "Choose an applicable room type"}</option>
                  <option value="all">{vi ? "Tất cả hạng phòng" : "All room types"}</option>
                  {roomTypes.length === 0 && !roomTypesError && (
                    <option value="" disabled>{vi ? "Chưa có hạng phòng hoạt động" : "No active room types available"}</option>
                  )}
                  {formData.roomTypeId && formData.roomTypeId !== "all" && !roomTypes.some((roomType) => String(roomType.id) === String(formData.roomTypeId)) && (
                    <option value={formData.roomTypeId}>{formData.roomTypeName || (vi ? "Hạng phòng không còn hoạt động" : "Inactive room type")}</option>
                  )}
                  {roomTypes.map((roomType) => <option key={roomType.id} value={roomType.id}>{roomType.name}</option>)}
                </select>
              </label>
              <label>Discount Value ({formData.discountType === "fixed" ? "VND" : "%"})
                <input required type="number" min={formData.discountType === "fixed" ? "1" : "0"} max={formData.discountType === "fixed" ? undefined : "100"} step="0.01" value={formData.discountValue ?? ""} onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })} />
              </label>
              <label>{vi ? "Có hiệu lực từ" : "Valid From"}
                <input required type="date" value={formData.validFrom || ""} onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })} />
              </label>
              <label>{vi ? "Có hiệu lực đến" : "Valid To"}
                <input required type="date" value={formData.validTo || ""} onChange={(e) => setFormData({ ...formData, validTo: e.target.value })} />
              </label>
              <label>{vi ? "Giới hạn lượt dùng (không bắt buộc)" : "Usage Limit (optional)"}
                <input type="number" min="1" value={formData.usageLimit ?? ""} placeholder={vi ? "Không giới hạn" : "Unlimited"} onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })} />
              </label>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowModal(false)}>{vi ? "Hủy" : "Cancel"}</button>
                <button type="submit" disabled={loading}>{loading ? (vi ? "Đang lưu…" : "Saving...") : (vi ? "Lưu" : "Save")}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
