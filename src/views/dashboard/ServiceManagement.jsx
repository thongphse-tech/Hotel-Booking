import { useState, useEffect } from "react";
import { catalogController } from "../../controllers/catalogController.js";
import { translateCatalog, useLanguage } from "../../i18n.js";
import { bookingController } from "../../controllers/bookingController.js";
import { useNotification } from "../useNotification.jsx";
import { Notification } from "../Notification.jsx";

const money = (value) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(Number(value || 0));

export function ServiceManagement({ onRefresh, user }) {
  const [language] = useLanguage();
  const vi = language === "VI";
  const isAdmin = String(user?.role || "").toLowerCase() === "admin";
  const [activeTab, setActiveTab] = useState(isAdmin ? "catalog" : "bookings");
  const [services, setServices] = useState([]);
  const [serviceBookings, setServiceBookings] = useState([]);
  const [inHouseBookings, setInHouseBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showBookModal, setShowBookModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [bookForm, setBookForm] = useState({ bookingId: "", serviceId: "", serviceDate: "", timeSlot: "", quantity: "1", specialNotes: "" });
  const { notification, showNotification, hideNotification } = useNotification();

  useEffect(() => {
    loadServices();
  }, [activeTab]);

  async function loadServices() {
    setLoading(true);
    try {
      const items = await catalogController.services();
      setServices(items);
      if (activeTab === "bookings") {
        const [allBookings, allServiceBookings] = await Promise.all([
          bookingController.list(),
          catalogController.serviceBookings()
        ]);
        setInHouseBookings(allBookings.filter((b) => b.status === "Checked In"));
        setServiceBookings(allServiceBookings || []);
      }
    } catch (error) {
      showNotification(error.message, "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingItem) {
        await catalogController.updateService(editingItem.id, formData);
      } else {
        await catalogController.createService(formData);
      }
      setShowModal(false);
      setEditingItem(null);
      setFormData({});
      await loadServices();
      showNotification(editingItem ? (vi ? "Đã cập nhật dịch vụ." : "Service updated successfully.") : (vi ? "Đã tạo dịch vụ mới." : "Service created successfully."), "success");
      onRefresh?.();
    } catch (error) {
      showNotification(error.message, "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm(vi ? "Bạn có chắc chắn muốn ngừng cung cấp dịch vụ này? Dịch vụ sẽ được ẩn khỏi danh mục nhưng dữ liệu lịch sử vẫn được giữ lại." : "Are you sure you want to deactivate this service? It will be hidden from the catalog while historical data is retained.")) return;
    setLoading(true);
    try {
      await catalogController.deleteService(id);
      await loadServices();
      showNotification(vi ? "Đã xóa dịch vụ." : "Service deleted successfully.", "success");
      onRefresh?.();
    } catch (error) {
      showNotification(error.message, "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleBookService(e) {
    e.preventDefault();
    if (!bookForm.bookingId || !bookForm.serviceId) {
      showNotification(vi ? "Vui lòng chọn phòng khách đang ở và dịch vụ cần đặt." : "Select an occupied room and a service.", "error");
      return;
    }
    setLoading(true);
    try {
      await catalogController.bookService({
        bookingId: Number(bookForm.bookingId),
        serviceId: Number(bookForm.serviceId),
        serviceDate: bookForm.serviceDate,
        timeSlot: bookForm.timeSlot || "Theo yêu cầu",
        quantity: Number(bookForm.quantity || 1),
        specialNotes: bookForm.specialNotes
      });
      showNotification(vi ? "✅ Đã đặt dịch vụ thành công cho khách hàng!" : "✅ Service order created successfully for the guest!", "success");
      setShowBookModal(false);
      setBookForm({ bookingId: "", serviceId: "", serviceDate: "", timeSlot: "", quantity: "1", specialNotes: "" });
      await loadServices();
    } catch (error) {
      showNotification(`${vi ? "Lỗi đặt dịch vụ" : "Service order failed"}: ${error.message}`, "error");
    } finally {
      setLoading(false);
    }
  }

  function openModal(item = null) {
    setEditingItem(item);
    setFormData(item || {});
    setShowModal(true);
  }

  return (
    <div className="management-section">
      <div className="section-header">
        <h2>{activeTab === "catalog" ? (vi ? "Quản lý dịch vụ khách sạn" : "Hotel Service Management") : (vi ? "Đặt dịch vụ cho khách & Đơn dịch vụ" : "Guest Service Orders")}</h2>
        <Notification notification={notification} onClose={hideNotification} />
        <div style={{ display: "flex", gap: "10px" }}>
          <div className="tabs">
            {!isAdmin && <button className={activeTab === "bookings" ? "active" : ""} onClick={() => setActiveTab("bookings")}>
              {vi ? "Đơn đặt dịch vụ (Vận hành Staff)" : "Service Orders (Staff operations)"}
            </button>}
          </div>
          {isAdmin ? (
            <button className="primary-btn" onClick={() => openModal()}>+ {vi ? "Thêm dịch vụ mới" : "Add service"}</button>
          ) : (
            <button className="primary-btn" style={{ background: "#f97316" }} onClick={() => setShowBookModal(true)}>
              🛎️ {vi ? "Đặt dịch vụ cho khách" : "Book service for guest"}
            </button>
          )}
        </div>
      </div>

      {loading && <p className="loading">{vi ? "Đang tải dữ liệu…" : "Loading data…"}</p>}

      {activeTab === "catalog" ? (
        <table className="data-table">
          <thead>
            <tr>
              <th>{vi ? "Tên dịch vụ" : "Service name"}</th>
              <th>{vi ? "Mô tả" : "Description"}</th>
              <th>{vi ? "Đơn giá" : "Unit price"}</th>
              <th>{vi ? "Phân loại" : "Category"}</th>
              <th>{vi ? "Số lượng tối đa" : "Maximum capacity"}</th>
              <th>{vi ? "Thao tác" : "Actions"}</th>
            </tr>
          </thead>
          <tbody>
            {services.map((service) => (
              <tr key={service.id}>
                <td><strong>{translateCatalog(service.name, language)}</strong></td>
                <td>{translateCatalog(service.description, language)}</td>
                <td><strong>{money(service.price)}</strong></td>
                <td>{translateCatalog(service.category, language)}</td>
                <td>{service.capacity || (vi ? "Không giới hạn" : "Unlimited")}</td>
                <td>
                  <button onClick={() => openModal(service)}>{vi ? "Sửa" : "Edit"}</button>
                  <button onClick={() => handleDelete(service.id)} style={{ color: "#dc2626" }}>{vi ? "Ngừng cung cấp" : "Deactivate"}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>{vi ? "Mã đơn" : "Order ID"}</th>
              <th>{vi ? "Phòng / Đơn" : "Room / Booking"}</th>
              <th>{vi ? "Tên dịch vụ" : "Service name"}</th>
              <th>{vi ? "Ngày phục vụ" : "Service date"}</th>
              <th>{vi ? "Khung giờ" : "Time slot"}</th>
              <th>{vi ? "Số lượng" : "Quantity"}</th>
              <th>{vi ? "Tổng tiền" : "Total"}</th>
              <th>{vi ? "Ghi chú" : "Notes"}</th>
            </tr>
          </thead>
          <tbody>
            {serviceBookings.map((sb) => (
              <tr key={sb.servicebookingid}>
                <td>#{sb.servicebookingid}</td>
                <td><strong>P.{sb.roomnumber}</strong> (Đơn #{sb.bookingid})</td>
                <td><strong>{sb.servicename}</strong></td>
                <td>{sb.servicedate ? String(sb.servicedate).slice(0, 10) : "-"}</td>
                <td>{sb.timeslot || "Linh hoạt"}</td>
                <td>{sb.quantity}</td>
                <td><strong>{money(sb.totalprice)}</strong></td>
                <td>{sb.specialnotes || "-"}</td>
              </tr>
            ))}
            {serviceBookings.length === 0 && !loading && (
              <tr>
                <td colSpan="8" style={{ textAlign: "center", padding: "24px", color: "#64748b" }}>
                  {vi ? <>Chưa có đơn đặt dịch vụ nào. Bấm nút <strong>"Đặt dịch vụ cho khách"</strong> để tạo đơn.</> : <>No service orders found. Click <strong>"Book service for guest"</strong> to create one.</>}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      {/* Modal Thêm/Sửa Dịch vụ */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{editingItem ? (vi ? "Sửa" : "Edit") : (vi ? "Thêm mới" : "Add")} {vi ? "Dịch vụ khách sạn" : "Hotel Service"}</h3>
            <form onSubmit={handleSubmit}>
              <label>{vi ? "Tên dịch vụ" : "Service name"}
                <input required value={formData.name || ""} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder={vi ? "VD: Buffet sáng, Spa, Đưa đón..." : "e.g. Breakfast buffet, Spa, Airport transfer..."} />
              </label>
              <label>{vi ? "Mô tả dịch vụ" : "Service description"}
                <textarea value={formData.description || ""} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
              </label>
              <label>{vi ? "Đơn giá (VND)" : "Unit price (VND)"}
                <input required type="number" min="0" value={formData.price || ""} onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })} />
              </label>
              <label>{vi ? "Phân loại" : "Category"}
                <input required value={formData.category || "General"} onChange={(e) => setFormData({ ...formData, category: e.target.value })} />
              </label>
              <label>{vi ? "Giới hạn phục vụ" : "Service capacity"}
                <input type="number" value={formData.capacity || ""} onChange={(e) => setFormData({ ...formData, capacity: e.target.value ? Number(e.target.value) : null })} placeholder="Bỏ trống nếu không giới hạn" />
              </label>
              <label>{vi ? "Điều kiện áp dụng" : "Conditions"}
                <textarea value={formData.conditions || ""} onChange={(e) => setFormData({ ...formData, conditions: e.target.value })} />
              </label>
              <label>{vi ? "Giờ hoạt động" : "Operating hours"}
                <input maxLength="120" value={formData.operatingHours || ""} onChange={(e) => setFormData({ ...formData, operatingHours: e.target.value })} placeholder="VD: 06:00 - 22:00 hằng ngày" />
              </label>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowModal(false)}>{vi ? "Hủy" : "Cancel"}</button>
                <button type="submit" disabled={loading}>{loading ? (vi ? "Đang lưu…" : "Saving…") : (vi ? "Lưu dịch vụ" : "Save service")}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Đặt dịch vụ cho khách */}
      {showBookModal && (
        <div className="modal-overlay" onClick={() => setShowBookModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{vi ? "Đặt dịch vụ cho khách lưu trú" : "Book service for in-house guest"}</h3>
            <form onSubmit={handleBookService}>
              <label>{vi ? "Khách hàng & phòng đang lưu trú" : "Guest & in-house room"}
                <select required value={bookForm.bookingId} onChange={(e) => setBookForm({ ...bookForm, bookingId: e.target.value })}>
                  <option value="">-- {vi ? "Chọn phòng khách đang ở" : "Select occupied room"} --</option>
                  {inHouseBookings.map((b) => (
                    <option key={b.id} value={b.id}>
                      #{b.id} · {b.customerName} ({b.roomName}) · {b.status}
                    </option>
                  ))}
                </select>
              </label>
              <label>{vi ? "Dịch vụ cần đặt" : "Service"}
                <select required value={bookForm.serviceId} onChange={(e) => setBookForm({ ...bookForm, serviceId: e.target.value })}>
                  <option value="">-- {vi ? "Chọn dịch vụ" : "Select service"} --</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} - {money(s.price)}
                    </option>
                  ))}
                </select>
              </label>
              <label>{vi ? "Ngày phục vụ" : "Service date"}
                <input required type="date" value={bookForm.serviceDate} onChange={(e) => setBookForm({ ...bookForm, serviceDate: e.target.value })} />
              </label>
              <label>{vi ? "Khung giờ phục vụ" : "Service time"}
                <select required value={bookForm.timeSlot} onChange={(e) => setBookForm({ ...bookForm, timeSlot: e.target.value })}>
                  <option value="">{vi ? "Chọn khung giờ" : "Select time slot"}</option>
                  <option value="06:00-07:00">06:00 - 07:00</option>
                  <option value="07:00-08:00">07:00 - 08:00</option>
                  <option value="08:00-09:00">08:00 - 09:00</option>
                  <option value="09:00-10:00">09:00 - 10:00</option>
                  <option value="10:00-11:00">10:00 - 11:00</option>
                  <option value="11:00-12:00">11:00 - 12:00</option>
                  <option value="12:00-13:00">12:00 - 13:00</option>
                  <option value="13:00-14:00">13:00 - 14:00</option>
                  <option value="14:00-15:00">14:00 - 15:00</option>
                  <option value="15:00-16:00">15:00 - 16:00</option>
                  <option value="16:00-17:00">16:00 - 17:00</option>
                  <option value="17:00-18:00">17:00 - 18:00</option>
                  <option value="18:00-19:00">18:00 - 19:00</option>
                  <option value="19:00-20:00">19:00 - 20:00</option>
                  <option value="20:00-21:00">20:00 - 21:00</option>
                  <option value="21:00-22:00">21:00 - 22:00</option>
                  <option value="Theo yêu cầu">{vi ? "Theo yêu cầu" : "As requested"}</option>
                </select>
              </label>
              <label>{vi ? "Số lượng" : "Quantity"}
                <input required type="number" min="1" value={bookForm.quantity} onChange={(e) => setBookForm({ ...bookForm, quantity: e.target.value })} />
              </label>
              <label>{vi ? "Ghi chú của khách" : "Guest notes"}
                <textarea value={bookForm.specialNotes} onChange={(e) => setBookForm({ ...bookForm, specialNotes: e.target.value })} placeholder={vi ? "VD: Giao lên phòng lúc 8h..." : "e.g. Deliver to the room at 8 AM..."} />
              </label>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowBookModal(false)}>{vi ? "Hủy" : "Cancel"}</button>
                <button type="submit" disabled={loading}>{loading ? (vi ? "Đang xử lý…" : "Processing…") : (vi ? "Xác nhận đặt dịch vụ" : "Confirm service order")}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
