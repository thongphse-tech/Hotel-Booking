import { useState, useEffect, useRef } from "react";
import "./admin.css";
import { roomController } from "../../controllers/roomController.js";
import { bookingController } from "../../controllers/bookingController.js";
import { catalogController } from "../../controllers/catalogController.js";
import { RoomManagement } from "./RoomManagement.jsx";
import { BookingManagement } from "./BookingManagement.jsx";
import { CustomerManagement } from "./CustomerManagement.jsx";
import { ServiceManagement } from "./ServiceManagement.jsx";
import { DiscountManagement } from "./DiscountManagement.jsx";
import { ReviewManagement } from "./ReviewManagement.jsx";
import { BookingDetailSample } from "./BookingDetailSample.jsx";
import { translateCatalog, useLanguage } from "../../i18n.js";
import BrandLogo from "../BrandLogo.jsx";
import { useConfirmation } from "../useConfirmation.jsx";

const formatVND = (num) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(num || 0);

// Từ điển đa ngôn ngữ (VI / EN)
const i18n = {
  VI: {
    overview: "Tổng quan",
    rooms: "Quản lý phòng",
    bookings: "Đơn đặt phòng",
    customers: "Khách hàng",
    services: "Dịch vụ khách sạn",
    discounts: "Mã giảm giá",
    reviews: "Đánh giá",
    overviewTitle: "Tổng quan hoạt động",
    overviewSubtitle: "Trung tâm điều hành và theo dõi tình trạng phòng khách sạn STAYORA theo thời gian thực.",
    totalRevenue: "Doanh thu ước tính",
    occupancyRate: "Công suất phòng",
    totalBookings: "Đơn đặt phòng",
    totalCustomers: "Khách hàng",
    roomStatusOverview: "Sơ đồ trạng thái phòng thời gian thực",
    recentBookings: "Đơn đặt phòng gần đây",
    quickActions: "Thao tác nhanh",
    popularServices: "Dịch vụ được ưa chuộng",
    recentReview: "Đánh giá gần đây",
    all: "Tất cả",
    available: "Trống",
    occupied: "Đang ở",
    cleaning: "Đang dọn",
    maintenance: "Bảo trì",
    viewAllBookings: "Xem tất cả đơn đặt phòng ↗",
    notifications: "Thông báo hệ thống",
    markAllRead: "Đánh dấu đã đọc",
    logout: "Đăng xuất",
    roleAdmin: "Quản trị viên (Admin)",
    newBookingTitle: "Đơn đặt phòng mới",
    newBookingDesc: "#BK-102 từ khách Nguyễn Văn A",
    cleaningTitle: "Buồng phòng hoàn tất",
    cleaningDesc: "Phòng 102 đã dọn dẹp xong, sẵn sàng đón khách",
    reviewTitle: "Đánh giá 5 sao mới",
    reviewDesc: "Khách hàng Trần Thị B vừa gửi đánh giá",
    discountTitle: "Mã giảm giá",
    discountDesc: "Mã SUMMER20 đã đạt 50 lượt sử dụng",
    justNow: "Vừa xong",
    minsAgo: "15 phút trước",
    hoursAgo: "1 giờ trước",
    today: "Hôm nay",
    confirmLogout: "Bạn có chắc chắn muốn đăng xuất không?"
  },
  EN: {
    overview: "Overview",
    rooms: "Manage Rooms",
    bookings: "Bookings",
    customers: "Customers",
    services: "Hotel Services",
    discounts: "Discount Codes",
    reviews: "Reviews",
    overviewTitle: "Operations Overview",
    overviewSubtitle: "Real-time command center for STAYORA hotel room status and operations.",
    totalRevenue: "Estimated Revenue",
    occupancyRate: "Occupancy Rate",
    totalBookings: "Total Bookings",
    totalCustomers: "Active Customers",
    roomStatusOverview: "Live Room Status Map",
    recentBookings: "Recent Bookings",
    quickActions: "Quick Actions",
    popularServices: "Popular Services",
    recentReview: "Latest Guest Review",
    all: "All",
    available: "Available",
    occupied: "Occupied",
    cleaning: "Cleaning",
    maintenance: "Maintenance",
    viewAllBookings: "View all bookings ↗",
    notifications: "System Notifications",
    markAllRead: "Mark all as read",
    logout: "Sign Out",
    roleAdmin: "Administrator",
    newBookingTitle: "New Booking Created",
    newBookingDesc: "#BK-102 by customer John Doe",
    cleaningTitle: "Room Cleaning Done",
    cleaningDesc: "Room 102 is cleaned and ready for check-in",
    reviewTitle: "New 5-Star Review",
    reviewDesc: "Customer Sarah Jenkins submitted a review",
    discountTitle: "Discount Alert",
    discountDesc: "SUMMER20 reached 50 total uses",
    justNow: "Just now",
    minsAgo: "15m ago",
    hoursAgo: "1h ago",
    today: "Today",
    confirmLogout: "Are you sure you want to sign out?"
  }
};

export default function Dashboard({ user, onLogout, initialTab = "overview", onTabChange }) {
  const [tab, setTab] = useState(initialTab);
  const [lang, setLang] = useLanguage();
  const { confirm, dialog: confirmationDialog } = useConfirmation();
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [stats, setStats] = useState({ rooms: 0, bookings: 0, customers: 0, services: 0, roomTypes: 0 });
  const [roomsList, setRoomsList] = useState([]);
  const [bookingsList, setBookingsList] = useState([]);
  const [servicesList, setServicesList] = useState([]);
  const [reviewsList, setReviewsList] = useState([]);
  const [loading, setLoading] = useState(false);

  // States cho Topbar
  const [showNotifications, setShowNotifications] = useState(false);
  const [hasUnreadNotifs, setHasUnreadNotifs] = useState(true);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const topbarRef = useRef(null);
  const t = i18n[lang] || i18n.VI;

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  function changeTab(nextTab) {
    setTab(nextTab);
    onTabChange?.(nextTab);
  }

  // Đóng popover khi click ra ngoài
  useEffect(() => {
    function handleClickOutside(event) {
      if (topbarRef.current && !topbarRef.current.contains(event.target)) {
        setShowNotifications(false);
        setShowUserMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (user && ["admin", "staff"].includes(user.role)) {
      loadStats();
    }
  }, [user]);

  async function loadStats() {
    setLoading(true);
    try {
      const [rooms, bookings, customers, services, roomTypes, reviews] = await Promise.all([
        roomController.list(),
        bookingController.list(),
        catalogController.customers(),
        catalogController.services(),
        catalogController.roomTypes(),
        catalogController.reviews(true)
      ]);
      setRoomsList(rooms);
      setBookingsList(bookings);
      setServicesList(services);
      setReviewsList(reviews);
      setStats({
        rooms: rooms.length,
        bookings: bookings.length,
        customers: customers.length,
        services: services.length,
        roomTypes: roomTypes.length
      });
    } catch (error) {
      console.error("Failed to load stats:", error);
    } finally {
      setLoading(false);
    }
  }

  function handleOpenBookingDetail(booking = null) {
    setSelectedBooking(booking);
    changeTab("booking-detail");
  }

  async function handleLogoutClick() {
    const confirmed = await confirm({
      title: lang === "VI" ? "Đăng xuất?" : "Sign out?",
      message: t.confirmLogout,
      cancelLabel: lang === "VI" ? "Ở lại" : "Stay signed in",
      confirmLabel: lang === "VI" ? "Đăng xuất" : "Sign out",
      tone: "danger"
    });
    if (confirmed) onLogout();
  }

  // Danh mục menu điều hướng Sidebar (Mã giảm giá chỉ dành cho Admin)
  const navItems = [
    { id: "overview", label: t.overview, icon: "📊" },
    ...(user?.role === "staff" ? [{ id: "booking-detail", label: lang === "VI" ? "Chi tiết Booking" : "Booking Detail", icon: "📑" }] : []),
    { id: "rooms", label: t.rooms, icon: "🚪" },
    { id: "bookings", label: t.bookings, icon: "📅" },
    { id: "customers", label: t.customers, icon: "👥" },
    { id: "services", label: t.services, icon: "🛎️" },
    ...(user?.role === "admin" ? [{ id: "discounts", label: t.discounts, icon: "🏷️" }] : []),
    { id: "reviews", label: t.reviews, icon: "⭐" },
  ];

  return (
    <div className="admin-layout">
      {confirmationDialog}
      {/* 1. SIDEBAR BÊN TRÁI (DARK THEME - BUILDMATE STYLE) */}
      <aside className="admin-sidebar">
        {/* Brand Header */}
        <div className="admin-sidebar-header">
          <div className="admin-brand">
            <div className="brand-text">
              <BrandLogo compact />
              <span>{user?.role === "staff"
                ? (lang === "VI" ? "Khu vực nhân viên" : "Staff Workspace")
                : (lang === "VI" ? "Quản lý khách sạn" : "Hotel Management")}</span>
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <nav className="admin-sidebar-nav">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`nav-item-btn ${tab === item.id ? "active" : ""}`}
              onClick={() => {
                if (item.id !== "booking-detail") setSelectedBooking(null);
                changeTab(item.id);
              }}
              title={item.label}
            >
              <span className="item-icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* User Profile ở chân Sidebar (Gọn gàng sạch sẽ theo BuildMate) */}
        <div className="admin-sidebar-footer">
          <div className="user-profile-badge">
            <div className="user-avatar-circle">
              {(user?.fullName || user?.role || "SA").substring(0, 2).toUpperCase()}
            </div>
            <div className="user-meta">
              <div className="user-name">{user?.fullName || "System Administrator"}</div>
              <div className="user-role">{user?.role || "Admin"}</div>
            </div>
          </div>
        </div>
      </aside>

      {/* 2. KHU VỰC NỘI DUNG CHÍNH (MAIN WRAPPER & TOPBAR) */}
      <div className="admin-main-wrap">
        <header className="admin-topbar" ref={topbarRef}>
          {/* Nút chuyển ngôn ngữ VI / EN */}
          <div className="lang-switch">
            <button
              className={`lang-btn ${lang === "VI" ? "active" : ""}`}
              onClick={() => setLang("VI")}
              title="Tiếng Việt"
            >
              VI
            </button>
            <button
              className={`lang-btn ${lang === "EN" ? "active" : ""}`}
              onClick={() => setLang("EN")}
              title="English"
            >
              EN
            </button>
          </div>

          {/* Chuông thông báo */}
          <div className="topbar-action-container">
            <button
              className="topbar-icon-btn"
              onClick={() => {
                setShowNotifications(!showNotifications);
                setShowUserMenu(false);
              }}
              title={t.notifications}
            >
              🔔
              {hasUnreadNotifs && <span className="badge-dot"></span>}
            </button>

            {/* Dropdown danh sách thông báo */}
            {showNotifications && (
              <div className="topbar-popover">
                <div className="popover-header">
                  <span className="popover-title">{t.notifications}</span>
                  {hasUnreadNotifs && (
                    <button
                      className="popover-action-text"
                      onClick={() => setHasUnreadNotifs(false)}
                    >
                      {t.markAllRead}
                    </button>
                  )}
                </div>
                <div className="popover-notification-item">
                  <div className="notif-icon">🛎️</div>
                  <div className="notif-content">
                    <div className="notif-text">{t.newBookingTitle}</div>
                    <div style={{ fontSize: "12px", color: "#64748b" }}>{t.newBookingDesc}</div>
                    <div className="notif-time">{t.justNow}</div>
                  </div>
                </div>
                <div className="popover-notification-item">
                  <div className="notif-icon">🧹</div>
                  <div className="notif-content">
                    <div className="notif-text">{t.cleaningTitle}</div>
                    <div style={{ fontSize: "12px", color: "#64748b" }}>{t.cleaningDesc}</div>
                    <div className="notif-time">{t.minsAgo}</div>
                  </div>
                </div>
                <div className="popover-notification-item">
                  <div className="notif-icon">⭐</div>
                  <div className="notif-content">
                    <div className="notif-text">{t.reviewTitle}</div>
                    <div style={{ fontSize: "12px", color: "#64748b" }}>{t.reviewDesc}</div>
                    <div className="notif-time">{t.hoursAgo}</div>
                  </div>
                </div>
                <div className="popover-notification-item">
                  <div className="notif-icon">🏷️</div>
                  <div className="notif-content">
                    <div className="notif-text">{t.discountTitle}</div>
                    <div style={{ fontSize: "12px", color: "#64748b" }}>{t.discountDesc}</div>
                    <div className="notif-time">{t.today}</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Avatar người dùng */}
          <div className="topbar-action-container">
            <button
              className="topbar-avatar-btn"
              onClick={() => {
                setShowUserMenu(!showUserMenu);
                setShowNotifications(false);
              }}
              title={user?.fullName || "Administrator"}
            >
              <div
                className="user-avatar-circle"
                style={{ width: "34px", height: "34px", fontSize: "11px", background: "#0f172a" }}
              >
                {(user?.fullName || "SA").substring(0, 2).toUpperCase()}
              </div>
            </button>

            {/* Dropdown Menu tài khoản */}
            {showUserMenu && (
              <div className="user-popover-menu">
                <div className="user-popover-header">
                  <div className="user-popover-name">{user?.fullName || "System Administrator"}</div>
                  <div className="user-popover-email">{user?.username || (user?.role === "admin" ? "admin@stayease.com" : "staff@stayease.com")}</div>
                  <span className="user-popover-role">{user?.role === "admin" ? t.roleAdmin : (lang === "VI" ? "Nhân viên (Staff)" : "Front Desk Staff")}</span>
                </div>
                <button
                  className="user-popover-btn danger"
                  onClick={handleLogoutClick}
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="14"
                    height="14"
                    stroke="currentColor"
                    strokeWidth="2"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                  </svg>
                  <span>{t.logout}</span>
                </button>
              </div>
            )}
          </div>

        </header>

        {/* Nội dung theo từng Tab */}
        <main className="admin-body">
          {tab === "overview" && (
            <ModernOverview
              stats={stats}
              rooms={roomsList}
              bookings={bookingsList}
              services={servicesList}
              reviews={reviewsList}
              user={user}
              loading={loading}
              t={t}
              lang={lang}
              onNavigate={(dest) => changeTab(dest)}
            />
          )}
          {tab === "booking-detail" && user?.role === "staff" && (
            <BookingDetailSample
              bookingData={selectedBooking}
              onBack={() => changeTab("bookings")}
            />
          )}
          {tab === "rooms" && <RoomManagement user={user} onRefresh={loadStats} />}
          {tab === "bookings" && <BookingManagement user={user} onRefresh={loadStats} />}
          {tab === "customers" && <CustomerManagement user={user} onRefresh={loadStats} />}
          {tab === "services" && <ServiceManagement user={user} onRefresh={loadStats} />}
          {tab === "discounts" && user?.role === "admin" && <DiscountManagement user={user} onRefresh={loadStats} />}
          {tab === "reviews" && <ReviewManagement user={user} onRefresh={loadStats} />}
        </main>
      </div>
    </div>
  );
}

// Overview Thiết kế Mới Đẳng Cấp & Trực Quan Hoàn Chỉnh
function ModernOverview({ stats, rooms, bookings, services, reviews, loading, t, onNavigate, user, lang }) {
  const [roomFilter, setRoomFilter] = useState("all");

  const displayRooms = rooms;
  const filteredRooms = displayRooms.filter((r) => (roomFilter === "all" ? true : r.status === roomFilter));

  const availableCount = displayRooms.filter((r) => r.status === "available").length;
  const occupiedCount = displayRooms.filter((r) => r.status === "occupied").length;
  const cleaningCount = displayRooms.filter((r) => r.status === "cleaning").length;
  const maintenanceCount = displayRooms.filter((r) => r.status === "maintenance").length;
  const occupancyRate = displayRooms.length ? Math.round((occupiedCount / displayRooms.length) * 100) : 0;
  const bookingValue = bookings.reduce((sum, booking) => sum + Number(booking.total || 0), 0);
  const pendingBookings = bookings.filter((booking) => booking.status === "Pending Payment").length;
  const recentBookings = [...bookings]
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    .slice(0, 5);
  const recentReview = reviews[0];

  return (
    <div className="modern-overview-container">
      <div style={{ marginBottom: "16px" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: "700", margin: "0 0 4px", color: "#0f172a" }}>
            {t.overviewTitle}
          </h1>
          <p style={{ color: "#64748b", margin: 0, fontSize: "13.5px" }}>
            {t.overviewSubtitle}
          </p>
        </div>
      </div>

      {/* 2. Dãy thẻ Thống kê Cao cấp (Top Metric Cards) */}
      <div className="stat-cards-row">
        {/* Doanh thu tháng */}
        <div className="modern-stat-card">
          <div className="modern-stat-icon emerald">💰</div>
          <div>
            <div className="modern-stat-num">{formatVND(bookingValue)}</div>
            <div className="modern-stat-label">{t.totalRevenue}</div>
            <div className="stat-trend neutral">{bookings.length} booking hiện có</div>
          </div>
        </div>

        {/* Công suất phòng */}
        <div className="modern-stat-card">
          <div className="modern-stat-icon blue">🏨</div>
          <div>
            <div className="modern-stat-num">{occupancyRate}%</div>
            <div className="modern-stat-label">{t.occupancyRate}</div>
            <div className="stat-trend neutral">{occupiedCount}/{displayRooms.length} phòng đang ở</div>
          </div>
        </div>

        {/* Tổng số đơn đặt phòng */}
        <div className="modern-stat-card">
          <div className="modern-stat-icon orange">📅</div>
          <div>
            <div className="modern-stat-num">{stats.bookings}</div>
            <div className="modern-stat-label">{t.totalBookings}</div>
            <div className="stat-trend neutral">● {pendingBookings} đơn chờ thanh toán</div>
          </div>
        </div>

        {/* Tổng số khách hàng */}
        <div className="modern-stat-card">
          <div className="modern-stat-icon purple">👥</div>
          <div>
            <div className="modern-stat-num">{stats.customers}</div>
            <div className="modern-stat-label">{t.totalCustomers}</div>
            <div className="stat-trend neutral">Dữ liệu từ hệ thống</div>
          </div>
        </div>
      </div>

      {/* 3. Bố cục 2 Cột Nội Dung Chuyên Nghiệp (Main Grid: 68% - 32%) */}
      <div className="overview-grid-layout">
        {/* CỘT TRÁI (68%): Sơ đồ phòng & Đơn gần đây */}
        <div className="overview-left-col">
          {/* Card 1: Sơ đồ phòng theo thời gian thực */}
          <div className="dashboard-widget-card">
            <div className="widget-card-header">
              <h3 className="widget-card-title">
                <span>🚪</span> {t.roomStatusOverview}
              </h3>
              <div className="widget-filter-group">
                <button
                  className={`widget-filter-btn ${roomFilter === "all" ? "active" : ""}`}
                  onClick={() => setRoomFilter("all")}
                >
                  {t.all} ({displayRooms.length})
                </button>
                <button
                  className={`widget-filter-btn ${roomFilter === "available" ? "active" : ""}`}
                  onClick={() => setRoomFilter("available")}
                >
                  🟢 {t.available} ({availableCount})
                </button>
                <button
                  className={`widget-filter-btn ${roomFilter === "occupied" ? "active" : ""}`}
                  onClick={() => setRoomFilter("occupied")}
                >
                  🔵 {t.occupied} ({occupiedCount})
                </button>
                <button
                  className={`widget-filter-btn ${roomFilter === "cleaning" ? "active" : ""}`}
                  onClick={() => setRoomFilter("cleaning")}
                >
                  🟡 {t.cleaning} ({cleaningCount})
                </button>
                <button
                  className={`widget-filter-btn ${roomFilter === "maintenance" ? "active" : ""}`}
                  onClick={() => setRoomFilter("maintenance")}
                >
                  🔴 {t.maintenance} ({maintenanceCount})
                </button>
              </div>
            </div>

            {/* Grid các phòng thu nhỏ trực quan */}
            <div className="room-status-overview-grid">
              {filteredRooms.map((room) => (
                <div key={room.roomNumber} className="room-mini-card">
                  <div className="room-mini-header">
                    <span className="room-mini-number">P.{room.roomNumber}</span>
                    <span style={{ fontSize: "11px", fontWeight: "600", color: "#f97316" }}>
                      {formatVND(room.price)}
                    </span>
                  </div>
                  <span className="room-mini-type">{translateCatalog(room.type, lang)} {lang === "VI" ? "phòng" : "Room"}</span>
                  <span className={`room-mini-status ${room.status}`}>
                    {room.status === "available" && "🟢 Sẵn sàng"}
                    {room.status === "occupied" && "🔵 Đang ở"}
                    {room.status === "cleaning" && "🟡 Đang dọn"}
                    {room.status === "maintenance" && "🔴 Bảo trì"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Card 2: Đơn đặt phòng mới nhất */}
          <div className="dashboard-widget-card">
            <div className="widget-card-header">
              <h3 className="widget-card-title">
                <span>📋</span> {t.recentBookings}
              </h3>
              <button
                className="widget-filter-btn"
                style={{ color: "#f97316", borderColor: "#f97316" }}
                onClick={() => onNavigate("bookings")}
              >
                {t.viewAllBookings}
              </button>
            </div>

            <table className="items-list-table">
              <thead>
                <tr>
                  <th>{lang === "VI" ? "Mã đơn" : "Booking"}</th>
                  <th>{lang === "VI" ? "Khách hàng" : "Customer"}</th>
                  <th>{lang === "VI" ? "Phòng" : "Room"}</th>
                  <th>{lang === "VI" ? "Thời gian lưu trú" : "Stay dates"}</th>
                  <th>{lang === "VI" ? "Tổng tiền" : "Total"}</th>
                  <th>{lang === "VI" ? "Trạng thái" : "Status"}</th>
                </tr>
              </thead>
              <tbody>
                {recentBookings.map((booking) => (
                  <tr key={booking.id}>
                    <td><strong>#BK-{booking.id}</strong></td>
                    <td>{booking.customerName}</td>
                    <td>{booking.roomName}</td>
                    <td>{booking.checkIn} - {booking.checkOut}</td>
                    <td><strong>{formatVND(booking.total)}</strong></td>
                    <td><span className="room-mini-status">{booking.status}</span></td>
                  </tr>
                ))}
                {!recentBookings.length && <tr><td colSpan="6">{lang === "VI" ? "Không tìm thấy đặt phòng." : "No bookings found."}</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        {/* CỘT PHẢI (32%): Thao tác nhanh & Dịch vụ & Đánh giá */}
        <div className="overview-right-col">
          {/* Card 1: Thao tác nhanh */}
          <div className="dashboard-widget-card">
            <h3 className="widget-card-title" style={{ marginBottom: "16px" }}>
              <span>⚡</span> {t.quickActions}
            </h3>
            <div className="quick-action-grid">
              <button className="quick-action-card-btn" onClick={() => onNavigate("bookings")}>
                <div className="qa-icon" style={{ background: "#fff7ed", color: "#f97316" }}>➕</div>
                <span>{lang === "VI" ? "Đơn đặt phòng" : "Bookings"}</span>
              </button>
              {user?.role === "admin" && <button className="quick-action-card-btn" onClick={() => onNavigate("rooms")}>
                <div className="qa-icon" style={{ background: "#eff6ff", color: "#3b82f6" }}>🚪</div>
                <span>{lang === "VI" ? "Thêm phòng" : "Add room"}</span>
              </button>}
              <button className="quick-action-card-btn" onClick={() => onNavigate("services")}>
                <div className="qa-icon" style={{ background: "#faf5ff", color: "#a855f7" }}>🛎️</div>
                <span>{lang === "VI" ? "Đặt dịch vụ" : "Book service"}</span>
              </button>
              {user?.role === "admin" && <button className="quick-action-card-btn" onClick={() => onNavigate("discounts")}>
                <div className="qa-icon" style={{ background: "#ecfdf5", color: "#10b981" }}>🏷️</div>
                <span>{lang === "VI" ? "Mã giảm giá" : "Discount codes"}</span>
              </button>}
            </div>
          </div>

          {/* Card 2: Dịch vụ khách sạn nổi bật */}
          <div className="dashboard-widget-card">
            <h3 className="widget-card-title" style={{ marginBottom: "16px" }}>
              <span>🛎️</span> {t.popularServices}
            </h3>
            <div className="service-highlight-list">
              {services.slice(0, 4).map((service) => (
                <div className="service-highlight-item" key={service.id}>
                  <span className="sh-name">{translateCatalog(service.name, lang)}</span>
                  <span className="sh-price">{formatVND(service.price)}</span>
                </div>
              ))}
              {!services.length && <p className="hint">{lang === "VI" ? "Không có dịch vụ đang hoạt động." : "No active services found."}</p>}
            </div>
          </div>

          {/* Card 3: Đánh giá gần đây */}
          <div className="dashboard-widget-card">
            <h3 className="widget-card-title" style={{ marginBottom: "12px" }}>
              <span>⭐</span> {t.recentReview}
            </h3>
            {recentReview ? (
              <div style={{ background: "#f8fafc", padding: "14px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                <div style={{ color: "#f59e0b", fontSize: "14px", letterSpacing: "2px", marginBottom: "6px" }}>
                  {"★".repeat(Number(recentReview.rating || 0))}
                </div>
                <p style={{ margin: "0 0 8px", fontSize: "12.5px", color: "#334155", fontStyle: "italic", lineHeight: 1.5 }}>
                  “{recentReview.text}”
                </p>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11.5px", color: "#64748b" }}>
                  <strong>{recentReview.author}</strong>
                  <span>{recentReview.isApproved ? (lang === "VI" ? "Đã duyệt" : "Approved") : (lang === "VI" ? "Chờ duyệt" : "Pending moderation")}</span>
                </div>
              </div>
            ) : <p className="hint">{lang === "VI" ? "Không tìm thấy đánh giá." : "No reviews found."}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
