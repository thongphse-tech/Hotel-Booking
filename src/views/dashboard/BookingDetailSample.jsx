import { useState } from "react";
import { useLanguage } from "../../i18n.js";

const formatVND = (num) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(num || 0);

export function BookingDetailSample({ onBack, bookingData }) {
  const [language] = useLanguage();
  const vi = language === "VI";
  // Dữ liệu ban đầu (nếu có bookingData thì lấy từ đó, nếu không dùng dữ liệu demo)
  const initialRoomPrice = bookingData?.total ? Number(bookingData.total) : 3600000;
  const initialRoomName = bookingData?.roomName || "Phòng Deluxe 201";
  const initialCustomer = bookingData?.customerName || "Nguyễn Văn A";
  const bookingCode = bookingData?.id ? `#BK-${bookingData.id}` : "#BK-2026";

  const [items, setItems] = useState([
    { id: 1, name: `${initialRoomName} (3 đêm)`, unit: "đêm", price: initialRoomPrice, quantity: 1, isRoom: true },
    { id: 2, name: "Ăn sáng Buffet (2 khách)", unit: "suất", price: 150000, quantity: 2, isRoom: false },
  ]);

  // Form thêm dịch vụ thủ công
  const [newItem, setNewItem] = useState({ name: "", unit: "lượt", price: "" });
  const [extraFee, setExtraFee] = useState(100000); // Phụ thu / Vận chuyển
  const [days, setDays] = useState(3);
  const [notes, setNotes] = useState("Khách yêu cầu phòng yên tĩnh tầng cao, check-in sớm 1 tiếng.");

  // Danh mục dịch vụ gợi ý (Chip tag có dấu + như Ảnh 2)
  const quickServices = [
    { name: "Đưa đón sân bay", unit: "chuyến", price: 300000 },
    { name: "Spa toàn thân 60p", unit: "suất", price: 500000 },
    { name: "Giặt ủi nhanh", unit: "bộ", price: 100000 },
    { name: "Thuê xe máy tay ga", unit: "ngày", price: 150000 },
    { name: "Hoa tươi & Rượu vang", unit: "combo", price: 350000 },
    { name: "Phục vụ tại phòng (Room Service)", unit: "lượt", price: 80000 },
  ];

  // Thêm nhanh từ Chip Tag
  function addQuickService(service) {
    setItems((prev) => [
      ...prev,
      { id: Date.now(), name: service.name, unit: service.unit, price: service.price, quantity: 1, isRoom: false }
    ]);
  }

  // Thêm dịch vụ từ form thủ công
  function handleAddItem(e) {
    e.preventDefault();
    if (!newItem.name.trim() || !newItem.price) return;
    setItems((prev) => [
      ...prev,
      {
        id: Date.now(),
        name: newItem.name.trim(),
        unit: newItem.unit.trim() || "lượt",
        price: Number(newItem.price),
        quantity: 1,
        isRoom: false
      }
    ]);
    setNewItem({ name: "", unit: "lượt", price: "" });
  }

  // Xóa dịch vụ
  function removeItem(id) {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  // Cập nhật số lượng
  function updateQuantity(id, qty) {
    const validQty = Math.max(1, Number(qty) || 1);
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, quantity: validQty } : item)));
  }

  // Tính toán tổng hợp chi phí
  const roomCost = items.filter((i) => i.isRoom).reduce((sum, i) => sum + i.price * (i.quantity || 1), 0);
  const servicesCost = items.filter((i) => !i.isRoom).reduce((sum, i) => sum + i.price * (i.quantity || 1), 0);
  const grandTotal = roomCost + servicesCost + Number(extraFee || 0);

  return (
    <div className="booking-detail-page">
      {/* 1. Header & Nút Quay lại */}
      <div className="detail-page-header">
        <button className="back-btn-link" onClick={onBack}>
          ← {vi ? "Quay lại" : "Back"}
        </button>
        <div className="eyebrow-tag">{vi ? "CHI TIẾT ĐẶT PHÒNG & HÓA ĐƠN" : "BOOKING & INVOICE DETAILS"}</div>
        <h1 className="detail-main-title">
          {vi ? "Chi tiết đặt phòng" : "Booking details"} {bookingCode} · {vi ? "Khách" : "Guest"}: {initialCustomer}
        </h1>
        <p className="detail-sub-title">
          {vi ? "Hạng phòng" : "Room type"}: {initialRoomName} · {vi ? "Thời gian lưu trú" : "Stay"}: {days} {vi ? "ngày" : "days"} {Math.max(1, days - 1)} {vi ? "đêm" : "nights"}
        </p>
      </div>

      {/* 2. Grid 2 Cột (65% Form & Danh mục - 35% Summary Card) */}
      <div className="detail-two-col-grid">
        {/* CỘT TRÁI (~65%) */}
        <div className="form-card-left">
          <p className="section-caption-orange">{vi ? "DANH MỤC DỊCH VỤ & PHỤ PHÍ CẦN DÙNG" : "SERVICES & EXTRA CHARGES"}</p>

          {/* Hàng Input nhập mới */}
          <form className="input-inline-row" onSubmit={handleAddItem}>
            <div className="form-field-group">
              <label>{vi ? "Dịch vụ / Hạng mục" : "Service / Item"}</label>
              <input
                placeholder={vi ? "VD: Nước suối thêm, phụ thu..." : "e.g. Extra water, surcharge..."}
                value={newItem.name}
                onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
              />
            </div>
            <div className="form-field-group">
              <label>{vi ? "Đơn vị" : "Unit"}</label>
              <input
                placeholder={vi ? "lượt, suất..." : "visit, serving..."}
                value={newItem.unit}
                onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
              />
            </div>
            <div className="form-field-group">
              <label>{vi ? "Đơn giá (VND)" : "Unit price (VND)"}</label>
              <input
                type="number"
                placeholder="0"
                value={newItem.price}
                onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
              />
            </div>
            <button type="submit" className="btn-add-item">
              + {vi ? "Thêm" : "Add"}
            </button>
          </form>

          {/* Thẻ gợi ý dịch vụ có dấu + (Chip tags như Ảnh 2) */}
          <div className="chip-section-wrap">
            <p className="section-caption-orange" style={{ fontSize: "10.5px" }}>
              {vi ? "TỪ DỊCH VỤ CỦA KHÁCH SẠN (BẤM ĐỂ THÊM NHANH)" : "HOTEL SERVICES (CLICK TO ADD)"}
            </p>
            <div className="chip-tags-list">
              {quickServices.map((qs) => (
                <button
                  key={qs.name}
                  type="button"
                  className="service-pill-chip"
                  onClick={() => addQuickService(qs)}
                >
                  + {qs.name} ({formatVND(qs.price)})
                </button>
              ))}
            </div>
          </div>

          {/* Bảng danh sách các mục đã sử dụng */}
          <table className="items-list-table">
            <thead>
              <tr>
                <th>{vi ? "Hạng mục" : "Item"}</th>
                <th>{vi ? "Đơn vị" : "Unit"}</th>
                <th style={{ width: "90px" }}>{vi ? "Số lượng" : "Quantity"}</th>
                <th>{vi ? "Đơn giá" : "Unit price"}</th>
                <th>{vi ? "Thành tiền" : "Amount"}</th>
                <th style={{ width: "40px" }}></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.name}</strong>
                  </td>
                  <td>{item.unit}</td>
                  <td>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity || 1}
                      onChange={(e) => updateQuantity(item.id, e.target.value)}
                      style={{
                        width: "60px",
                        padding: "4px 6px",
                        border: "1px solid #cbd5e1",
                        borderRadius: "4px",
                        textAlign: "center"
                      }}
                    />
                  </td>
                  <td>{formatVND(item.price)}</td>
                  <td>
                    <strong>{formatVND(item.price * (item.quantity || 1))}</strong>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      style={{
                        background: "none",
                        border: 0,
                        color: "#ef4444",
                        cursor: "pointer",
                        fontSize: "14px",
                        fontWeight: "bold"
                      }}
                      title={vi ? "Xóa mục này" : "Remove this item"}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ textAlign: "center", color: "#94a3b8", padding: "20px" }}>
                    {vi ? "Chưa có hạng mục dịch vụ nào được thêm." : "No service items have been added."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Hàng 2 Input: Vận chuyển / Phụ phí & Số ngày */}
          <div className="row-two-inputs">
            <div className="form-field-group">
              <label>{vi ? "Vận chuyển / Phụ phí đưa đón (VND)" : "Transport / Transfer fee (VND)"}</label>
              <input
                type="number"
                value={extraFee}
                onChange={(e) => setExtraFee(e.target.value)}
                placeholder="100000"
              />
            </div>
            <div className="form-field-group">
              <label>{vi ? "Số ngày lưu trú dự kiến" : "Expected stay length"}</label>
              <input
                type="number"
                min="1"
                value={days}
                onChange={(e) => setDays(e.target.value)}
                placeholder="3"
              />
            </div>
          </div>

          {/* Ghi chú Textarea ở dưới cùng */}
          <div className="form-field-group">
            <label>{vi ? "Ghi chú đặt phòng / Yêu cầu riêng" : "Booking notes / Special requests"}</label>
            <textarea
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={vi ? "Nhập ghi chú chi tiết cho đơn đặt phòng..." : "Enter detailed booking notes..."}
            />
          </div>
        </div>

        {/* CỘT PHẢI (~35% SUMMARY CARD) */}
        <aside className="summary-card-right">
          <h3 className="summary-title">{vi ? "Tổng hợp" : "Summary"}</h3>

          <div className="summary-fee-list">
            <div className="fee-row">
              <span>{vi ? "Chi phí tiền phòng:" : "Room charges:"}</span>
              <strong>{formatVND(roomCost)}</strong>
            </div>
            <div className="fee-row">
              <span>{vi ? "Chi phí dịch vụ:" : "Service charges:"}</span>
              <strong>{formatVND(servicesCost)}</strong>
            </div>
            <div className="fee-row">
              <span>{vi ? "Chi phí vận chuyển / phụ phí:" : "Transport / extra fees:"}</span>
              <strong>{formatVND(Number(extraFee || 0))}</strong>
            </div>
            <div className="fee-row" style={{ color: "#16a34a" }}>
              <span>{vi ? "Ưu đãi áp dụng:" : "Applied discount:"}</span>
              <strong>-0đ</strong>
            </div>
          </div>

          <div className="grand-total-section">
            <div className="grand-total-amount">{formatVND(grandTotal)}</div>
            <div className="stay-duration-sub">{days} {vi ? "ngày lưu trú · 2 khách" : "days · 2 guests"}</div>
            <div className="status-callout-text">
              ● {vi ? "Báo giá đã được khách chấp nhận" : "Quote accepted by guest"}
            </div>
          </div>

          <button
            type="button"
            className="btn-primary-action"
            onClick={() => alert(`Đã cập nhật Booking ${bookingCode} thành công! Tổng tiền: ${formatVND(grandTotal)}`)}
          >
            {vi ? "Lưu thay đổi & Gửi thông tin" : "Save changes & Send details"}
          </button>
        </aside>
      </div>
    </div>
  );
}
