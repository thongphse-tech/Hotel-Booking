import { useEffect, useMemo, useRef, useState } from "react";
import { authController } from "../controllers/authController.js";
import { roomController } from "../controllers/roomController.js";
import { bookingController } from "../controllers/bookingController.js";
import { catalogController } from "../controllers/catalogController.js";
import { apiClient } from "../services/apiClient.js";
import Dashboard from "./dashboard/Dashboard.jsx";
import Register from "./Register.jsx";
import Login from "./Login.jsx";
import ProfileScreen from "./ProfileScreen.jsx";
import UserMenu from "./UserMenu.jsx";
import BookingCreationScreen from "./BookingCreationScreen.jsx";
import PaymentScreen from "./PaymentScreen.jsx";
import LanguageToggle from "./LanguageToggle.jsx";
import BrandLogo from "./BrandLogo.jsx";
import { useConfirmation } from "./useConfirmation.jsx";
import { translateCatalog, translateStatus, useLanguage } from "../i18n.js";

const money = (value) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(Number(value || 0));
const appCopy = {
  VI: {
    home: "Trang chủ", rooms: "Phòng", services: "Dịch vụ", bookings: "Đặt phòng", reviews: "Đánh giá", dashboard: "Bảng điều khiển",
    signIn: "Đăng nhập", signUp: "Đăng ký", heroEyebrow: "KỲ NGHỈ ĐƠN GIẢN HƠN", heroSub: "Phòng nghỉ chu đáo, đặt phòng liền mạch và những chi tiết nhỏ làm mỗi chuyến đi trở nên đáng nhớ.",
    explore: "Khám phá phòng", curated: "DÀNH RIÊNG CHO BẠN", roomsWorth: "Những căn phòng đáng trải nghiệm", viewAll: "Xem tất cả phòng",
    moreThan: "KHÔNG CHỈ LÀ MỘT CĂN PHÒNG", special: "Làm kỳ nghỉ của bạn đặc biệt hơn.", findRoom: "TÌM PHÒNG", roomSuites: "Phòng & suite",
    servicesEyebrow: "CÁ NHÂN HÓA KỲ NGHỈ", hotelServices: "Dịch vụ khách sạn", allServices: "Tất cả dịch vụ",
    minCapacity: "Sức chứa tối thiểu", anyCapacity: "Không giới hạn", guests: "khách", sortBy: "Sắp xếp", apply: "Áp dụng",
    loading: "Đang tải phòng…", noRooms: "Không có phòng phù hợp. Hãy thử thay đổi số khách hoặc loại phòng.",
    viewDetails: "Xem chi tiết", book: "Đặt phòng", night: "/ đêm"
  },
  EN: {
    home: "Home", rooms: "Rooms", services: "Services", bookings: "Bookings", reviews: "Reviews", dashboard: "Dashboard",
    signIn: "Sign in", signUp: "Create account", heroEyebrow: "YOUR STAY, MADE SIMPLE", heroSub: "Thoughtful rooms, seamless booking, and little details that make every trip memorable.",
    explore: "Explore rooms", curated: "CURATED FOR YOU", roomsWorth: "Rooms worth staying for", viewAll: "View all rooms",
    moreThan: "MORE THAN A ROOM", special: "Make your stay a little more special.", findRoom: "FIND YOUR ROOM", roomSuites: "Rooms & suites",
    servicesEyebrow: "PERSONALIZE YOUR VISIT", hotelServices: "Hotel services", allServices: "All services",
    minCapacity: "Minimum capacity", anyCapacity: "Any capacity", guests: "guests", sortBy: "Sort by", apply: "Apply filter",
    loading: "Loading rooms…", noRooms: "No rooms match these filters. Try changing your guest count or room type.",
    viewDetails: "View details", book: "Book", night: "/ night"
  }
};

const appRoutes = {
  Home: "/",
  Rooms: "/rooms",
  Services: "/services",
  Bookings: "/bookings",
  Reviews: "/reviews",
  Profile: "/profile",
  CreateBooking: "/booking/create",
  Payment: "/payment",
  Login: "/login",
  Register: "/register"
};
const dashboardTabs = ["overview", "booking-detail", "rooms", "bookings", "customers", "services", "discounts", "reviews"];

function allowedDashboardTab(tab, role) {
  if (tab === "booking-detail") return role === "staff";
  if (tab === "discounts") return role === "admin";
  return dashboardTabs.includes(tab);
}

function readAppRoute(pathname) {
  const path = pathname.replace(/\/+$/, "").toLowerCase() || "/";
  if (path === "/dashboard" || path.startsWith("/dashboard/")) {
    const requestedTab = path.slice("/dashboard/".length);
    return {
      page: "Dashboard",
      dashboardTab: dashboardTabs.includes(requestedTab) ? requestedTab : "overview",
      valid: path === "/dashboard" || dashboardTabs.includes(requestedTab)
    };
  }
  const page = Object.keys(appRoutes).find((key) => appRoutes[key].toLowerCase() === path);
  return { page: page || "Home", dashboardTab: "overview", valid: Boolean(page) || path === "/" };
}

function routePath(page, dashboardTab = "overview") {
  if (page === "Dashboard") {
    const tab = dashboardTabs.includes(dashboardTab) ? dashboardTab : "overview";
    return `/dashboard/${tab}`;
  }
  return appRoutes[page] || "/";
}

export default function App() {
  const [language] = useLanguage();
  const { confirm, dialog: confirmationDialog } = useConfirmation();
  const t = appCopy[language];
  const [user, setUser] = useState(() => apiClient.user());
  const [initialRoute] = useState(() => readAppRoute(window.location.pathname));
  const [dashboardTab, setDashboardTab] = useState(initialRoute.dashboardTab);
  const [page, setPageState] = useState(() => {
    const u = apiClient.user();
    return u && ["admin", "staff"].includes(u.role) ? "Dashboard" : initialRoute.page;
  });
  const [rooms, setRooms] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [services, setServices] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [reviewSummary, setReviewSummary] = useState({ average: 0, count: 0, five: 0, four: 0, three: 0, two: 0, one: 0 });
  const [reviewFilters, setReviewFilters] = useState({ rating: "", sort: "recent" });
  const [reviewHasMore, setReviewHasMore] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState({ checkIn: "", checkOut: "", guests: "2", type: "All" });
  const [roomCatalogFilters, setRoomCatalogFilters] = useState({ minimumCapacity: "", sort: "price-asc" });
  const [catalogFiltersApplied, setCatalogFiltersApplied] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [bookingRoom, setBookingRoom] = useState(null);
  const [paymentBooking, setPaymentBooking] = useState(null);
  const [customerPayments, setCustomerPayments] = useState([]);
  const [showCustomerPayments, setShowCustomerPayments] = useState(false);
  const [selectedCustomerPayment, setSelectedCustomerPayment] = useState(null);
  const [eligibleReviewBookings, setEligibleReviewBookings] = useState([]);
  const [reviewBooking, setReviewBooking] = useState(null);
  const [reviewForm, setReviewForm] = useState({ rating: 0, title: "", comment: "" });
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [selectedPaymentStatusBooking, setSelectedPaymentStatusBooking] = useState(null);
  const [paymentStatusLoading, setPaymentStatusLoading] = useState(false);
  const roomDetailsRequest = useRef(0);
  const [selectedService, setSelectedService] = useState(null);
  const [serviceDetails, setServiceDetails] = useState(null);
  const [serviceCategory, setServiceCategory] = useState("");
  const [serviceBookings, setServiceBookings] = useState([]);
  const [serviceForm, setServiceForm] = useState({ bookingId: "", serviceDate: "", timeSlot: "", quantity: "1", specialNotes: "" });
  const [authMode, setAuthMode] = useState("login");
  const [authForm, setAuthForm] = useState({ fullName: "", email: "", phone: "", password: "", confirmPassword: "" });
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  function setPage(nextPage) {
    const nextDashboardTab = nextPage === "Dashboard"
      ? (page === "Dashboard" ? dashboardTab : "overview")
      : dashboardTab;
    setPageState(nextPage);
    if (nextPage === "Dashboard") setDashboardTab(nextDashboardTab);
    const nextPath = routePath(nextPage, nextDashboardTab);
    if (window.location.pathname !== nextPath) {
      window.history.pushState({ page: nextPage, dashboardTab: nextDashboardTab }, "", nextPath);
    }
  }

  function navigateDashboardTab(nextTab) {
    const safeTab = allowedDashboardTab(nextTab, user?.role) ? nextTab : "overview";
    setDashboardTab(safeTab);
    const nextPath = routePath("Dashboard", safeTab);
    if (window.location.pathname !== nextPath) {
      window.history.pushState({ page: "Dashboard", dashboardTab: safeTab }, "", nextPath);
    }
  }

  useEffect(() => {
    const isStaffOrAdmin = user && ["admin", "staff"].includes(user.role);
    const initialTabAllowed = !isStaffOrAdmin || allowedDashboardTab(initialRoute.dashboardTab, user.role);
    if (!initialRoute.valid || (initialRoute.page === "Dashboard" && (!isStaffOrAdmin || !initialTabAllowed)) ||
      (isStaffOrAdmin && initialRoute.page !== "Dashboard")) {
      const targetPage = isStaffOrAdmin ? "Dashboard" : initialRoute.page === "Dashboard" ? "Home" : initialRoute.page;
      const targetTab = targetPage === "Dashboard" && initialTabAllowed ? dashboardTab : "overview";
      window.history.replaceState({ page: targetPage, dashboardTab: targetTab }, "", routePath(targetPage, targetTab));
      setPageState(targetPage);
      setDashboardTab(targetTab);
    }

    function handlePopState() {
      const route = readAppRoute(window.location.pathname);
      const isStaffOrAdmin = user && ["admin", "staff"].includes(user.role);
      const nextPage = isStaffOrAdmin ? "Dashboard" : route.page === "Dashboard" ? "Home" : route.page;
      const nextTab = nextPage === "Dashboard" && isStaffOrAdmin && allowedDashboardTab(route.dashboardTab, user.role)
        ? route.dashboardTab
        : "overview";
      setPageState(nextPage);
      setDashboardTab(nextTab);
      if (!route.valid || (route.page === "Dashboard" && (!isStaffOrAdmin || nextTab !== route.dashboardTab)) ||
        (isStaffOrAdmin && route.page !== "Dashboard")) {
        window.history.replaceState({ page: nextPage, dashboardTab: nextTab }, "", routePath(nextPage, nextTab));
      }
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [user]);

  useEffect(() => {
    if (page === "Profile" && !user) setPage("Login");
    else if (page === "CreateBooking" && (!user || user.role !== "customer" || !bookingRoom)) {
      setPage(user?.role === "customer" ? "Rooms" : "Login");
    } else if (page === "Payment" && (!user || user.role !== "customer" || !paymentBooking)) {
      setPage(user?.role === "customer" ? "Bookings" : "Login");
    }
  }, [page, user, bookingRoom, paymentBooking]);

  const filtered = useMemo(
    () => rooms.filter((room) =>
      (search.type === "All" || room.type === search.type) &&
      (catalogFiltersApplied || room.capacity >= Number(search.guests))
    ),
    [rooms, search.type, search.guests, catalogFiltersApplied]
  );
  const serviceCategories = useMemo(() => [...new Set(services.map((service) => service.category).filter(Boolean))].sort(), [services]);
  const visibleServices = useMemo(() => serviceCategory ? services.filter((service) => service.category === serviceCategory) : services, [services, serviceCategory]);

  // Tự động ẩn popup thông báo sau 3.5 giây
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => {
      setNotice("");
    }, 3500);
    return () => clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    roomController.list().then(setRooms).catch((error) => setNotice(error.message));
    catalogController.services().then(setServices).catch((error) => setNotice(error.message));
    loadReviews({ reset: true }).catch((error) => setNotice(error.message));
    catalogController.roomTypes().then(setRoomTypes).catch((error) => setNotice(error.message));
  }, []);

  async function loadReviews({ reset = false } = {}) {
    const offset = reset ? 0 : reviews.length;
    setReviewLoading(true);
    try {
      const result = await catalogController.reviewFeed({ ...reviewFilters, offset, limit: 6 });
      setReviewSummary(result.summary);
      setReviews((items) => reset ? result.items : [...items, ...result.items]);
      setReviewHasMore(result.items.length === 6);
    } finally {
      setReviewLoading(false);
    }
  }

  async function applyReviewFilters(event) {
    event.preventDefault();
    await loadReviews({ reset: true });
  }

  useEffect(() => {
    if (page !== "Bookings") return;
    if (!user) {
      setNotice(language === "VI" ? "Vui lòng đăng nhập để xem đặt phòng." : "Sign in to view your bookings.");
      setPage("Login");
      return;
    }
    let active = true;
    setLoading(true);
    bookingController.list().then((items) => { if (active) setBookings(items); }).catch((error) => { if (active) setNotice(error.message); }).finally(() => { if (active) setLoading(false); });
    catalogController.eligibleReviewBookings().then((items) => { if (active) setEligibleReviewBookings(items); }).catch((error) => { if (active) setNotice(error.message); });
    return () => { active = false; };
  }, [page, user]);

  async function submitReview(event) {
    event.preventDefault();
    if (!reviewBooking || !reviewForm.rating || reviewForm.comment.trim().length < 10) {
      setNotice(language === "VI" ? "Vui lòng chọn số sao và nhập nhận xét ít nhất 10 ký tự." : "Please provide both a star rating and at least 10 characters of review comments.");
      return;
    }
    setReviewSubmitting(true);
    try {
      await catalogController.submitReview({ bookingId: reviewBooking.bookingid, rating: reviewForm.rating, title: reviewForm.title, comment: reviewForm.comment });
      setEligibleReviewBookings((items) => items.filter((item) => item.bookingid !== reviewBooking.bookingid));
      setReviewBooking(null);
      setReviewForm({ rating: 0, title: "", comment: "" });
      setNotice(language === "VI" ? "Cảm ơn bạn! Đánh giá đã được gửi để kiểm duyệt." : "Thank you! Your review has been submitted for moderation.");
    } catch (error) {
      setNotice(error.message);
    } finally {
      setReviewSubmitting(false);
    }
  }

  useEffect(() => {
    if (page !== "Dashboard") return;
    if (!user || !["admin", "staff"].includes(user.role)) {
      setNotice(language === "VI" ? "Bạn cần quyền Staff để mở bảng điều khiển." : "Staff access is required to open the dashboard.");
      setPage("Home");
      return;
    }
    let active = true;
    Promise.all([catalogController.customers(), bookingController.list(), roomController.list(), catalogController.roomTypes()]).then(([customerRows, bookingRows, roomRows, typeRows]) => {
      if (!active) return;
      setCustomers(customerRows);
      setBookings(bookingRows);
      setRooms(roomRows);
      setRoomTypes(typeRows);
    }).catch((error) => { if (active) setNotice(error.message); });
    return () => { active = false; };
  }, [page, user]);

  async function runSearch(event) {
    event.preventDefault();
    setLoading(true);
    try {
      const result = await roomController.search(search);
      setRooms(result);
      setCatalogFiltersApplied(true);
      setNotice(language === "VI" ? `Tìm thấy ${result.length} lựa chọn phòng.` : `${result.length} room option(s) found.`);
      setPage("Rooms");
    } catch (error) { setNotice(error.message); }
    finally { setLoading(false); }
  }

  async function applyRoomCatalogFilters(event) {
    event.preventDefault();
    setLoading(true);
    try {
      const result = await roomController.list(roomCatalogFilters);
      setRooms(result);
      setCatalogFiltersApplied(true);
      setPage("Rooms");
      setNotice(language === "VI" ? `Tìm thấy ${result.length} lựa chọn phòng.` : `${result.length} room option(s) found.`);
    } catch (error) {
      setNotice(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function openRoomDetails(room) {
    const requestId = ++roomDetailsRequest.current;
    setSelectedRoom({ ...room, isLoading: true });

    try {
      const details = await roomController.details(room.id);
      if (requestId === roomDetailsRequest.current) setSelectedRoom(details);
    } catch {
      if (requestId !== roomDetailsRequest.current) return;
      setSelectedRoom(null);
      setNotice(language === "VI" ? "Không thể tải thông tin phòng được yêu cầu." : "Requested room information is unavailable");
      try {
        const refreshedRooms = await roomController.list(roomCatalogFilters);
        setRooms(refreshedRooms);
      } catch (refreshError) {
        setNotice(`${language === "VI" ? "Không thể tải thông tin phòng được yêu cầu" : "Requested room information is unavailable"}. ${refreshError.message}`);
      }
    }
  }

  function closeRoomDetails() {
    roomDetailsRequest.current += 1;
    setSelectedRoom(null);
  }

  async function bookRoom(room) {
    if (!user) {
      setBookingRoom(room);
      setNotice(language === "VI" ? "Vui lòng đăng nhập bằng tài khoản khách hàng trước khi đặt phòng." : "Sign in with a customer account before booking.");
      setPage("Login");
      return;
    }
    if (String(user.role).toLowerCase() !== "customer") {
      setNotice(language === "VI" ? "Chỉ khách hàng mới có thể tạo đặt phòng." : "Only customers can create a room booking.");
      return;
    }
    setBookingRoom(room);
    setSelectedRoom(null);
    setNotice("");
    setPage("CreateBooking");
  }

  async function cancelBooking(id) {
    const booking = bookings.find((item) => item.id === id);
    const hasPaidAmount = Number(booking?.paidAmount || 0) > 0;
    const confirmation = hasPaidAmount
      ? (language === "VI" ? `Hủy đặt phòng BK-${id}? Đặt phòng sẽ bị hủy và yêu cầu hoàn ${money(booking.paidAmount)} sẽ được gửi Staff xử lý thủ công.` : `Cancel booking BK-${id}? The booking will be cancelled and a refund request for ${money(booking.paidAmount)} will be sent for manual staff review.`)
      : (language === "VI" ? `Hủy đặt phòng BK-${id}? Hành động này không thể hoàn tác.` : `Cancel booking BK-${id}? This action cannot be undone.`);
    const confirmed = await confirm({
      title: language === "VI" ? "Hủy đặt phòng?" : "Cancel booking?",
      message: confirmation,
      cancelLabel: language === "VI" ? "Giữ đặt phòng" : "Keep booking",
      confirmLabel: language === "VI" ? "Hủy đặt phòng" : "Cancel booking",
      tone: "danger"
    });
    if (!confirmed) return;
    try {
      const result = await bookingController.cancel(id);
      setBookings(await bookingController.list());
      setNotice(result.message || (language === "VI" ? `Đặt phòng ${id} đã được hủy.` : `Booking ${id} was cancelled.`));
    } catch (error) { setNotice(error.message); }
  }

  async function openCustomerPaymentHistory() {
    setLoading(true);
    try {
      setCustomerPayments(await bookingController.paymentHistory() || []);
      setShowCustomerPayments(true);
    } catch (error) {
      setNotice(error.message);
    } finally {
      setLoading(false);
    }

    async function openPaymentStatus(booking) {
      setPaymentStatusLoading(true);
      try {
        setSelectedPaymentStatusBooking(await bookingController.paymentStatus(booking.id));
      } catch (error) {
        setNotice(error.message);
      } finally {
        setPaymentStatusLoading(false);
      }
    }

    async function refreshPaymentStatus() {
      if (selectedPaymentStatusBooking) await openPaymentStatus(selectedPaymentStatusBooking);
    }
  }

  function requestPayment(booking) {
    if (typeof booking === "number") {
      booking = bookings.find((item) => item.id === booking);
    }
    if (!booking) {
      setNotice(language === "VI" ? "Không thể tải chi tiết đặt phòng. Hãy tải lại lịch sử và thử lại." : "Booking details are unavailable. Refresh your booking history and try again.");
      return;
    }
    setPaymentBooking(booking);
    setNotice("");
    setPage("Payment");
  }

  function proceedToPayment(booking) {
    setPaymentBooking({
      ...booking,
      roomName: booking.roomName === "Room"
        ? `${bookingRoom?.type || "Room"} · Room ${bookingRoom?.roomNumber || ""}`.trim()
        : booking.roomName
    });
    setNotice("");
    setPage("Payment");
  }

  async function openServiceBooking(service) {
    if (!user) {
      setNotice(language === "VI" ? "Vui lòng đăng nhập trước khi đặt dịch vụ khách sạn." : "Sign in before booking a hotel service.");
      setPage("Login");
      return;
    }
    if (!["customer", "staff"].includes(user.role)) {
      setNotice(language === "VI" ? "Chỉ khách hàng hoặc Staff mới có thể đặt dịch vụ khách sạn." : "Only customers or staff can book a hotel service.");
      return;
    }
    try {
      const rows = await bookingController.list();
      const eligible = rows.filter((booking) => user.role === "staff" ? booking.status === "Checked In" : ["Confirmed", "Checked In"].includes(booking.status));
      if (!eligible.length) {
        setNotice(user.role === "staff" ? (language === "VI" ? "Cần có đặt phòng của khách đang lưu trú." : "An in-house guest booking is required.") : (language === "VI" ? "Cần có đặt phòng đã xác nhận trước khi đặt dịch vụ." : "A confirmed room booking is required before booking a service."));
        return;
      }
      setServiceBookings(eligible);
      setServiceForm({ bookingId: String(eligible[0].id), serviceDate: "", timeSlot: "", quantity: "1", specialNotes: "" });
      setSelectedService(service);
    } catch (error) { setNotice(error.message); }
  }

  async function submitServiceBooking(event) {
    event.preventDefault();
    try {
      const result = await catalogController.bookService({ ...serviceForm, bookingId: Number(serviceForm.bookingId), serviceId: selectedService.id, quantity: Number(serviceForm.quantity) });
      setSelectedService(null);
      setNotice(result.notificationDelivered === false
        ? (language === "VI" ? "Đã đặt dịch vụ thành công. Không thể gửi email xác nhận." : "Hotel service booked successfully. Email confirmation could not be sent.")
        : (language === "VI" ? "Đã đặt dịch vụ khách sạn thành công." : "Hotel service booked successfully."));
    } catch (error) { setNotice(error.message); }
  }

  async function submitAuth(event) {
    event.preventDefault();
    setLoading(true);
    try {
      const session = authMode === "login" ? await authController.login({ email: authForm.email, password: authForm.password }) : await authController.register(authForm);
      setUser(session.user);
      setAuthForm({ fullName: "", email: "", phone: "", password: "", confirmPassword: "" });
      setNotice(authMode === "login" ? (language === "VI" ? `Chào mừng trở lại, ${session.user.fullName || session.user.role}.` : `Welcome back, ${session.user.fullName || session.user.role}.`) : (language === "VI" ? "Tài khoản của bạn đã được tạo." : "Your account has been created."));
      const isStaffOrAdmin = ["admin", "staff"].includes(session.user?.role);
      setPage(isStaffOrAdmin ? "Dashboard" : bookingRoom ? "CreateBooking" : "Home");
    } catch (error) { setNotice(error.message); }
    finally { setLoading(false); }
  }

  async function logout() {
    try { await authController.logout(); }
    catch (error) { setNotice(error.message); }
    setUser(null);
    setBookingRoom(null);
    setBookings([]);
    setNotice(language === "VI" ? "Bạn đã đăng xuất." : "You have signed out.");
    setPage("Login");
  }

  function navigate(item) {
    if (item === "Bookings" && !user) {
      setNotice(language === "VI" ? "Vui lòng đăng nhập để xem đặt phòng." : "Sign in to view your bookings.");
      setPage("Login");
      return;
    }
    setPage(item);
  }

  function openProfile() {
    if (!user || String(user.role).toLowerCase() !== "customer") {
      setNotice(language === "VI" ? "Chỉ khách hàng mới có thể quản lý hồ sơ cá nhân." : "Only customers can manage a customer profile.");
      return;
    }
    setPage("Profile");
  }

  function updateUserProfile(profile) {
    const updatedUser = {
      ...user,
      fullName: profile.fullName,
      phone: profile.phone,
      address: profile.address
    };
    apiClient.setSession({ user: updatedUser });
    setUser(updatedUser);
  }

  // Khóa cứng: Nếu tài khoản là Admin hoặc Staff thì CHỈ ĐƯỢC PHÉP ở Dashboard
  if (user && ["admin", "staff"].includes(user.role)) {
    return (
      <>
        {notice && (
          <div className="notice">
            <span>{notice}</span>
            <button onClick={() => setNotice("")}>×</button>
          </div>
        )}
        <Dashboard
          user={user}
          onLogout={logout}
          initialTab={dashboardTab}
          onTabChange={navigateDashboardTab}
        />
      </>
    );
  }

  // Giao diện Đăng ký (UC-01) - Thiết kế Split Screen bám sát ảnh mẫu
  if (page === "Register") {
    return (
      <>
        {notice && (
          <div className="notice">
            <span>{notice}</span>
            <button onClick={() => setNotice("")}>×</button>
          </div>
        )}
        <Register
          onNavigateToLogin={() => setPage("Login")}
          onRegisterSuccess={() => {
            setNotice(language === "VI"
              ? "Email đã được xác minh. Vui lòng đăng nhập."
              : "Email verified. Please sign in.");
            setPage("Login");
          }}
        />
      </>
    );
  }

  // Giao diện Đăng nhập (UC-02) - Thiết kế Split Screen đồng bộ
  if (page === "Login") {
    return (
      <>
        {notice && (
          <div className="notice">
            <span>{notice}</span>
            <button onClick={() => setNotice("")}>×</button>
          </div>
        )}
        <Login
          onNavigateToRegister={() => setPage("Register")}
          onLoginSuccess={(session) => {
            const nextUser = session.user;
            setUser(nextUser);
            setNotice(`Chào mừng trở lại, ${nextUser.fullName || nextUser.role}!`);
            const isStaffOrAdmin = ["admin", "staff", "administrator"].includes(String(nextUser?.role || "").toLowerCase());
            setPage(isStaffOrAdmin ? "Dashboard" : bookingRoom && nextUser?.role === "customer" ? "CreateBooking" : "Home");
          }}
          onBackToHome={() => setPage("Home")}
        />
      </>
    );
  }

  return <div className="app-shell">
    {confirmationDialog}
    <header className="topbar">
      <button className="brand" onClick={() => setPage("Home")} aria-label="STAYORA"><BrandLogo /></button>
      <nav>{[["Home", t.home], ["Rooms", t.rooms], ["Services", t.services], ["Bookings", t.bookings], ["Reviews", t.reviews]].concat(user && ["admin", "staff"].includes(user.role) ? [["Dashboard", t.dashboard]] : []).map(([id, label]) => <button key={id} className={page === id ? "nav-link active" : "nav-link"} onClick={() => navigate(id)}>{label}</button>)}</nav>
      {user ? (
        <div className="user-actions">
          <UserMenu
            user={user}
            onProfileClick={openProfile}
            onLogoutClick={logout}
          />
        </div>
      ) : (
        <div className="topbar-auth-actions">
          <LanguageToggle />
          <button className="outline-btn" onClick={() => setPage("Login")}>{t.signIn}</button>
          <button className="primary-btn" style={{ padding: "8px 16px", fontSize: "0.85rem" }} onClick={() => setPage("Register")}>{t.signUp}</button>
        </div>
      )}
    </header>
    {notice && <div className="notice"><span>{notice}</span><button onClick={() => setNotice("")}>×</button></div>}
    {page === "Profile" && user && (
      <ProfileScreen
        user={user}
        onCancel={() => setPage("Home")}
        onProfileUpdated={updateUserProfile}
      />
    )}
    {page === "CreateBooking" && user?.role === "customer" && bookingRoom && (
      <BookingCreationScreen
        room={bookingRoom}
        search={search}
        user={user}
        onCancel={() => {
          setBookingRoom(null);
          setPage("Rooms");
        }}
        onProceedToPayment={proceedToPayment}
      />
    )}
    {page === "Payment" && user?.role === "customer" && paymentBooking && (
      <PaymentScreen
        booking={paymentBooking}
        onCancel={() => {
          setPaymentBooking(null);
          setPage("Bookings");
        }}
        onExpired={(message) => {
          setPaymentBooking(null);
          setNotice(message);
          setPage("Home");
        }}
        onPaymentComplete={() => {
          bookingController.list().then(setBookings).catch((error) => setNotice(error.message));
        }}
        onDone={() => {
          setPaymentBooking(null);
          setPage("Bookings");
        }}
      />
    )}
    {page === "Home" && <main>
      <section className="hero">
        <div className="hero-copy"><p className="eyebrow">{t.heroEyebrow}</p><h1>{language === "VI" ? <>Tìm nơi<br/>để <em>cảm thấy như ở nhà.</em></> : <>Find a place<br/>to <em>feel at home.</em></>}</h1><p className="hero-sub">{t.heroSub}</p><button className="primary-btn" onClick={() => setPage("Rooms")}>{t.explore} <span>↗</span></button></div>
        <div className="hero-image"><div className="floating-note"><span>✦ {language === "VI" ? "ĐƯỢC YÊU THÍCH" : "GUEST FAVORITE"}</span><strong>{language === "VI" ? <>Nghỉ ngơi trọn vẹn.<br/>Du lịch tốt hơn.</> : <>Rest well.<br/>Travel better.</>}</strong></div></div>
      </section>
      <SearchPanel search={search} setSearch={setSearch} onSubmit={runSearch} roomTypes={roomTypes}/>
      <section className="section"><div className="section-heading"><div><p className="eyebrow">{t.curated}</p><h2>{t.roomsWorth}</h2></div><button className="text-btn" onClick={() => setPage("Rooms")}>{t.viewAll} ↗</button></div><RoomGrid rooms={rooms.slice(0, 3)} onSelect={setSelectedRoom} onBook={bookRoom} copy={t}/></section>
      <section className="service-strip"><div><p className="eyebrow">{t.moreThan}</p><h2>{language === "VI" ? <>Làm kỳ nghỉ<br/>của bạn đặc biệt hơn.</> : <>Make your stay<br/>a little more special.</>}</h2></div>{services.map((service, index) => <div className="service-mini" key={service.id}><span className="service-icon">{["↗", "✧", "☼"][index % 3]}</span><h3>{translateCatalog(service.name, language)}</h3><p>{translateCatalog(service.description, language)}</p><strong>{money(service.price)} <small>/ {translateCatalog(service.unit, language)}</small></strong></div>)}</section>
    </main>}
    {page === "Rooms" && <main className="page-content"><p className="eyebrow">{t.findRoom}</p><h1 className="page-title">{t.roomSuites}</h1><SearchPanel search={search} setSearch={setSearch} onSubmit={runSearch} roomTypes={roomTypes}/><form className="room-catalog-filters" onSubmit={applyRoomCatalogFilters}><label>{t.minCapacity}<select value={roomCatalogFilters.minimumCapacity} onChange={(event) => setRoomCatalogFilters({ ...roomCatalogFilters, minimumCapacity: event.target.value })}><option value="">{t.anyCapacity}</option><option value="1">1+ {t.guests}</option><option value="2">2+ {t.guests}</option><option value="3">3+ {t.guests}</option><option value="4">4+ {t.guests}</option></select></label><label>{t.sortBy}<select value={roomCatalogFilters.sort} onChange={(event) => setRoomCatalogFilters({ ...roomCatalogFilters, sort: event.target.value })}><option value="price-asc">{language === "VI" ? "Giá: thấp đến cao" : "Price: low to high"}</option><option value="price-desc">{language === "VI" ? "Giá: cao đến thấp" : "Price: high to low"}</option><option value="capacity-asc">{language === "VI" ? "Sức chứa: thấp đến cao" : "Capacity: low to high"}</option><option value="capacity-desc">{language === "VI" ? "Sức chứa: cao đến thấp" : "Capacity: high to low"}</option></select></label><button className="outline-btn" type="submit" disabled={loading}>{t.apply}</button></form>{loading && <p className="hint">{t.loading}</p>}<RoomGrid rooms={filtered} onSelect={openRoomDetails} onBook={bookRoom} copy={t}/>{filtered.length === 0 && !loading && <div className="empty">{t.noRooms}</div>}</main>}
    {page === "Services" && <main className="page-content"><p className="eyebrow">{t.servicesEyebrow}</p><h1 className="page-title">{t.hotelServices}</h1><div className="service-catalog-toolbar"><label>{language === "VI" ? "Lọc theo danh mục" : "Filter by category"}<select value={serviceCategory} onChange={(event) => setServiceCategory(event.target.value)}><option value="">{t.allServices}</option>{serviceCategories.map((category) => <option key={category} value={category}>{translateCatalog(category, language)}</option>)}</select></label></div><div className="service-grid">{visibleServices.map((service, index) => <article className="service-card" key={service.id}><span className="service-icon">{["↗", "✧", "☼"][index % 3]}</span><small className="service-category">{translateCatalog(service.category, language)}</small><h2>{translateCatalog(service.name, language)}</h2><p>{translateCatalog(service.description, language) || (language === "VI" ? "Dịch vụ tiện ích trong thời gian lưu trú." : "A convenient service available during your stay.")}</p><strong>{money(service.price)} <small>/ {service.unit}</small></strong><div className="service-card-actions"><button className="outline-btn" onClick={() => setServiceDetails(service)}>{language === "VI" ? "Xem chi tiết" : "View details"}</button><button className="primary-btn" onClick={() => openServiceBooking(service)}>{language === "VI" ? "Đặt dịch vụ" : "Book service"}</button></div></article>)}</div>{visibleServices.length === 0 && <div className="empty">{language === "VI" ? "Không có dịch vụ đang hoạt động trong danh mục này." : "No active services are available in this category."}</div>}</main>}
    {page === "Bookings" && <main className="page-content"><p className="eyebrow">{language === "VI" ? "KẾ HOẠCH DU LỊCH CỦA BẠN" : "YOUR TRAVEL PLANS"}</p><div className="section-heading"><h1 className="page-title">{language === "VI" ? "Lịch sử đặt phòng" : "Booking history"}</h1><button className="outline-btn" onClick={openCustomerPaymentHistory}>{language === "VI" ? "Lịch sử thanh toán" : "Payment history"}</button></div>{loading && <p className="hint" role="status">{language === "VI" ? "Đang tải đặt phòng…" : "Loading bookings…"}</p>}<div className="table-wrap"><table><thead><tr><th>{language === "VI" ? "Đặt phòng" : "Booking"}</th><th>{language === "VI" ? "Phòng" : "Room"}</th><th>{language === "VI" ? "Lưu trú" : "Stay"}</th><th>{language === "VI" ? "Tổng tiền" : "Total"}</th><th>{language === "VI" ? "Trạng thái" : "Status"}</th><th>{language === "VI" ? "Thanh toán / Hoàn tiền" : "Payment / Refund"}</th><th>{language === "VI" ? "Thao tác" : "Actions"}</th></tr></thead><tbody>{bookings.map((booking) => { const reviewEligible = eligibleReviewBookings.some((item) => item.bookingid === booking.id); const showBalance = !["Refunded", "Refund pending"].includes(booking.paymentStatus); return <tr key={booking.id}><td><strong>BK-{booking.id}</strong><small>{booking.customerName}</small></td><td>{booking.roomName}</td><td>{booking.checkIn}<small>{language === "VI" ? "đến" : "to"} {booking.checkOut}</small></td><td>{money(booking.total)}</td><td><span className={`status ${booking.status.toLowerCase().replaceAll(" ", "-")}`}>{translateStatus(booking.status, language)}</span></td><td><button className="text-btn" onClick={() => openPaymentStatus(booking)}>{translateStatus(booking.paymentStatus, language)}</button>{showBalance && booking.balance > 0 && <small>{language === "VI" ? "Còn nợ" : "Due"} {money(booking.balance)}</small>}{booking.refundStatus === "Refund pending" && <small>{language === "VI" ? "Chờ Staff xử lý" : "Manual staff review"} · {money(booking.refundAmount)}</small>}</td><td className="actions">{booking.status === "Pending Payment" && <button onClick={() => requestPayment(booking.id)}>{language === "VI" ? "Thanh toán" : "Pay now"}</button>}{["Pending Payment", "Confirmed"].includes(booking.status) && <button onClick={() => cancelBooking(booking.id)}>{language === "VI" ? "Hủy" : "Cancel"}</button>}{booking.status === "Checked Out" && reviewEligible && <button onClick={() => { setReviewBooking(eligibleReviewBookings.find((item) => item.bookingid === booking.id));     setReviewForm({ rating: 0, title: "", comment: "" }); }}>{language === "VI" ? "Viết đánh giá" : "Write review"}</button>}</td></tr>; })}</tbody></table></div>{bookings.length === 0 && !loading && <div className="empty">{language === "VI" ? "Bạn chưa có đặt phòng nào." : "You do not have any bookings yet."}</div>}<p className="hint">{language === "VI" ? "Thanh toán QR khả dụng cho đặt phòng đang chờ. Bạn có thể đánh giá mỗi lượt lưu trú một lần sau khi trả phòng." : "QR payment is available for pending bookings. Completed stays can be reviewed once per booking."}</p></main>}
    {reviewBooking && <div className="modal-overlay" onClick={() => setReviewBooking(null)}><div className="modal review-form-modal" onClick={(event) => event.stopPropagation()}><h3>{language === "VI" ? "Đánh giá kỳ lưu trú" : "Review your stay"}</h3><p className="hint">{language === "VI" ? "Đặt phòng" : "Booking"} BK-{reviewBooking.bookingid} · {reviewBooking.roomtype} · {language === "VI" ? "Phòng" : "Room"} {reviewBooking.roomnumber}</p><form onSubmit={submitReview}><fieldset><legend>{language === "VI" ? "Xếp hạng" : "Rating"}</legend><div className="star-picker">{[1, 2, 3, 4, 5].map((rating) => <button key={rating} type="button" className={rating <= reviewForm.rating ? "selected" : ""} aria-label={`${rating} star${rating > 1 ? "s" : ""}`} onClick={() => setReviewForm({ ...reviewForm, rating })}>★</button>)}</div></fieldset><label>{language === "VI" ? "Tiêu đề (không bắt buộc)" : "Title (optional)"}<input maxLength="120" value={reviewForm.title} onChange={(event) => setReviewForm({ ...reviewForm, title: event.target.value })} placeholder={language === "VI" ? "Tóm tắt kỳ nghỉ của bạn" : "Summarize your stay"} /></label><label>{language === "VI" ? "Nhận xét của bạn" : "Your comments"}<textarea required minLength="10" maxLength="2000" value={reviewForm.comment} onChange={(event) => setReviewForm({ ...reviewForm, comment: event.target.value })} placeholder={language === "VI" ? "Chia sẻ về kỳ nghỉ (ít nhất 10 ký tự)" : "Tell us about your stay (at least 10 characters)"} /></label><small>{reviewForm.comment.length}/2000</small><div className="modal-actions"><button type="button" onClick={() => setReviewBooking(null)}>{language === "VI" ? "Hủy" : "Cancel"}</button><button type="submit" className="primary-btn" disabled={reviewSubmitting}>{reviewSubmitting ? (language === "VI" ? "Đang gửi…" : "Submitting...") : (language === "VI" ? "Gửi đánh giá" : "Submit review")}</button></div></form></div></div>}
    {selectedPaymentStatusBooking && <div className="modal-overlay" onClick={() => setSelectedPaymentStatusBooking(null)}><div className="modal payment-status-modal" onClick={(event) => event.stopPropagation()}><h3>{language === "VI" ? "Trạng thái thanh toán · BK-" : "Booking payment status · BK-"}{selectedPaymentStatusBooking.id}</h3><div className="payment-status-summary"><div><span>{language === "VI" ? "Tổng tiền đặt phòng" : "Total booking amount"}</span><strong>{money(selectedPaymentStatusBooking.total)}</strong></div><div><span>{language === "VI" ? "Tổng đã trả" : "Total paid"}</span><strong>{money(selectedPaymentStatusBooking.paidAmount)}</strong></div><div><span>{language === "VI" ? "Số dư còn lại" : "Outstanding balance"}</span><strong>{money(selectedPaymentStatusBooking.balance)}</strong></div></div><p><strong>{language === "VI" ? "Trạng thái hiện tại:" : "Current status:"}</strong> <span className="status">{selectedPaymentStatusBooking.paymentStatus}</span></p>{selectedPaymentStatusBooking.payments?.length > 0 ? <div className="table-wrap"><table><thead><tr><th>{language === "VI" ? "Giao dịch" : "Transaction"}</th><th>{language === "VI" ? "Số tiền" : "Amount"}</th><th>{language === "VI" ? "Phương thức" : "Method"}</th><th>{language === "VI" ? "Trạng thái" : "Status"}</th><th>{language === "VI" ? "Ngày" : "Date"}</th></tr></thead><tbody>{selectedPaymentStatusBooking.payments.map((payment) => <tr key={payment.paymentid}><td>#{payment.paymentid}</td><td>{money(payment.amount)}</td><td>{payment.paymentmethod}</td><td>{payment.status}</td><td>{payment.transactiondate ? new Date(payment.transactiondate).toLocaleString("vi-VN") : "-"}</td></tr>)}</tbody></table></div> : <p className="empty">{language === "VI" ? "Không tìm thấy giao dịch thanh toán." : "No payment transactions found."}</p>}<div className="modal-actions"><button onClick={refreshPaymentStatus} disabled={paymentStatusLoading}>{paymentStatusLoading ? (language === "VI" ? "Đang cập nhật…" : "Refreshing...") : (language === "VI" ? "Cập nhật trạng thái" : "Refresh status")}</button>{selectedPaymentStatusBooking.balance > 0 && selectedPaymentStatusBooking.status === "Pending Payment" && <button className="primary-btn" onClick={() => { setSelectedPaymentStatusBooking(null); requestPayment(selectedPaymentStatusBooking); }}>{language === "VI" ? "Thanh toán" : "Make payment"}</button>}<button onClick={() => setSelectedPaymentStatusBooking(null)}>{language === "VI" ? "Đóng" : "Close"}</button></div></div></div>}
    {showCustomerPayments && <div className="modal-overlay" onClick={() => setShowCustomerPayments(false)}><div className="modal booking-payment-modal" onClick={(event) => event.stopPropagation()}><h3>{language === "VI" ? "Lịch sử thanh toán" : "Payment history"}</h3><div className="table-wrap"><table><thead><tr><th>{language === "VI" ? "Giao dịch" : "Transaction"}</th><th>{language === "VI" ? "Đặt phòng" : "Booking"}</th><th>{language === "VI" ? "Số tiền" : "Amount"}</th><th>{language === "VI" ? "Phương thức" : "Method"}</th><th>{language === "VI" ? "Trạng thái" : "Status"}</th><th>{language === "VI" ? "Ngày" : "Date"}</th><th>{language === "VI" ? "Biên lai" : "Receipt"}</th></tr></thead><tbody>{customerPayments.map((payment) => <tr key={payment.paymentid}><td>#{payment.paymentid}</td><td>BK-{payment.bookingid}</td><td>{money(payment.amount)}</td><td>{payment.paymentmethod}</td><td>{payment.status}</td><td>{payment.transactiondate ? new Date(payment.transactiondate).toLocaleString("vi-VN") : "-"}</td><td><button className="text-btn" onClick={() => setSelectedCustomerPayment(payment)}>{language === "VI" ? "Xem" : "View"}</button></td></tr>)}{customerPayments.length === 0 && <tr><td colSpan="7" className="empty">{language === "VI" ? "Không tìm thấy giao dịch thanh toán." : "No payment transactions found."}</td></tr>}</tbody></table></div><div className="modal-actions"><button onClick={() => setShowCustomerPayments(false)}>{language === "VI" ? "Đóng" : "Close"}</button></div></div></div>}
    {selectedCustomerPayment && <div className="modal-overlay" onClick={() => setSelectedCustomerPayment(null)}><div className="modal payment-history-receipt" onClick={(event) => event.stopPropagation()}><h3>{language === "VI" ? "Biên lai thanh toán" : "Payment receipt"}</h3><p><strong>{language === "VI" ? "Giao dịch" : "Transaction"}:</strong> #{selectedCustomerPayment.paymentid}</p><p><strong>{language === "VI" ? "Đặt phòng" : "Booking"}:</strong> BK-{selectedCustomerPayment.bookingid}</p><p><strong>{language === "VI" ? "Số tiền" : "Amount"}:</strong> {money(selectedCustomerPayment.amount)}</p><p><strong>{language === "VI" ? "Phương thức" : "Method"}:</strong> {selectedCustomerPayment.paymentmethod}</p><p><strong>{language === "VI" ? "Trạng thái" : "Status"}:</strong> {selectedCustomerPayment.status}</p><p><strong>{language === "VI" ? "Mã tham chiếu" : "Reference"}:</strong> {selectedCustomerPayment.transactionref || (language === "VI" ? "Không có" : "Not available")}</p><p><strong>{language === "VI" ? "Ngày" : "Date"}:</strong> {selectedCustomerPayment.transactiondate ? new Date(selectedCustomerPayment.transactiondate).toLocaleString("vi-VN") : "-"}</p><div className="modal-actions"><button onClick={() => window.print()}>{language === "VI" ? "In / Lưu PDF" : "Print / Save PDF"}</button><button onClick={() => setSelectedCustomerPayment(null)}>{language === "VI" ? "Đóng" : "Close"}</button></div></div></div>}
    {page === "Reviews" && <main className="page-content"><p className="eyebrow">{language === "VI" ? "CÂU CHUYỆN CỦA KHÁCH" : "GUEST STORIES"}</p><h1 className="page-title">{language === "VI" ? "Lời yêu thương từ khách hàng" : "Kind words from our guests"}</h1><section className="review-overview"><div className="review-average"><strong>{reviewSummary.average.toFixed(1)}</strong><div className="stars">{"★".repeat(Math.round(reviewSummary.average))}{"☆".repeat(5 - Math.round(reviewSummary.average))}</div><span>{reviewSummary.count} {language === "VI" ? "đánh giá đã xác thực" : "verified guest reviews"}</span></div><div className="review-breakdown">{[5, 4, 3, 2, 1].map((rating) => { const count = reviewSummary[["zero", "one", "two", "three", "four", "five"][rating]]; const percentage = reviewSummary.count ? Math.round((count / reviewSummary.count) * 100) : 0; return <div className="review-breakdown-row" key={rating}><span>{rating} {language === "VI" ? "sao" : "stars"}</span><div><i style={{ width: `${percentage}%` }} /></div><strong>{count}</strong></div>; })}</div></section><form className="review-filters" onSubmit={applyReviewFilters}><label>{language === "VI" ? "Lọc theo xếp hạng" : "Filter by rating"}<select value={reviewFilters.rating} onChange={(event) => setReviewFilters({ ...reviewFilters, rating: event.target.value })}><option value="">{language === "VI" ? "Tất cả xếp hạng" : "All ratings"}</option><option value="5">5 {language === "VI" ? "sao" : "stars"}</option><option value="4">4 {language === "VI" ? "sao" : "stars"}</option><option value="3">3 {language === "VI" ? "sao" : "stars"}</option><option value="2">2 {language === "VI" ? "sao" : "stars"}</option><option value="1">1 {language === "VI" ? "sao" : "star"}</option></select></label><label>{language === "VI" ? "Sắp xếp đánh giá" : "Sort reviews"}<select value={reviewFilters.sort} onChange={(event) => setReviewFilters({ ...reviewFilters, sort: event.target.value })}><option value="recent">{language === "VI" ? "Mới nhất" : "Most recent"}</option><option value="highest">{language === "VI" ? "Xếp hạng cao nhất" : "Highest rating"}</option><option value="lowest">{language === "VI" ? "Xếp hạng thấp nhất" : "Lowest rating"}</option></select></label><button className="outline-btn" type="submit" disabled={reviewLoading}>{language === "VI" ? "Áp dụng" : "Apply"}</button></form><div className="review-grid">{reviews.map((review) => <article className="review-card" key={review.id}><div className="stars">{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</div>{review.title && <h3>{review.title}</h3>}<p>“{review.text}”</p><strong>{review.author}</strong>{review.createdAt && <small>{new Date(review.createdAt).toLocaleDateString("vi-VN")}</small>}</article>)}</div>{reviews.length === 0 && !reviewLoading && <div className="empty">{language === "VI" ? "Chưa có đánh giá." : "No reviews available yet."}</div>}{reviewLoading && <p className="hint" role="status">{language === "VI" ? "Đang tải đánh giá…" : "Loading reviews…"}</p>}{reviewHasMore && !reviewLoading && <button className="outline-btn review-load-more" onClick={() => loadReviews()}>{language === "VI" ? "Tải thêm đánh giá" : "Load more reviews"}</button>}</main>}
    {page === "Dashboard" && <Dashboard user={user} />}
    {page === "Login" && <main className="auth-wrap"><form className="auth-card" onSubmit={submitAuth}><p className="eyebrow">{authMode === "login" ? "WELCOME BACK" : "JOIN STAYORA"}</p><h1>{authMode === "login" ? "Sign in" : "Create an account"}</h1><p>{authMode === "login" ? "Use your account to manage bookings." : "Create a customer account to book your stay."}</p>{authMode === "register" && <label>Full name<input required value={authForm.fullName} onChange={(event) => setAuthForm({ ...authForm, fullName: event.target.value })}/></label>}<label>Email or username<input required value={authForm.email} onChange={(event) => setAuthForm({ ...authForm, email: event.target.value })} placeholder="you@example.com"/></label>{authMode === "register" && <label>Phone<input value={authForm.phone} onChange={(event) => setAuthForm({ ...authForm, phone: event.target.value })} placeholder="0900000000"/></label>}<label>Password<input required type="password" value={authForm.password} onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })} placeholder="Enter your password"/></label>{authMode === "register" && <label>Confirm password<input required type="password" value={authForm.confirmPassword} onChange={(event) => setAuthForm({ ...authForm, confirmPassword: event.target.value })}/></label>}<button className="primary-btn full" disabled={loading}>{loading ? "Please wait…" : authMode === "login" ? "Sign in" : "Create account"}</button><button className="text-btn" type="button" onClick={() => setAuthMode(authMode === "login" ? "register" : "login")}>{authMode === "login" ? "Create an account" : "Back to sign in"}</button></form></main>}
    <footer><button className="brand" onClick={() => setPage("Home")} aria-label="STAYORA"><BrandLogo /></button><p>{language === "VI" ? "Thoải mái trong từng chi tiết. © 2026 STAYORA." : "Comfort in every detail. © 2026 STAYORA."}</p><div>{language === "VI" ? "Đặt phòng khách sạn" : "Hotel Booking"}</div></footer>
    {selectedRoom && <div className="modal-backdrop" onClick={closeRoomDetails}><section className="modal room-detail-modal" role="dialog" aria-modal="true" aria-labelledby="room-detail-title" onClick={(event) => event.stopPropagation()}><button className="modal-close" type="button" aria-label={language === "VI" ? "Đóng chi tiết phòng" : "Close room details"} onClick={closeRoomDetails}>×</button>{selectedRoom.isLoading ? <p className="hint" role="status">{language === "VI" ? "Đang tải chi tiết phòng…" : "Loading room details…"}</p> : <><img src={selectedRoom.image} alt={`${translateCatalog(selectedRoom.type, language)} room`} /><p className="eyebrow">{translateCatalog(selectedRoom.type, language)} · {language === "VI" ? "PHÒNG" : "ROOM"} {selectedRoom.roomNumber}</p><h2 id="room-detail-title">{translateCatalog(selectedRoom.name, language)}</h2><p>{translateCatalog(selectedRoom.description, language)}</p><div className="room-detail-facts"><p><strong>{language === "VI" ? "Sức chứa" : "Capacity"}</strong><span>{language === "VI" ? "Tối đa" : "Up to"} {selectedRoom.capacity} {language === "VI" ? "khách" : "guests"}</span></p><p><strong>{language === "VI" ? "Loại giường" : "Bed type"}</strong><span>{translateCatalog(selectedRoom.beds, language)}</span></p><p><strong>{language === "VI" ? "Trạng thái phòng" : "Room status"}</strong><span className={`room-status ${String(selectedRoom.status || "").toLowerCase()}`}>{translateStatus(selectedRoom.status, language)}</span></p></div><h3 className="room-amenities-title">{language === "VI" ? "Tiện nghi" : "Amenities"}</h3>{selectedRoom.amenities.length ? <div className="amenities">{selectedRoom.amenities.map((amenity) => <span key={amenity}>{translateCatalog(amenity, language)}</span>)}</div> : <p>{language === "VI" ? "Chưa có thông tin tiện nghi cho loại phòng này." : "Amenities have not been listed for this room type."}</p>}<strong className="modal-price">{money(selectedRoom.price)} <small>/ {language === "VI" ? "đêm" : "night"}</small></strong>{String(selectedRoom.status).toLowerCase() === "available" && <button className="primary-btn full" onClick={() => bookRoom(selectedRoom)}>{language === "VI" ? "Đặt phòng này" : "Book this room"}</button>}</>}</section></div>}
    {serviceDetails && <div className="modal-overlay" onClick={() => setServiceDetails(null)}><div className="modal service-detail-modal" onClick={(event) => event.stopPropagation()}><p className="eyebrow">{translateCatalog(serviceDetails.category, language)}</p><h3>{translateCatalog(serviceDetails.name, language)}</h3><p>{translateCatalog(serviceDetails.description, language) || (language === "VI" ? "Thông tin dịch vụ do khách sạn cung cấp." : "Service details are available from the hotel team.")}</p><div className="service-detail-facts"><div><span>{language === "VI" ? "Giá" : "Price"}</span><strong>{money(serviceDetails.price)} / {serviceDetails.unit}</strong></div><div><span>{language === "VI" ? "Giờ hoạt động" : "Operating hours"}</span><strong>{translateCatalog(serviceDetails.operatingHours, language) || (language === "VI" ? "Vui lòng liên hệ lễ tân" : "Please contact reception")}</strong></div><div><span>{language === "VI" ? "Điều kiện" : "Conditions"}</span><strong>{translateCatalog(serviceDetails.conditions, language) || (language === "VI" ? "Tùy tình trạng cung cấp" : "Subject to availability")}</strong></div>{serviceDetails.capacity && <div><span>{language === "VI" ? "Sức chứa" : "Capacity"}</span><strong>{serviceDetails.capacity} {language === "VI" ? "đặt chỗ mỗi khung giờ" : "bookings per time slot"}</strong></div>}</div><div className="modal-actions"><button type="button" onClick={() => setServiceDetails(null)}>{language === "VI" ? "Đóng" : "Close"}</button><button type="button" className="primary-btn" onClick={() => { setServiceDetails(null); openServiceBooking(serviceDetails); }}>{language === "VI" ? "Đặt dịch vụ" : "Book service"}</button></div></div></div>}
    {selectedService && <div className="modal-backdrop" onClick={() => setSelectedService(null)}><form className="modal" onSubmit={submitServiceBooking} onClick={(event) => event.stopPropagation()}><button className="modal-close" type="button" onClick={() => setSelectedService(null)}>×</button><p className="eyebrow">{language === "VI" ? "DỊCH VỤ KHÁCH SẠN" : "HOTEL SERVICE"}</p><h2>{selectedService.name}</h2><label>{language === "VI" ? "Đặt phòng" : "Room booking"}<select required value={serviceForm.bookingId} onChange={(event) => setServiceForm({ ...serviceForm, bookingId: event.target.value })}>{serviceBookings.map((booking) => <option key={booking.id} value={booking.id}>{booking.id} · {booking.roomName} · {booking.status}</option>)}</select></label><label>{language === "VI" ? "Ngày sử dụng" : "Service date"}<input required type="date" min={serviceBookings.find((booking) => String(booking.id) === serviceForm.bookingId)?.checkIn || undefined} max={serviceBookings.find((booking) => String(booking.id) === serviceForm.bookingId)?.checkOut ? new Date(new Date(serviceBookings.find((booking) => String(booking.id) === serviceForm.bookingId).checkOut).getTime() - 86400000).toISOString().slice(0, 10) : undefined} value={serviceForm.serviceDate} onChange={(event) => setServiceForm({ ...serviceForm, serviceDate: event.target.value })}/></label><label>{language === "VI" ? "Khung giờ" : "Time slot"}<input required maxLength="50" value={serviceForm.timeSlot} onChange={(event) => setServiceForm({ ...serviceForm, timeSlot: event.target.value })} placeholder={language === "VI" ? "VD: 09:00-10:00" : "e.g. 09:00-10:00"}/></label><label>{language === "VI" ? "Số lượng" : "Quantity"}<input required type="number" min="1" value={serviceForm.quantity} onChange={(event) => setServiceForm({ ...serviceForm, quantity: event.target.value })}/></label><label>{language === "VI" ? "Ghi chú đặc biệt" : "Special notes"}<textarea maxLength="500" value={serviceForm.specialNotes} onChange={(event) => setServiceForm({ ...serviceForm, specialNotes: event.target.value })}/></label><button className="primary-btn full">{language === "VI" ? "Xác nhận đặt dịch vụ" : "Confirm service booking"}</button></form></div>}
  </div>;
}

function SearchPanel({ search, setSearch, onSubmit, roomTypes }) {
  const [language] = useLanguage();
  const vi = language === "VI";
  return <form className="search-panel" onSubmit={onSubmit}><label>{vi ? "NHẬN PHÒNG" : "CHECK IN"}<input type="date" value={search.checkIn} min={new Date().toISOString().slice(0, 10)} onChange={(event) => setSearch({ ...search, checkIn: event.target.value })} required/></label><label>{vi ? "TRẢ PHÒNG" : "CHECK OUT"}<input type="date" value={search.checkOut} min={search.checkIn || new Date().toISOString().slice(0, 10)} onChange={(event) => setSearch({ ...search, checkOut: event.target.value })} required/></label><label>{vi ? "SỐ KHÁCH" : "GUESTS"}<select value={search.guests} onChange={(event) => setSearch({ ...search, guests: event.target.value })}><option value="1">1 {vi ? "khách" : "Guest"}</option><option value="2">2 {vi ? "khách" : "Guests"}</option><option value="3">3 {vi ? "khách" : "Guests"}</option><option value="4">4 {vi ? "khách" : "Guests"}</option></select></label><label>{vi ? "LOẠI PHÒNG" : "ROOM TYPE"}<select value={search.type} onChange={(event) => setSearch({ ...search, type: event.target.value })}><option value="All">{vi ? "Tất cả" : "All"}</option>{roomTypes.map((type) => <option key={type.id} value={type.name}>{translateCatalog(type.name, language)}</option>)}</select></label><button className="primary-btn search-btn" type="submit">{vi ? "Tìm phòng" : "Search rooms"} ↗</button></form>;
}

function RoomGrid({ rooms, onSelect, onBook, copy }) {
  const labels = copy || { viewDetails: "View details", book: "Book", night: "/ night", guests: "guests" };
  const [language] = useLanguage();
  return <div className="room-grid">{rooms.map((room) => <article className="room-card" key={room.id}><button className="room-image-btn" onClick={() => onSelect(room)} aria-label={`${labels.viewDetails}: ${translateCatalog(room.name, language)}`}><img src={room.imagePreview || room.image} alt={translateCatalog(room.name, language)}/><span>{translateCatalog(room.type, language)}</span></button><div className="room-info"><div className="room-title-row"><h3>{translateCatalog(room.type, language)}</h3><span className="rating">{copy?.guests === "khách" ? "Tối đa" : "Up to"} {room.capacity} {labels.guests}</span></div><p>{copy?.guests === "khách" ? "Phòng" : "Room"} {room.roomNumber} · {translateCatalog(room.beds, language)}</p><div className="room-bottom"><div><strong>{money(room.price)}</strong><small>{labels.night}</small></div><button className="room-details-link" type="button" onClick={() => onSelect(room)}>{labels.viewDetails}</button><button className="book-inline" onClick={() => onBook(room)}>{labels.book}</button></div></div></article>)}</div>;
}
