import { useEffect, useMemo, useState } from "react";
import { catalogController } from "../../controllers/catalogController.js";
import { useLanguage } from "../../i18n.js";
import { useConfirmation } from "../useConfirmation.jsx";
import { useNotification } from "../useNotification.jsx";
import { Notification } from "../Notification.jsx";

const formatDate = (value) => value ? new Date(value).toLocaleDateString("vi-VN") : "-";
const formatMoney = (value) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value || 0);

export function CustomerManagement({ user, onRefresh }) {
  const [language] = useLanguage();
  const { confirm, dialog: confirmationDialog } = useConfirmation();
  const vi = language === "VI";
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({});
  const isAdmin = user?.role === "admin";
  const { notification, showNotification, hideNotification } = useNotification();

  useEffect(() => { loadCustomers(); }, []);

  async function loadCustomers() {
    setLoading(true);
    try {
      setCustomers(await catalogController.customers());
    } catch (error) {
      showNotification(error.message, "error");
    } finally {
      setLoading(false);
    }
  }

  const filteredCustomers = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return customers;
    return customers.filter((customer) => [customer.fullName, customer.email, customer.phone].some((value) => String(value || "").toLowerCase().includes(keyword)));
  }, [customers, search]);

  async function openProfile(customer) {
    setLoading(true);
    try {
      setSelectedCustomer(await catalogController.customer(customer.id));
    } catch (error) {
      showNotification(error.message, "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    try {
      const updated = await catalogController.updateCustomer(editing.id, formData);
      setCustomers((items) => items.map((item) => item.id === editing.id ? { ...item, ...formData } : item));
      setEditing(null);
      showNotification(updated.message || (vi ? "Đã cập nhật thông tin khách hàng." : "Customer details updated successfully."), "success");
      onRefresh?.();
    } catch (error) {
      showNotification(error.message, "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleStatus(customer) {
    const action = customer.isActive ? "deactivate" : "activate";
    const confirmed = await confirm({
      title: vi
        ? `${customer.isActive ? "Vô hiệu hóa" : "Kích hoạt"} tài khoản?`
        : `${customer.isActive ? "Deactivate" : "Activate"} account?`,
      message: vi
        ? `Bạn có chắc muốn ${customer.isActive ? "vô hiệu hóa" : "kích hoạt"} tài khoản khách hàng này không?`
        : `Are you sure you want to ${action} this customer account?`,
      cancelLabel: vi ? "Để sau" : "Cancel",
      confirmLabel: vi ? (customer.isActive ? "Vô hiệu hóa" : "Kích hoạt") : (customer.isActive ? "Deactivate" : "Activate"),
      tone: customer.isActive ? "danger" : "warning"
    });
    if (!confirmed) return;
    setLoading(true);
    try {
      await catalogController.setCustomerActive(customer.id, !customer.isActive);
      setCustomers((items) => items.map((item) => item.id === customer.id ? { ...item, isActive: !customer.isActive } : item));
      if (selectedCustomer?.id === customer.id) setSelectedCustomer((item) => ({ ...item, isActive: !customer.isActive }));
      showNotification(vi ? `Đã ${customer.isActive ? "vô hiệu hóa" : "kích hoạt"} tài khoản khách hàng.` : `Customer account ${action}d successfully.`, "success");
      onRefresh?.();
    } catch (error) {
      showNotification(error.message, "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="management-section">
      {confirmationDialog}
      <div className="section-header">
        <div>
          <h2>{vi ? "Quản lý khách hàng" : "Manage Customers"}</h2>
          <p className="hint">{vi ? "Xem hồ sơ và lịch sử đặt phòng. Staff có thể sửa thông tin liên hệ; chỉ Admin được đổi trạng thái tài khoản." : "View customer profiles and reservation history. Staff can edit contact details; only administrators can change account status."}</p>
        </div>
      </div>
      <Notification notification={notification} onClose={hideNotification} />
      <div className="customer-toolbar">
        <input aria-label={vi ? "Tìm khách hàng" : "Search customers"} placeholder={vi ? "Tìm theo tên, email hoặc số điện thoại..." : "Search by name, email or phone..."} value={search} onChange={(event) => setSearch(event.target.value)} />
        <span>{filteredCustomers.length} {vi ? "khách hàng" : "customer(s)"}</span>
      </div>
      {loading && <p className="loading">{vi ? "Đang tải…" : "Loading..."}</p>}
      <div className="table-wrap">
        <table className="data-table">
          <thead><tr><th>ID</th><th>{vi ? "Tên" : "Name"}</th><th>Email</th><th>{vi ? "Điện thoại" : "Phone"}</th><th>{vi ? "Đặt phòng" : "Reservations"}</th><th>{vi ? "Trạng thái" : "Status"}</th><th>{vi ? "Thao tác" : "Actions"}</th></tr></thead>
          <tbody>
            {filteredCustomers.map((customer) => (
              <tr key={customer.id}>
                <td>#{customer.id}</td>
                <td>{customer.fullName}</td>
                <td>{customer.email}</td>
                <td>{customer.phone || "-"}</td>
                <td>{customer.bookingCount ?? 0}</td>
                <td><span className={`status ${customer.isActive ? "active" : "inactive"}`}>{customer.isActive ? (vi ? "Đang hoạt động" : "Active") : (vi ? "Đã khóa" : "Suspended")}</span></td>
                <td className="actions">
                  <button onClick={() => openProfile(customer)}>{vi ? "Xem hồ sơ" : "View Profile"}</button>
                  <button onClick={() => { setEditing(customer); setFormData({ fullName: customer.fullName, email: customer.email, phone: customer.phone || "", address: customer.address || "" }); }}>{vi ? "Sửa" : "Edit"}</button>
                  {isAdmin && <button onClick={() => handleToggleStatus(customer)}>{customer.isActive ? (vi ? "Vô hiệu hóa" : "Deactivate") : (vi ? "Kích hoạt" : "Activate")}</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedCustomer && <div className="modal-overlay" onClick={() => setSelectedCustomer(null)}>
        <div className="modal customer-profile-modal" onClick={(event) => event.stopPropagation()}>
          <h3>{vi ? "Hồ sơ khách hàng" : "Customer Profile"}</h3>
          <p><strong>{selectedCustomer.fullName}</strong> · {selectedCustomer.isActive ? (vi ? "Đang hoạt động" : "Active") : (vi ? "Đã khóa" : "Suspended")}</p>
          <p>{selectedCustomer.email}<br />{selectedCustomer.phone || (vi ? "Chưa có số điện thoại" : "No phone")}<br />{selectedCustomer.address || (vi ? "Chưa có địa chỉ" : "No address")}</p>
          <h4>{vi ? "Lịch sử đặt phòng" : "Reservation History"} ({selectedCustomer.bookings.length})</h4>
          {selectedCustomer.bookings.length === 0 ? <p>{vi ? "Không tìm thấy đặt phòng." : "No reservations found."}</p> : <div className="table-wrap"><table><thead><tr><th>Booking</th><th>Room</th><th>Stay</th><th>Status</th><th>Total</th></tr></thead><tbody>
            {selectedCustomer.bookings.map((booking) => <tr key={booking.id}><td>#{booking.id}</td><td>{booking.roomType} · {booking.roomNumber}</td><td>{formatDate(booking.checkIn)} - {formatDate(booking.checkOut)}</td><td>{booking.status}</td><td>{formatMoney(booking.totalAmount)}</td></tr>)}
          </tbody></table></div>}
          <button className="outline-btn" onClick={() => setSelectedCustomer(null)}>{vi ? "Đóng" : "Close"}</button>
        </div>
      </div>}

      {editing && <div className="modal-overlay" onClick={() => setEditing(null)}>
        <div className="modal" onClick={(event) => event.stopPropagation()}>
          <h3>{vi ? "Sửa khách hàng" : "Edit Customer"}</h3>
          <form onSubmit={handleSubmit}>
            <label>{vi ? "Họ và tên" : "Full Name"}<input required maxLength="100" value={formData.fullName || ""} onChange={(event) => setFormData({ ...formData, fullName: event.target.value })} /></label>
            <label>Email<input required type="email" maxLength="100" value={formData.email || ""} onChange={(event) => setFormData({ ...formData, email: event.target.value })} /></label>
            <label>{vi ? "Điện thoại" : "Phone"}<input maxLength="20" value={formData.phone || ""} onChange={(event) => setFormData({ ...formData, phone: event.target.value })} /></label>
            <label>{vi ? "Địa chỉ" : "Address"}<input maxLength="255" value={formData.address || ""} onChange={(event) => setFormData({ ...formData, address: event.target.value })} /></label>
            <div className="modal-actions"><button type="button" onClick={() => setEditing(null)}>{vi ? "Hủy" : "Cancel"}</button><button type="submit" disabled={loading}>{loading ? (vi ? "Đang lưu…" : "Saving...") : (vi ? "Lưu thay đổi" : "Save Changes")}</button></div>
          </form>
        </div>
      </div>}
    </div>
  );
}
