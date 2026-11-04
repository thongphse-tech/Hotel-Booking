import { useEffect, useState } from "react";

export const DEFAULT_LANGUAGE = "VI";
const LANGUAGE_KEY = "stayease_lang";
const LANGUAGE_EVENT = "stayease-language-change";

export function getLanguage() {
  const saved = window.localStorage.getItem(LANGUAGE_KEY);
  return saved === "EN" ? "EN" : DEFAULT_LANGUAGE;
}

export function setLanguage(language) {
  const nextLanguage = language === "EN" ? "EN" : DEFAULT_LANGUAGE;
  window.localStorage.setItem(LANGUAGE_KEY, nextLanguage);
  window.dispatchEvent(new CustomEvent(LANGUAGE_EVENT, { detail: nextLanguage }));
}

export function useLanguage() {
  const [language, setCurrentLanguage] = useState(getLanguage);

  useEffect(() => {
    const handleLanguageChange = (event) => {
      setCurrentLanguage(event.detail === "EN" ? "EN" : DEFAULT_LANGUAGE);
    };
    window.addEventListener(LANGUAGE_EVENT, handleLanguageChange);
    return () => window.removeEventListener(LANGUAGE_EVENT, handleLanguageChange);
  }, []);

  return [language, setLanguage];
}

export function translateStatus(status, language = getLanguage()) {
  if (language !== "VI") return status;
  const labels = {
    "Pending Payment": "Chờ thanh toán",
    Confirmed: "Đã xác nhận",
    "Checked In": "Đã nhận phòng",
    "Checked Out": "Đã trả phòng",
    Cancelled: "Đã hủy",
    Paid: "Đã thanh toán",
    Pending: "Đang chờ",
    Failed: "Thất bại",
    Refunded: "Đã hoàn tiền",
    available: "Trống",
    occupied: "Đang ở",
    cleaning: "Đang dọn",
    maintenance: "Bảo trì"
  };
  return labels[status] || status;
}

const catalogTranslations = {
  Standard: "Phòng tiêu chuẩn",
  Deluxe: "Phòng cao cấp",
  Suite: "Phòng suite",
  "Food & Beverage": "Ẩm thực & đồ uống",
  Wellness: "Chăm sóc sức khỏe",
  Transport: "Đưa đón",
  Housekeeping: "Buồng phòng",
  Breakfast: "Bữa sáng",
  "Spa Treatment": "Trị liệu spa",
  "Airport Transfer": "Đưa đón sân bay",
  "Laundry Service": "Dịch vụ giặt ủi",
  "Room Service": "Dịch vụ tại phòng",
  "WiFi, TV, Air conditioning": "WiFi, TV, điều hòa",
  "Comfortable room with essential amenities": "Phòng tiện nghi với các dịch vụ thiết yếu",
  "Spacious room with premium amenities": "Phòng rộng rãi với tiện nghi cao cấp",
  "Luxury suite with separate living area": "Phòng suite sang trọng có khu vực phòng khách riêng",
  "Daily continental breakfast buffet": "Buffet bữa sáng kiểu Âu hằng ngày",
  "Relaxing massage and therapy": "Massage và trị liệu thư giãn",
  "Round trip airport pickup and drop-off": "Đưa đón sân bay hai chiều",
  "Daily laundry and dry cleaning": "Giặt ủi và giặt khô hằng ngày",
  "24/7 in-room dining": "Dùng bữa tại phòng 24/7",
  "Available 6:00-10:00 AM": "Phục vụ từ 06:00 đến 10:00",
  "Booking required 24h in advance": "Cần đặt trước 24 giờ",
  "24 hours notice required": "Cần báo trước 24 giờ",
  "Same-day service available": "Có dịch vụ trong ngày",
  "Menu items charged separately": "Món ăn tính phí riêng",
  "WiFi, TV, Air conditioning, Mini bar, Balcony": "WiFi, TV, điều hòa, minibar, ban công",
  "WiFi, TV, Air conditioning, Mini bar, Balcony, Living room, Bath tub": "WiFi, TV, điều hòa, minibar, ban công, phòng khách, bồn tắm",
  "Bed configuration not specified": "Chưa xác định cấu hình giường",
  "per booking": "mỗi lần đặt",
  "Standard Room": "Phòng tiêu chuẩn",
  "Deluxe Room": "Phòng cao cấp",
  "Suite Room": "Phòng suite"
};

export function translateCatalog(value, language = getLanguage()) {
  if (language !== "VI" || value === null || value === undefined) return value;
  return catalogTranslations[value] || value;
}
