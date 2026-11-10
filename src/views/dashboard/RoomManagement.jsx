import { useEffect, useState } from "react";
import { roomController } from "../../controllers/roomController.js";
import { catalogController } from "../../controllers/catalogController.js";
import { apiClient } from "../../services/apiClient.js";
import "./room-management.css";
import { translateCatalog, useLanguage } from "../../i18n.js";
import { useConfirmation } from "../useConfirmation.jsx";
import { useNotification } from "../useNotification.jsx";
import { Notification } from "../Notification.jsx";

const roomStatuses = ["available", "occupied", "maintenance", "cleaning"];

export function RoomManagement({ onRefresh, user }) {
  const [language] = useLanguage();
  const { confirm, dialog: confirmationDialog } = useConfirmation();
  const vi = language === "VI";
  const isAdmin = String(user?.role || "").toLowerCase() === "admin";
  const [rooms, setRooms] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);
  const [activeTab, setActiveTab] = useState("rooms");
  const [loading, setLoading] = useState(false);
  const [statusRoomId, setStatusRoomId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [formErrors, setFormErrors] = useState({});
  const [typeImageFile, setTypeImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const { notification, showNotification, hideNotification } = useNotification();

  useEffect(() => {
    loadData();
  }, [activeTab]);

  useEffect(() => {
    if (!typeImageFile) return undefined;
    const url = URL.createObjectURL(typeImageFile);
    setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [typeImageFile]);

  async function loadData() {
    setLoading(true);
    try {
      if (isAdmin) setRoomTypes(await catalogController.roomTypes());
      if (activeTab === "rooms") setRooms(await roomController.list());
    } catch (error) {
      showNotification(error.message, "error");
    } finally {
      setLoading(false);
    }
  }

  function validateRoomForm() {
    const errors = {};
    if (!String(formData.roomNumber || "").trim()) errors.roomNumber = vi ? "Vui lòng nhập số phòng." : "Room number is required.";
    if (!formData.roomTypeId) errors.roomTypeId = vi ? "Vui lòng chọn loại phòng." : "Select a room type.";
    if (formData.floor === "" || !Number.isInteger(Number(formData.floor)) || Number(formData.floor) < 0) {
      errors.floor = vi ? "Vui lòng nhập số tầng hợp lệ." : "Enter a valid floor number.";
    }
    if (!roomStatuses.includes(formData.status)) errors.status = vi ? "Vui lòng chọn trạng thái phòng hợp lệ." : "Select a valid room status.";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (activeTab === "rooms" && !validateRoomForm()) return;

    setLoading(true);
    try {
      if (activeTab === "rooms") {
        const payload = {
          roomNumber: formData.roomNumber.trim(),
          roomTypeId: Number(formData.roomTypeId),
          floor: Number(formData.floor),
          status: formData.status
        };
        if (editingItem) await roomController.update(editingItem.id, payload);
        else await roomController.create(payload);
      } else {
        let savedTypeId = editingItem?.id;
        if (editingItem) {
          await roomController.updateType(editingItem.id, formData);
        } else {
          const created = await roomController.createType(formData);
          savedTypeId = created?.roomtypeid;
        }
        if (typeImageFile && savedTypeId) {
          await roomController.uploadTypeImage(savedTypeId, typeImageFile);
        }
      }

      setShowModal(false);
      setEditingItem(null);
      setFormData({});
      setFormErrors({});
      setTypeImageFile(null);
      setImagePreview("");
      await loadData();
      const itemLabel = activeTab === "rooms" ? (vi ? "phòng" : "room") : (vi ? "loại phòng" : "room type");
      showNotification(editingItem ? (vi ? `Đã cập nhật ${itemLabel}.` : `${itemLabel.charAt(0).toUpperCase() + itemLabel.slice(1)} updated successfully.`) : (vi ? `Đã tạo ${itemLabel}.` : `${itemLabel.charAt(0).toUpperCase() + itemLabel.slice(1)} created successfully.`), "success");
      onRefresh?.();
    } catch (error) {
      if (activeTab === "rooms" && error.status === 409) {
        setFormErrors((current) => ({ ...current, roomNumber: error.message }));
      } else {
        showNotification(error.message, "error");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id) {
    const itemLabel = activeTab === "rooms" ? (vi ? "phòng" : "room") : (vi ? "loại phòng" : "room type");
    const confirmed = await confirm({
      title: vi ? "Xóa dữ liệu?" : "Delete this item?",
      message: vi
        ? `Bạn có chắc muốn xóa ${itemLabel} này không? Hành động này không thể hoàn tác.`
        : `Are you sure you want to delete this ${itemLabel}? This action cannot be undone.`,
      cancelLabel: vi ? "Giữ lại" : "Keep item",
      confirmLabel: vi ? "Xóa" : "Delete",
      tone: "danger"
    });
    if (!confirmed) return;
    setLoading(true);
    try {
      if (activeTab === "rooms") await roomController.delete(id);
      else await roomController.deleteType(id);
      await loadData();
      showNotification(vi ? `Đã xóa ${itemLabel}.` : `${itemLabel.charAt(0).toUpperCase() + itemLabel.slice(1)} deleted successfully.`, "success");
      onRefresh?.();
    } catch (error) {
      showNotification(error.message, "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateStatus(id, status) {
    const original = rooms.find((room) => room.id === id)?.status;
    setStatusRoomId(id);
    setRooms((current) => current.map((room) => room.id === id ? { ...room, status } : room));
    try {
      const updated = await roomController.updateStatus(id, status);
      setRooms((current) => current.map((room) => room.id === id ? { ...room, status: updated.status } : room));
      showNotification(vi ? "Đã cập nhật trạng thái phòng." : "Room status updated successfully.", "success");
      onRefresh?.();
    } catch (error) {
      setRooms((current) => current.map((room) => room.id === id ? { ...room, status: original } : room));
      showNotification(error.message, "error");
    } finally {
      setStatusRoomId(null);
    }
  }

  function openModal(item = null) {
    setEditingItem(item);
    setTypeImageFile(null);
    setImagePreview(item?.image ? apiClient.assetUrl(item.image) : "");
    setFormData(activeTab === "rooms"
      ? {
          roomNumber: item?.roomNumber || "",
          roomTypeId: item?.roomTypeId ? String(item.roomTypeId) : "",
          floor: String(item?.floor ?? 1),
          status: item?.status || "available"
        }
      : item || {});
    setFormErrors({});
    setShowModal(true);
  }

  function updateForm(field, value) {
    setFormData((current) => ({ ...current, [field]: value }));
    setFormErrors((current) => ({ ...current, [field]: "" }));
  }

  return (
    <section className="management-section room-management">
      {confirmationDialog}
      <header className="section-header room-management-header">
        <div>
          <h2>{activeTab === "rooms" ? (vi ? "Quản lý phòng" : "Room Management") : (vi ? "Quản lý hạng phòng" : "Room Type Management")}</h2>
          <p>{vi ? "Xem danh sách phòng và cập nhật trạng thái vận hành." : "View room inventory and keep operational status up to date."}</p>
        </div>
        {isAdmin && (
          <div className="room-management-actions">
            <div className="tabs" role="tablist" aria-label="Room management sections">
              <button type="button" role="tab" aria-selected={activeTab === "rooms"} className={activeTab === "rooms" ? "active" : ""} onClick={() => setActiveTab("rooms")}>{vi ? "Phòng" : "Rooms"}</button>
              <button type="button" role="tab" aria-selected={activeTab === "types"} className={activeTab === "types" ? "active" : ""} onClick={() => setActiveTab("types")}>{vi ? "Loại phòng" : "Room Types"}</button>
            </div>
            <button type="button" className="primary-btn" onClick={() => openModal()}>
              + {activeTab === "rooms" ? (vi ? "Thêm phòng" : "Add New Room") : (vi ? "Thêm loại phòng" : "Add Room Type")}
            </button>
          </div>
        )}
      </header>

      <Notification notification={notification} onClose={hideNotification} />
      {loading && <p className="loading" role="status">{vi ? "Đang tải…" : "Loading..."}</p>}

      {activeTab === "rooms" ? (
        <div className="room-management-table-wrap">
          <table className="data-table room-management-table">
            <thead>
              <tr>
                <th>{vi ? "Số phòng" : "Room Number"}</th>
                <th>{vi ? "Loại phòng" : "Room Type"}</th>
                <th>{vi ? "Tầng" : "Floor"}</th>
                <th>{vi ? "Trạng thái hiện tại" : "Current Status"}</th>
                {isAdmin && <th>{vi ? "Thao tác" : "Actions"}</th>}
              </tr>
            </thead>
            <tbody>
              {rooms.map((room) => (
                <tr key={room.id}>
                  <td className="room-number-cell">{room.roomNumber}</td>
                  <td>{translateCatalog(room.type, language)}</td>
                  <td>{room.floor ?? 1}</td>
                  <td>
                    <select
                      aria-label={`Status for room ${room.roomNumber}`}
                      value={room.status}
                      disabled={statusRoomId === room.id}
                      onChange={(event) => handleUpdateStatus(room.id, event.target.value)}
                    >
                      {roomStatuses.map((status) => <option key={status} value={status}>{vi ? ({ available: "Trống", occupied: "Đang ở", cleaning: "Đang dọn", maintenance: "Bảo trì" }[status] || status) : status[0].toUpperCase() + status.slice(1)}</option>)}
                    </select>
                  </td>
                  {isAdmin && (
                    <td className="room-action-cell">
                      <button type="button" onClick={() => openModal(room)}>{vi ? "Sửa" : "Edit"}</button>
                      <button type="button" className="room-delete-button" onClick={() => handleDelete(room.id)}>{vi ? "Xóa" : "Delete"}</button>
                    </td>
                  )}
                </tr>
              ))}
              {!loading && rooms.length === 0 && (
                <tr><td colSpan={isAdmin ? 5 : 4} className="room-empty-cell">{vi ? "Không tìm thấy phòng." : "No rooms found."}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="room-management-table-wrap">
          <table className="data-table">
            <thead><tr><th>{vi ? "Ảnh" : "Image"}</th><th>{vi ? "Tên" : "Name"}</th><th>{vi ? "Giá" : "Price"}</th><th>{vi ? "Sức chứa" : "Capacity"}</th><th>{vi ? "Tiện nghi" : "Amenities"}</th><th>{vi ? "Thao tác" : "Actions"}</th></tr></thead>
            <tbody>
              {roomTypes.map((type) => (
                <tr key={type.id}>
                  <td>{type.image ? <img className="room-type-thumb" src={apiClient.assetUrl(type.image)} alt={type.name} /> : <span className="hint">—</span>}</td>
                  <td>{translateCatalog(type.name, language)}</td>
                  <td>{new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(type.price || 0)}</td>
                  <td>{type.capacity} {vi ? "khách" : "guests"}</td>
                  <td>{type.amenities}</td>
                  <td className="room-action-cell">
                    <button type="button" onClick={() => openModal(type)}>{vi ? "Sửa" : "Edit"}</button>
                    <button type="button" className="room-delete-button" onClick={() => handleDelete(type.id)}>{vi ? "Xóa" : "Delete"}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && isAdmin && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal room-management-modal" role="dialog" aria-modal="true" aria-labelledby="room-modal-title" onClick={(event) => event.stopPropagation()}>
            <h3 id="room-modal-title">{editingItem ? (vi ? "Sửa" : "Edit") : (vi ? "Thêm" : "Add")} {activeTab === "rooms" ? (vi ? "phòng" : "Room") : (vi ? "loại phòng" : "Room Type")}</h3>
            <form onSubmit={handleSubmit} noValidate>
              {activeTab === "rooms" ? (
                <>
                  <label>{vi ? "Số phòng" : "Room Number"}
                    <input className={formErrors.roomNumber ? "field-error" : ""} aria-invalid={Boolean(formErrors.roomNumber)} value={formData.roomNumber || ""} onChange={(event) => updateForm("roomNumber", event.target.value)} />
                    {formErrors.roomNumber && <span className="room-field-error">{formErrors.roomNumber}</span>}
                  </label>
                  <label>{vi ? "Loại phòng" : "Room Type"}
                    <select className={formErrors.roomTypeId ? "field-error" : ""} aria-invalid={Boolean(formErrors.roomTypeId)} value={formData.roomTypeId || ""} onChange={(event) => updateForm("roomTypeId", event.target.value)}>
                      <option value="">{vi ? "Chọn loại phòng" : "Select type"}</option>
                      {roomTypes.map((type) => <option key={type.id} value={type.id}>{translateCatalog(type.name, language)}</option>)}
                    </select>
                    {formErrors.roomTypeId && <span className="room-field-error">{formErrors.roomTypeId}</span>}
                  </label>
                  <label>{vi ? "Tầng" : "Floor"}
                    <input className={formErrors.floor ? "field-error" : ""} aria-invalid={Boolean(formErrors.floor)} type="number" min="0" step="1" value={formData.floor ?? ""} onChange={(event) => updateForm("floor", event.target.value)} />
                    {formErrors.floor && <span className="room-field-error">{formErrors.floor}</span>}
                  </label>
                  <label>{vi ? "Trạng thái" : "Status"}
                    <select className={formErrors.status ? "field-error" : ""} aria-invalid={Boolean(formErrors.status)} value={formData.status || "available"} onChange={(event) => updateForm("status", event.target.value)}>
                      {roomStatuses.map((status) => <option key={status} value={status}>{vi ? ({ available: "Trống", occupied: "Đang ở", cleaning: "Đang dọn", maintenance: "Bảo trì" }[status] || status) : status[0].toUpperCase() + status.slice(1)}</option>)}
                    </select>
                    {formErrors.status && <span className="room-field-error">{formErrors.status}</span>}
                  </label>
                </>
              ) : (
                <>
                  <label>{vi ? "Tên" : "Name"}<input required value={formData.name || ""} onChange={(event) => updateForm("name", event.target.value)} /></label>
                  <label>{vi ? "Giá" : "Price"}<input required type="number" min="0" value={formData.price || ""} onChange={(event) => updateForm("price", Number(event.target.value))} /></label>
                  <label>{vi ? "Sức chứa" : "Capacity"}<input required type="number" min="1" value={formData.capacity || ""} onChange={(event) => updateForm("capacity", Number(event.target.value))} /></label>
                  <label>{vi ? "Tiện nghi" : "Amenities"}<input value={formData.amenities || ""} onChange={(event) => updateForm("amenities", event.target.value)} placeholder={vi ? "WiFi, TV, điều hòa..." : "WiFi, TV, AC, etc."} /></label>
                  <label>{vi ? "Mô tả" : "Description"}<textarea value={formData.description || ""} onChange={(event) => updateForm("description", event.target.value)} /></label>
                  <label>{vi ? "Ảnh loại phòng" : "Room type image"}
                    <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => setTypeImageFile(event.target.files?.[0] || null)} />
                  </label>
                  {imagePreview && <img className="room-type-preview" src={imagePreview} alt={vi ? "Xem trước ảnh loại phòng" : "Room type image preview"} />}
                </>
              )}
              <div className="modal-actions">
                <button type="button" onClick={() => setShowModal(false)}>{vi ? "Hủy" : "Cancel"}</button>
                <button type="submit" disabled={loading}>{loading ? (vi ? "Đang lưu…" : "Saving...") : (vi ? "Lưu" : "Save")}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
