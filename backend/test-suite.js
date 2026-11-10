// Comprehensive Automated Functional Test Suite for StayEase Hotel Booking System
import 'dotenv/config';
import { query } from './config/database.js';

const BASE_URL = 'http://localhost:3000';

let results = [];
let passedCount = 0;
let failedCount = 0;

function logTest(category, name, passed, details = '') {
  if (passed) {
    passedCount++;
    console.log(`  ✅ [PASS] ${name}`);
    results.push({ category, name, status: 'PASS', details });
  } else {
    failedCount++;
    console.log(`  ❌ [FAIL] ${name} - ${details}`);
    results.push({ category, name, status: 'FAIL', details });
  }
}

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };
  const config = {
    method: options.method || 'GET',
    headers
  };
  if (options.body) {
    config.body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
  }
  const res = await fetch(url, config);
  let data = null;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try { data = await res.json(); } catch { }
  } else {
    try { data = await res.text(); } catch { }
  }
  return { status: res.status, data, headers: res.headers };
}

async function runAllTests() {
  console.log('===============================================================');
  console.log('🚀 BẮT ĐẦU CHẠY KIỂM THỬ TOÀN BỘ CHỨC NĂNG HỆ THỐNG HOTEL BOOKING');
  console.log('===============================================================\n');

  try {
    await query(`
      UPDATE discountcode 
      SET validfrom = CURRENT_DATE - INTERVAL '1 day', 
          validto = CURRENT_DATE + INTERVAL '365 days', 
          isactive = true 
      WHERE codestring IN ('WELCOME10', 'SUMMER20', 'LOYALTY15')
    `);
  } catch { }

  let customerToken = '';
  let staffToken = '';
  let adminToken = '';
  let customerUser = null;
  let createdRoomTypeId = null;
  let createdRoomId = null;
  let createdServiceId = null;
  let createdDiscountId = null;
  let createdBookingId = null;
  let createdReviewId = null;
  let cancelBookingId = null;
  let paidRefundBookingId = null;
  let refundRequestId = null;

  // -------------------------------------------------------------
  // 1. HEALTH CHECK & SYSTEM STATUS
  // -------------------------------------------------------------
  console.log('📌 1. KIỂM THỬ TRẠNG THÁI HỆ THỐNG & KẾT NỐI DATABASE');
  try {
    const res = await request('/health');
    const ok = res.status === 200 && res.data?.status === 'ok' && res.data?.database === 'connected';
    logTest('System', 'GET /health - Kiểm tra API & Database hoạt động', ok, JSON.stringify(res.data));
  } catch (err) {
    logTest('System', 'GET /health - Kiểm tra API & Database hoạt động', false, err.message);
  }

  // -------------------------------------------------------------
  // 2. AUTHENTICATION & ACCESS CONTROL
  // -------------------------------------------------------------
  console.log('\n📌 2. KIỂM THỬ XÁC THỰC, PHÂN QUYỀN & TÀI KHOẢN');

  // 2.1 Invalid Login
  try {
    const res = await request('/api/v1/auth/login', {
      method: 'POST',
      body: { username: 'admin@stayease.com', password: 'WrongPassword@999' }
    });
    logTest('Auth', 'POST /auth/login - Đăng nhập sai mật khẩu bị từ chối (401)', res.status === 401, `Status: ${res.status}`);
  } catch (err) {
    logTest('Auth', 'POST /auth/login - Đăng nhập sai mật khẩu bị từ chối (401)', false, err.message);
  }

  // 2.2 Customer Login
  try {
    const res = await request('/api/v1/auth/login', {
      method: 'POST',
      body: { username: 'customer@stayease.com', password: 'Customer@123' }
    });
    const ok = res.status === 200 && res.data?.token && res.data?.user?.role === 'customer';
    customerToken = res.data?.token;
    customerUser = res.data?.user;
    logTest('Auth', 'POST /auth/login - Đăng nhập Khách hàng thành công (Customer)', ok, `Token received, Role: ${res.data?.user?.role}`);
  } catch (err) {
    logTest('Auth', 'POST /auth/login - Đăng nhập Khách hàng thành công', false, err.message);
  }

  // 2.3 Staff Login
  try {
    const res = await request('/api/v1/auth/login', {
      method: 'POST',
      body: { username: 'staff@stayease.com', password: 'Staff@123' }
    });
    const ok = res.status === 200 && res.data?.token && res.data?.user?.role === 'staff';
    staffToken = res.data?.token;
    logTest('Auth', 'POST /auth/login - Đăng nhập Nhân viên thành công (Staff)', ok, `Token received, Role: ${res.data?.user?.role}`);
  } catch (err) {
    logTest('Auth', 'POST /auth/login - Đăng nhập Nhân viên thành công', false, err.message);
  }

  // 2.4 Admin Login
  try {
    const res = await request('/api/v1/auth/login', {
      method: 'POST',
      body: { username: 'admin@stayease.com', password: 'Admin@123' }
    });
    const ok = res.status === 200 && res.data?.token && res.data?.user?.role === 'admin';
    adminToken = res.data?.token;
    logTest('Auth', 'POST /auth/login - Đăng nhập Quản trị viên thành công (Admin)', ok, `Token received, Role: ${res.data?.user?.role}`);
  } catch (err) {
    logTest('Auth', 'POST /auth/login - Đăng nhập Quản trị viên thành công', false, err.message);
  }

  // 2.5 Auth Profile
  try {
    const res = await request('/api/v1/auth/profile', {
      headers: { Authorization: `Bearer ${customerToken}` }
    });
    const ok = res.status === 200 && res.data?.username === 'customer@stayease.com';
    logTest('Auth', 'GET /auth/profile - Xem thông tin hồ sơ cá nhân', ok, `Username: ${res.data?.username}`);
  } catch (err) {
    logTest('Auth', 'GET /auth/profile - Xem thông tin hồ sơ cá nhân', false, err.message);
  }

  // 2.6 Update Profile
  try {
    const res = await request('/api/v1/auth/profile', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${customerToken}` },
      body: { fullName: 'John Doe Customer Updated', phone: '0912345678' }
    });
    const ok = res.status === 200 && res.data?.fullname === 'John Doe Customer Updated';
    logTest('Auth', 'PATCH /auth/profile - Cập nhật thông tin hồ sơ cá nhân', ok, `Full name: ${res.data?.fullname}`);
  } catch (err) {
    logTest('Auth', 'PATCH /auth/profile - Cập nhật thông tin hồ sơ cá nhân', false, err.message);
  }

  // 2.7 Role-based Security: Customer trying to access Admin route
  try {
    const res = await request('/api/v1/staff/refunds', {
      headers: { Authorization: `Bearer ${customerToken}` }
    });
    logTest('Auth', 'Bảo mật phân quyền - Chặn Customer truy cập endpoint Staff/Admin (403)', res.status === 403, `Status: ${res.status}`);
  } catch (err) {
    logTest('Auth', 'Bảo mật phân quyền - Chặn Customer truy cập endpoint Staff/Admin (403)', false, err.message);
  }

  // 2.8 Unauthenticated access blocked
  try {
    const res = await request('/api/v1/admin/bookings');
    logTest('Auth', 'Bảo mật xác thực - Chặn người dùng chưa đăng nhập (401)', res.status === 401, `Status: ${res.status}`);
  } catch (err) {
    logTest('Auth', 'Bảo mật xác thực - Chặn người dùng chưa đăng nhập (401)', false, err.message);
  }

  // -------------------------------------------------------------
  // 3. ROOMS & ROOM TYPES CATALOG & SEARCH
  // -------------------------------------------------------------
  console.log('\n📌 3. KIỂM THỬ DANH MỤC PHÒNG, TÌM KIẾM & QUẢN LÝ PHÒNG');

  // 3.1 List Rooms
  try {
    const res = await request('/api/v1/rooms');
    const ok = res.status === 200 && Array.isArray(res.data) && res.data.length > 0;
    logTest('Rooms', 'GET /rooms - Lấy danh sách phòng công khai', ok, `Số lượng phòng: ${res.data?.length}`);
  } catch (err) {
    logTest('Rooms', 'GET /rooms - Lấy danh sách phòng công khai', false, err.message);
  }

  // 3.2 List Room Types
  try {
    const res = await request('/api/v1/rooms/room-types');
    const ok = res.status === 200 && Array.isArray(res.data) && res.data.length > 0;
    logTest('Rooms', 'GET /rooms/room-types - Lấy danh mục các loại phòng', ok, `Loại phòng: ${res.data?.map(t => t.name).join(', ')}`);
  } catch (err) {
    logTest('Rooms', 'GET /rooms/room-types - Lấy danh mục các loại phòng', false, err.message);
  }

  // 3.3 Search Rooms
  try {
    const futureIn = new Date();
    futureIn.setDate(futureIn.getDate() + 30);
    const futureOut = new Date();
    futureOut.setDate(futureOut.getDate() + 32);
    const inStr = futureIn.toISOString().split('T')[0];
    const outStr = futureOut.toISOString().split('T')[0];

    const res = await request(`/api/v1/rooms/search?checkIn=${inStr}&checkOut=${outStr}&guests=2`);
    const ok = res.status === 200 && Array.isArray(res.data) && res.data.length > 0;
    logTest('Rooms', 'GET /rooms/search - Tìm kiếm phòng theo ngày nhận/trả và số khách', ok, `Tìm thấy ${res.data?.length} phòng trống`);
  } catch (err) {
    logTest('Rooms', 'GET /rooms/search - Tìm kiếm phòng theo ngày nhận/trả', false, err.message);
  }

  // 3.4 Admin create room type
  try {
    const res = await request('/api/v1/rooms/types', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        name: `Penthouse Test ${Date.now()}`,
        price: 3500000,
        capacity: 4,
        amenities: 'Panoramic View, Jacuzzi, Private Terrace, Butler',
        description: 'Luxury penthouse suite for test'
      }
    });
    const ok = res.status === 201 && res.data?.roomtypeid;
    if (ok) createdRoomTypeId = res.data.roomtypeid;
    logTest('Rooms', 'POST /rooms/types - Admin tạo loại phòng mới', ok, `RoomTypeId: ${createdRoomTypeId}`);
  } catch (err) {
    logTest('Rooms', 'POST /rooms/types - Admin tạo loại phòng mới', false, err.message);
  }

  // 3.5 Admin update room type
  if (createdRoomTypeId) {
    try {
      const res = await request(`/api/v1/rooms/types/${createdRoomTypeId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: { price: 3800000, description: 'Updated penthouse suite description' }
      });
      const ok = res.status === 200 && Number(res.data?.price) === 3800000;
      logTest('Rooms', 'PATCH /rooms/types/:id - Admin cập nhật loại phòng', ok, `New price: ${res.data?.price}`);
    } catch (err) {
      logTest('Rooms', 'PATCH /rooms/types/:id - Admin cập nhật loại phòng', false, err.message);
    }
  }

  // 3.6 Admin create room
  if (createdRoomTypeId) {
    try {
      const roomNum = `T${Math.floor(100 + Math.random() * 899)}`;
      const res = await request('/api/v1/rooms', {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: {
          roomTypeId: createdRoomTypeId,
          roomNumber: roomNum,
          floor: 4,
          status: 'available'
        }
      });
      const ok = res.status === 201 && res.data?.roomid;
      if (ok) createdRoomId = res.data.roomid;
      logTest('Rooms', 'POST /rooms - Admin thêm phòng mới vào khách sạn', ok, `RoomId: ${createdRoomId}, Number: ${roomNum}`);
    } catch (err) {
      logTest('Rooms', 'POST /rooms - Admin thêm phòng mới vào khách sạn', false, err.message);
    }
  }

  // 3.7 Staff update room status
  if (createdRoomId) {
    try {
      const res = await request(`/api/v1/rooms/${createdRoomId}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${staffToken}` },
        body: { status: 'cleaning' }
      });
      const ok = res.status === 200 && res.data?.status === 'cleaning';
      logTest('Rooms', 'PATCH /rooms/:id/status - Staff đổi trạng thái phòng (cleaning/maintenance)', ok, `Status: ${res.data?.status}`);
    } catch (err) {
      logTest('Rooms', 'PATCH /rooms/:id/status - Staff đổi trạng thái phòng', false, err.message);
    }
  }

  // 3.8 Staff room management list
  try {
    const res = await request('/api/v1/rooms/management', {
      headers: { Authorization: `Bearer ${staffToken}` }
    });
    const ok = res.status === 200 && Array.isArray(res.data) && res.data.length > 0;
    logTest('Rooms', 'GET /rooms/management - Staff/Admin xem danh sách quản lý phòng đầy đủ', ok, `Tổng số phòng: ${res.data?.length}`);
  } catch (err) {
    logTest('Rooms', 'GET /rooms/management - Staff/Admin xem danh sách quản lý phòng', false, err.message);
  }

  // -------------------------------------------------------------
  // 4. HOTEL SERVICES MANAGEMENT
  // -------------------------------------------------------------
  console.log('\n📌 4. KIỂM THỬ DANH MỤC & QUẢN LÝ DỊCH VỤ KHÁCH SẠN');

  // 4.1 List Services
  try {
    const res = await request('/api/v1/services');
    const ok = res.status === 200 && Array.isArray(res.data) && res.data.length > 0;
    logTest('Services', 'GET /services - Lấy danh sách dịch vụ công khai', ok, `Dịch vụ hiện có: ${res.data?.map(s => s.name).join(', ')}`);
  } catch (err) {
    logTest('Services', 'GET /services - Lấy danh sách dịch vụ công khai', false, err.message);
  }

  // 4.2 Admin create service
  try {
    const res = await request('/api/v1/services', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        name: `VIP Yacht Cruise ${Date.now()}`,
        description: 'Sunset yacht cruise along the bay with wine and appetizers',
        price: 1500000,
        conditions: 'Booking required 12h in advance',
        category: 'Leisure',
        operatingHours: '16:00 - 19:00',
        capacity: 10
      }
    });
    const ok = res.status === 201 && res.data?.serviceid;
    if (ok) createdServiceId = res.data.serviceid;
    logTest('Services', 'POST /services - Admin thêm dịch vụ khách sạn mới', ok, `ServiceId: ${createdServiceId}`);
  } catch (err) {
    logTest('Services', 'POST /services - Admin thêm dịch vụ khách sạn mới', false, err.message);
  }

  // 4.3 Admin update service
  if (createdServiceId) {
    try {
      const res = await request(`/api/v1/services/${createdServiceId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: { price: 1800000 }
      });
      const ok = res.status === 200 && Number(res.data?.price) === 1800000;
      logTest('Services', 'PATCH /services/:id - Admin cập nhật giá/thông tin dịch vụ', ok, `Updated Price: ${res.data?.price}`);
    } catch (err) {
      logTest('Services', 'PATCH /services/:id - Admin cập nhật thông tin dịch vụ', false, err.message);
    }
  }

  // -------------------------------------------------------------
  // 5. DISCOUNT CODES MANAGEMENT
  // -------------------------------------------------------------
  console.log('\n📌 5. KIỂM THỬ QUY CHẾ VÀ MÃ GIẢM GIÁ (DISCOUNT CODES)');

  // 5.1 Admin create discount code
  const testDiscountCode = `TESTPROMO${Math.floor(100 + Math.random() * 899)}`;
  try {
    const today = new Date().toISOString().split('T')[0];
    const nextMonth = new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0];
    const res = await request('/api/v1/discounts', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        codeString: testDiscountCode,
        discountType: 'percentage',
        discountValue: 25,
        validFrom: today,
        validTo: nextMonth,
        usageLimit: 50
      }
    });
    const ok = res.status === 201 && (res.data?.codeid || res.data?.discountid);
    if (ok) createdDiscountId = res.data.codeid || res.data.discountid;
    logTest('Discounts', 'POST /discounts - Admin tạo mã giảm giá mới', ok, `Mã: ${testDiscountCode}, Giảm: 25%`);
  } catch (err) {
    logTest('Discounts', 'POST /discounts - Admin tạo mã giảm giá mới', false, err.message);
  }

  // 5.2 Validate discount code
  try {
    const res = await request(`/api/v1/discounts/validate?code=${testDiscountCode}&roomTypeId=1`);
    const ok = res.status === 200 && res.data?.codestring === testDiscountCode;
    logTest('Discounts', 'GET /discounts/validate - Kiểm tra tính hợp lệ của mã giảm giá', ok, `Giảm: ${res.data?.discountvalue}%`);
  } catch (err) {
    logTest('Discounts', 'GET /discounts/validate - Kiểm tra mã giảm giá', false, err.message);
  }

  // 5.3 Public available discounts
  try {
    const res = await request('/api/v1/discounts/available?roomTypeId=1');
    const ok = res.status === 200 && Array.isArray(res.data);
    logTest('Discounts', 'GET /discounts/available - Danh sách mã giảm giá khả dụng', ok, `Số lượng mã: ${res.data?.length}`);
  } catch (err) {
    logTest('Discounts', 'GET /discounts/available - Danh sách mã giảm giá khả dụng', false, err.message);
  }

  // 5.4 Admin list all discounts
  try {
    const res = await request('/api/v1/discounts', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const ok = res.status === 200 && Array.isArray(res.data);
    logTest('Discounts', 'GET /discounts - Admin quản lý toàn bộ danh sách mã giảm giá', ok, `Tổng cộng: ${res.data?.length} mã`);
  } catch (err) {
    logTest('Discounts', 'GET /discounts - Admin quản lý danh sách mã giảm giá', false, err.message);
  }

  // 5.5 Admin toggle discount status
  if (createdDiscountId) {
    try {
      const res = await request(`/api/v1/discounts/${createdDiscountId}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: { isActive: false }
      });
      const ok = res.status === 200 && res.data?.isactive === false;
      logTest('Discounts', 'PATCH /discounts/:id/status - Admin kích hoạt/ngưng kích hoạt mã', ok, `isActive: ${res.data?.isactive}`);
    } catch (err) {
      logTest('Discounts', 'PATCH /discounts/:id/status - Admin đổi trạng thái mã', false, err.message);
    }
  }

  // -------------------------------------------------------------
  // 6. END-TO-END BOOKING LIFECYCLE (ĐẶT PHÒNG, THANH TOÁN, CHECK-IN, DỊCH VỤ, CHECK-OUT, ĐÁNH GIÁ)
  // -------------------------------------------------------------
  console.log('\n📌 6. KIỂM THỬ QUY TRÌNH ĐẶT PHÒNG HOÀN CHỈNH (END-TO-END BOOKING LIFECYCLE)');

  // 6.1 Create Booking
  // Ensure Room 1 is clean and ready (status: available)
  try {
    await request('/api/v1/rooms/1/status', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${staffToken}` },
      body: { status: 'available' }
    });
  } catch { }

  const randomOffset = Math.floor(Math.random() * 200) + 10;
  const checkInDate = new Date();
  checkInDate.setDate(checkInDate.getDate() + randomOffset);
  const checkOutDate = new Date();
  checkOutDate.setDate(checkOutDate.getDate() + randomOffset + 3);
  const checkInStr = checkInDate.toISOString().split('T')[0];
  const checkOutStr = checkOutDate.toISOString().split('T')[0];

  try {
    const res = await request('/api/v1/bookings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customerToken}` },
      body: {
        roomId: 1,
        checkIn: checkInStr,
        checkOut: checkOutStr,
        guestName: 'John Doe Customer',
        contactPhone: '0912345678',
        guests: 2,
        codeString: 'WELCOME10',
        specialRequests: 'High floor, quiet room please.'
      }
    });
    const ok = res.status === 201 && res.data?.bookingid;
    if (ok) createdBookingId = res.data.bookingid;
    logTest('Booking', 'POST /bookings - Khách hàng tạo đơn đặt phòng thành công', ok, ok ? `BookingId: ${createdBookingId}, Total: ${Number(res.data?.totalamount || 0).toLocaleString()} VND` : `Status: ${res.status}, Error: ${JSON.stringify(res.data)}`);
  } catch (err) {
    logTest('Booking', 'POST /bookings - Khách hàng tạo đơn đặt phòng', false, err.message);
  }

  // 6.2 View Booking Details
  if (createdBookingId) {
    try {
      const res = await request(`/api/v1/bookings/${createdBookingId}`, {
        headers: { Authorization: `Bearer ${customerToken}` }
      });
      const ok = res.status === 200 && res.data?.bookingid === createdBookingId;
      logTest('Booking', 'GET /bookings/:id - Xem chi tiết đơn đặt phòng', ok, `Status: ${res.data?.status}, Guest: ${res.data?.guestname}`);
    } catch (err) {
      logTest('Booking', 'GET /bookings/:id - Xem chi tiết đơn đặt phòng', false, err.message);
    }
  }

  // 6.3 Customer Create Payment Request & Simulation
  if (createdBookingId) {
    try {
      // Step A: Create payment request
      const initRes = await request(`/api/v1/bookings/${createdBookingId}/payments`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${customerToken}` },
        body: { method: 'credit_card' }
      });
      const initOk = initRes.status === 201 && initRes.data?.payment?.paymentid;

      // Step B: Simulate gateway completion
      const res = await request('/api/v1/payments', {
        method: 'POST',
        headers: { Authorization: `Bearer ${customerToken}` },
        body: {
          bookingId: createdBookingId,
          outcome: 'completed'
        }
      });
      const ok = initOk && res.status === 200 && res.data?.status === 'completed';
      logTest('Payment', 'POST /payments - Khách hàng khởi tạo & thanh toán thành công (Mô phỏng)', ok, `Payment Status: ${res.data?.status}, Method: ${res.data?.paymentmethod}`);
    } catch (err) {
      logTest('Payment', 'POST /payments - Thanh toán đơn phòng thành công', false, err.message);
    }
  }

  // 6.4 Staff Check-in guest
  if (createdBookingId) {
    try {
      const res = await request(`/api/v1/bookings/${createdBookingId}/check-in`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${staffToken}` }
      });
      const ok = res.status === 200 && res.data?.status === 'checked_in';
      logTest('Staff', 'POST /bookings/:id/check-in - Staff làm thủ tục nhận phòng (Check-in)', ok, `Booking Status: ${res.data?.status}`);
    } catch (err) {
      logTest('Staff', 'POST /bookings/:id/check-in - Staff làm thủ tục nhận phòng', false, err.message);
    }
  }

  // 6.5 Book Extra Service during in-house stay
  if (createdBookingId) {
    try {
      const res = await request('/api/v1/service-bookings', {
        method: 'POST',
        headers: { Authorization: `Bearer ${customerToken}` },
        body: {
          bookingId: createdBookingId,
          serviceId: 2, // Breakfast
          quantity: 2,
          serviceDate: checkInStr,
          timeSlot: '07:30 - 08:30',
          specialNotes: 'Table near the window'
        }
      });
      const ok = res.status === 201 && (res.data?.servicebookingid || res.data?.serviceBookingId);
      logTest('Services', 'POST /service-bookings - Khách hàng đặt dịch vụ trong kỳ lưu trú (Buffet Sáng)', ok, `ServiceBookingId: ${res.data?.servicebookingid}`);
    } catch (err) {
      logTest('Services', 'POST /service-bookings - Khách hàng đặt thêm dịch vụ', false, err.message);
    }
  }

  // 6.6 Customer list their service bookings
  try {
    const res = await request('/api/v1/service-bookings', {
      headers: { Authorization: `Bearer ${customerToken}` }
    });
    const ok = res.status === 200 && Array.isArray(res.data) && res.data.length > 0;
    logTest('Services', 'GET /service-bookings - Khách hàng xem các dịch vụ đã đặt', ok, `Đã đặt ${res.data?.length} dịch vụ`);
  } catch (err) {
    logTest('Services', 'GET /service-bookings - Khách hàng xem dịch vụ đã đặt', false, err.message);
  }

  // 6.7 Staff view bookings list
  try {
    const res = await request('/api/v1/admin/bookings', {
      headers: { Authorization: `Bearer ${staffToken}` }
    });
    const ok = res.status === 200 && Array.isArray(res.data) && res.data.length > 0;
    logTest('Staff', 'GET /admin/bookings - Staff xem danh sách toàn bộ lượt đặt phòng', ok, `Tổng số lượt đặt: ${res.data?.length}`);
  } catch (err) {
    logTest('Staff', 'GET /admin/bookings - Staff xem danh sách đặt phòng', false, err.message);
  }

  // 6.8 Staff View Stay Invoice (including services)
  if (createdBookingId) {
    try {
      const res = await request(`/api/v1/staff/stays/${createdBookingId}/invoice`, {
        headers: { Authorization: `Bearer ${staffToken}` }
      });
      const ok = res.status === 200 && res.data?.bookingid && Array.isArray(res.data?.services);
      logTest('Staff', 'GET /staff/stays/:id/invoice - Xuất hóa đơn chi tiết lưu trú (Phòng + Dịch vụ)', ok, `Services count: ${res.data?.services?.length}, Total: ${Number(res.data?.totalamount || 0).toLocaleString()} VND, Balance: ${Number(res.data?.balance || 0).toLocaleString()} VND`);
    } catch (err) {
      logTest('Staff', 'GET /staff/stays/:id/invoice - Xuất hóa đơn chi tiết', false, err.message);
    }
  }

  // 6.9 Staff collect stay payment for added services
  if (createdBookingId) {
    try {
      const res = await request(`/api/v1/staff/stays/${createdBookingId}/payments`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${staffToken}` },
        body: { method: 'cash' }
      });
      const ok = res.status === 201;
      logTest('Staff', 'POST /staff/stays/:id/payments - Staff thu tiền dịch vụ phát sinh tại quầy', ok, `Status: ${res.status}`);
    } catch (err) {
      logTest('Staff', 'POST /staff/stays/:id/payments - Staff thu tiền dịch vụ phát sinh', false, err.message);
    }
  }

  // 6.10 Staff Check-out guest
  if (createdBookingId) {
    try {
      const res = await request(`/api/v1/bookings/${createdBookingId}/check-out`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${staffToken}` }
      });
      const ok = res.status === 200 && res.data?.status === 'checked_out';
      logTest('Staff', 'POST /bookings/:id/check-out - Staff làm thủ tục trả phòng (Check-out)', ok, `Booking Status: ${res.data?.status}`);
    } catch (err) {
      logTest('Staff', 'POST /bookings/:id/check-out - Staff làm thủ tục trả phòng', false, err.message);
    }
  }

  // 6.10 Check Eligible Reviews for Customer
  if (createdBookingId) {
    try {
      const res = await request('/api/v1/reviews/eligible', {
        headers: { Authorization: `Bearer ${customerToken}` }
      });
      const ok = res.status === 200 && Array.isArray(res.data) && res.data.some(b => b.bookingid === createdBookingId);
      logTest('Reviews', 'GET /reviews/eligible - Khách hàng kiểm tra các đơn đủ điều kiện đánh giá', ok, `Tìm thấy đơn #${createdBookingId}`);
    } catch (err) {
      logTest('Reviews', 'GET /reviews/eligible - Kiểm tra đơn đủ điều kiện đánh giá', false, err.message);
    }
  }

  // 6.11 Customer Submit Review
  if (createdBookingId) {
    try {
      const res = await request('/api/v1/reviews', {
        method: 'POST',
        headers: { Authorization: `Bearer ${customerToken}` },
        body: {
          bookingId: createdBookingId,
          rating: 5,
          title: 'Kỳ nghỉ tuyệt hảo!',
          comment: 'Phòng ốc sạch sẽ, tiện nghi hiện đại và nhân viên hỗ trợ rất nhiệt tình. Tôi sẽ quay lại!'
        }
      });
      const ok = res.status === 201 && res.data?.reviewid;
      if (ok) createdReviewId = res.data.reviewid;
      logTest('Reviews', 'POST /reviews - Khách hàng gửi đánh giá & xếp hạng sao', ok, `ReviewId: ${createdReviewId}, Rating: 5/5 ⭐`);
    } catch (err) {
      logTest('Reviews', 'POST /reviews - Khách hàng gửi đánh giá', false, err.message);
    }
  }

  // 6.12 Staff/Admin Moderate & Approve Review
  if (createdReviewId) {
    try {
      const res = await request(`/api/v1/reviews/${createdReviewId}/approval`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${staffToken}` },
        body: { isApproved: true }
      });
      const ok = res.status === 200 && res.data?.isapproved === true;
      logTest('Reviews', 'PATCH /reviews/:id/approval - Staff duyệt đánh giá công khai', ok, `isApproved: ${res.data?.isapproved}`);
    } catch (err) {
      logTest('Reviews', 'PATCH /reviews/:id/approval - Staff duyệt đánh giá', false, err.message);
    }
  }

  // 6.13 Public list of reviews contains approved review
  try {
    const res = await request('/api/v1/reviews');
    const ok = res.status === 200 && Array.isArray(res.data?.items) && res.data.items.length > 0;
    logTest('Reviews', 'GET /reviews - Xem danh sách đánh giá đã duyệt ngoài trang chủ', ok, `Tổng đánh giá: ${res.data?.items?.length}`);
  } catch (err) {
    logTest('Reviews', 'GET /reviews - Xem danh sách đánh giá', false, err.message);
  }

  // -------------------------------------------------------------
  // 7. BOOKING CANCELLATION & REFUND
  // -------------------------------------------------------------
  console.log('\n📌 7. KIỂM THỬ HỦY ĐẶT PHÒNG & YÊU CẦU HOÀN TIỀN');

  // 7.1 Create a second future booking for cancellation test
  const cancelOffset = randomOffset + 20;
  const futureCheckIn = new Date();
  futureCheckIn.setDate(futureCheckIn.getDate() + cancelOffset);
  const futureCheckOut = new Date();
  futureCheckOut.setDate(futureCheckOut.getDate() + cancelOffset + 2);

  try {
    const res = await request('/api/v1/bookings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customerToken}` },
      body: {
        roomId: 2,
        checkIn: futureCheckIn.toISOString().split('T')[0],
        checkOut: futureCheckOut.toISOString().split('T')[0],
        guestName: 'John Doe Cancellation Test',
        contactPhone: '0912345678',
        guests: 1
      }
    });
    if (res.status === 201) cancelBookingId = res.data.bookingid;
  } catch { }

  // 7.2 Cancel Booking
  if (cancelBookingId) {
    try {
      const res = await request(`/api/v1/bookings/${cancelBookingId}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${customerToken}` }
      });
      const ok = res.status === 200 && res.data?.status === 'cancelled';
      logTest('Booking', 'POST /bookings/:id/cancel - Khách hàng hủy đơn đặt phòng trước ngày nhận', ok, `Status: ${res.data?.status}, Message: ${res.data?.message}`);
    } catch (err) {
      logTest('Booking', 'POST /bookings/:id/cancel - Khách hàng hủy đơn đặt phòng', false, err.message);
    }
  }

  // 7.3 Staff view refund requests
  try {
    const res = await request('/api/v1/staff/refunds', {
      headers: { Authorization: `Bearer ${staffToken}` }
    });
    const ok = res.status === 200 && Array.isArray(res.data);
    logTest('Staff', 'GET /staff/refunds - Staff kiểm tra danh sách yêu cầu hoàn tiền', ok, `Số yêu cầu hoàn: ${res.data?.length}`);
  } catch (err) {
    logTest('Staff', 'GET /staff/refunds - Staff kiểm tra danh sách hoàn tiền', false, err.message);
  }

  // 7.4 Create a paid future booking to trigger a real refund request
  const refundOffset = cancelOffset + 15;
  const refundCheckIn = new Date();
  refundCheckIn.setDate(refundCheckIn.getDate() + refundOffset);
  const refundCheckOut = new Date();
  refundCheckOut.setDate(refundCheckOut.getDate() + refundOffset + 2);
  const refundInStr = refundCheckIn.toISOString().split('T')[0];
  const refundOutStr = refundCheckOut.toISOString().split('T')[0];

  try {
    // Pick a room guaranteed free for the test dates via public search
    const roomsRes = await request(`/api/v1/rooms/search?checkIn=${refundInStr}&checkOut=${refundOutStr}&guests=1`);
    const availableRoom = Array.isArray(roomsRes.data)
      ? roomsRes.data.find((r) => Number(r.roomid) !== 2)
      : null;
    if (!availableRoom) throw new Error('No available room found for refund test');

    const createRes = await request('/api/v1/bookings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customerToken}` },
      body: {
        roomId: availableRoom.roomid,
        checkIn: refundInStr,
        checkOut: refundOutStr,
        guestName: 'Refund Flow Test Guest',
        contactPhone: '0912345678',
        guests: 1
      }
    });
    if (createRes.status !== 201 || !createRes.data?.bookingid) {
      throw new Error(`Create booking failed: ${createRes.status} ${JSON.stringify(createRes.data)}`);
    }
    paidRefundBookingId = createRes.data.bookingid;

    // Pay the booking in full via mock gateway
    await request(`/api/v1/bookings/${paidRefundBookingId}/payments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${customerToken}` },
      body: { method: 'credit_card' }
    });
    const payRes = await request('/api/v1/payments', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customerToken}` },
      body: { bookingId: paidRefundBookingId, outcome: 'completed' }
    });
    const ok = payRes.status === 200 && payRes.data?.status === 'completed';
    logTest('Refund', 'Setup - Tạo booking đã thanh toán để kiểm thử hoàn tiền', ok, `BookingId: ${paidRefundBookingId}, Payment: ${payRes.data?.status}`);
  } catch (err) {
    logTest('Refund', 'Setup - Tạo booking đã thanh toán để kiểm thử hoàn tiền', false, err.message);
  }

  // 7.5 Cancel paid booking -> refund request must be created
  if (paidRefundBookingId) {
    try {
      const res = await request(`/api/v1/bookings/${paidRefundBookingId}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${customerToken}` }
      });
      const refundReq = res.data?.refundrequest;
      const ok = res.status === 200 && res.data?.status === 'cancelled' && refundReq?.refundrequestid;
      if (ok) {
        refundRequestId = refundReq.refundrequestid;
        // Refund amount must equal the amount actually paid
        const bookingRes = await request(`/api/v1/bookings/${paidRefundBookingId}`, {
          headers: { Authorization: `Bearer ${customerToken}` }
        });
        const paid = (bookingRes.data?.payments || [])
          .filter((p) => p.status === 'completed')
          .reduce((sum, p) => sum + Number(p.amount), 0);
        if (Math.abs(Number(refundReq.amount) - paid) > 0.01) {
          logTest('Refund', 'POST /bookings/:id/cancel - Hủy booking đã trả tiền tạo yêu cầu hoàn tiền đúng số tiền', false, `Refund ${refundReq.amount} != paid ${paid}`);
        } else {
          logTest('Refund', 'POST /bookings/:id/cancel - Hủy booking đã trả tiền tạo yêu cầu hoàn tiền đúng số tiền', true, `RefundId: ${refundRequestId}, Amount: ${refundReq.amount}`);
        }
      } else {
        logTest('Refund', 'POST /bookings/:id/cancel - Hủy booking đã trả tiền tạo yêu cầu hoàn tiền', false, `Status: ${res.status}, Refund: ${JSON.stringify(refundReq)}`);
      }
    } catch (err) {
      logTest('Refund', 'POST /bookings/:id/cancel - Hủy booking đã trả tiền tạo yêu cầu hoàn tiền', false, err.message);
    }
  }

  // 7.6 Staff is forbidden from completing a refund
  if (refundRequestId) {
    try {
      const res = await request(`/api/v1/staff/refunds/${refundRequestId}/complete`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${staffToken}` }
      });
      logTest('Refund', 'POST /staff/refunds/:id/complete - Staff bị chặn hoàn tất hoàn tiền (403)', res.status === 403, `Status: ${res.status}`);
    } catch (err) {
      logTest('Refund', 'POST /staff/refunds/:id/complete - Staff bị chặn hoàn tất hoàn tiền (403)', false, err.message);
    }
  }

  // 7.7 Admin completes the refund
  if (refundRequestId) {
    try {
      const res = await request(`/api/v1/staff/refunds/${refundRequestId}/complete`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      const ok = res.status === 200 && res.data?.status === 'refunded';
      logTest('Refund', 'POST /staff/refunds/:id/complete - Admin xác nhận hoàn tất hoàn tiền', ok, `Status: ${res.status}, RefundStatus: ${res.data?.status}`);

      // Verify payments were marked refunded
      const bookingRes = await request(`/api/v1/bookings/${paidRefundBookingId}`, {
        headers: { Authorization: `Bearer ${customerToken}` }
      });
      const allRefunded = (bookingRes.data?.payments || [])
        .filter((p) => p.status === 'completed')
        .length === 0;
      logTest('Refund', 'Kiểm tra payment chuyển trạng thái refunded sau khi hoàn tất', allRefunded, `Payments: ${JSON.stringify((bookingRes.data?.payments || []).map(p => p.status))}`);

      // 7.8 Completing the same refund twice must be rejected (409)
      try {
        const again = await request(`/api/v1/staff/refunds/${refundRequestId}/complete`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${adminToken}` }
        });
        logTest('Refund', 'POST /staff/refunds/:id/complete - Hoàn tất trùng bị từ chối (409)', again.status === 409, `Status: ${again.status}`);
      } catch (err) {
        logTest('Refund', 'POST /staff/refunds/:id/complete - Hoàn tất trùng bị từ chối (409)', false, err.message);
      }
    } catch (err) {
      logTest('Refund', 'POST /staff/refunds/:id/complete - Admin xác nhận hoàn tất hoàn tiền', false, err.message);
    }
  }

  // 7.9 Refund request appears in staff list with pending status before completion is impossible to re-check,
  // so instead verify list still works and contains the processed request
  if (refundRequestId) {
    try {
      const res = await request('/api/v1/staff/refunds', {
        headers: { Authorization: `Bearer ${staffToken}` }
      });
      const found = Array.isArray(res.data) && res.data.some((r) => r.refundrequestid === refundRequestId && r.status === 'refunded');
      logTest('Refund', 'GET /staff/refunds - Danh sách hoàn tiền phản ánh trạng thái refunded', found, `Found refund ${refundRequestId}: ${found}`);
    } catch (err) {
      logTest('Refund', 'GET /staff/refunds - Danh sách hoàn tiền phản ánh trạng thái refunded', false, err.message);
    }
  }

  // -------------------------------------------------------------
  // 8. CUSTOMER MANAGEMENT (STAFF/ADMIN)
  // -------------------------------------------------------------
  console.log('\n📌 8. KIỂM THỬ QUẢN LÝ HỒ SƠ KHÁCH HÀNG (STAFF & ADMIN)');

  // 8.1 List Customers
  let testCustomerId = null;
  try {
    const res = await request('/api/v1/customers', {
      headers: { Authorization: `Bearer ${staffToken}` }
    });
    const ok = res.status === 200 && Array.isArray(res.data) && res.data.length > 0;
    if (ok) testCustomerId = res.data[0].customerid;
    logTest('Customers', 'GET /customers - Staff xem danh sách khách hàng trong hệ thống', ok, `Số lượng khách hàng: ${res.data?.length}`);
  } catch (err) {
    logTest('Customers', 'GET /customers - Staff xem danh sách khách hàng', false, err.message);
  }

  // 8.2 Get single customer details
  if (testCustomerId) {
    try {
      const res = await request(`/api/v1/customers/${testCustomerId}`, {
        headers: { Authorization: `Bearer ${staffToken}` }
      });
      const ok = res.status === 200 && res.data?.customerid === testCustomerId;
      logTest('Customers', 'GET /customers/:id - Staff xem hồ sơ chi tiết một khách hàng', ok, `Khách hàng: ${res.data?.fullname}, Email: ${res.data?.email}`);
    } catch (err) {
      logTest('Customers', 'GET /customers/:id - Staff xem hồ sơ chi tiết khách hàng', false, err.message);
    }
  }

  // 8.3 Admin toggle customer active status
  if (testCustomerId) {
    try {
      const res = await request(`/api/v1/customers/${testCustomerId}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: { isActive: true }
      });
      const ok = res.status === 200 && res.data?.isactive === true;
      logTest('Customers', 'PATCH /customers/:id/status - Admin cập nhật trạng thái hoạt động của khách hàng', ok, `isActive: ${res.data?.isactive}`);
    } catch (err) {
      logTest('Customers', 'PATCH /customers/:id/status - Admin cập nhật trạng thái', false, err.message);
    }
  }

  // -------------------------------------------------------------
  // CLEANUP TEST DATA (Rooms, Room Types, Services)
  // -------------------------------------------------------------
  if (createdRoomId) {
    try {
      await request(`/api/v1/rooms/${createdRoomId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` }
      });
    } catch { }
  }
  if (createdRoomTypeId) {
    try {
      await request(`/api/v1/rooms/types/${createdRoomTypeId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` }
      });
    } catch { }
  }
  if (createdServiceId) {
    try {
      await request(`/api/v1/services/${createdServiceId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` }
      });
    } catch { }
  }

  // -------------------------------------------------------------
  // SUMMARY REPORT
  // -------------------------------------------------------------
  console.log('\n===============================================================');
  console.log('📊 TỔNG HỢP KẾT QUẢ KIỂM THỬ HỆ THỐNG HOTEL BOOKING:');
  console.log(`  Tổng số ca kiểm thử: ${passedCount + failedCount}`);
  console.log(`  ✅ Thành công (Passed): ${passedCount}`);
  console.log(`  ❌ Thất bại (Failed): ${failedCount}`);
  console.log(`  Tỉ lệ thành công: ${Math.round((passedCount / (passedCount + failedCount)) * 100)}%`);
  console.log('===============================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runAllTests();