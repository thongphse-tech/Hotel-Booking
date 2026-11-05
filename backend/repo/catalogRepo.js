import { pool, query } from "../config/database.js";

export const catalogRepo = {
  listDiscounts: async () => (await query("SELECT dc.*, CASE WHEN dc.roomtypeid IS NULL THEN NULL ELSE COALESCE(rt.name, 'Deleted room type') END AS roomtypename FROM discountcode dc LEFT JOIN roomtype rt ON rt.roomtypeid = dc.roomtypeid ORDER BY dc.codeid")).rows,
  getDiscount: async (id) => (await query("SELECT * FROM discountcode WHERE codeid = $1", [id])).rows[0],
  getActiveRoomType: async (id) => (await query("SELECT roomtypeid FROM roomtype WHERE roomtypeid = $1 AND isdeleted = false", [id])).rows[0],
  findValidDiscount: async (code, roomTypeId) => (await query("SELECT codeid, codestring, roomtypeid, discounttype, discountvalue, validfrom, validto, usagelimit, usedcount FROM discountcode WHERE codestring = upper($1) AND (roomtypeid IS NULL OR roomtypeid = $2) AND isactive = true AND validfrom <= CURRENT_DATE AND validto >= CURRENT_DATE AND (usagelimit IS NULL OR usedcount < usagelimit)", [code, roomTypeId])).rows[0],
  listAvailableDiscounts: async (roomTypeId) => (await query("SELECT codeid, codestring, roomtypeid, discounttype, discountvalue, validfrom, validto FROM discountcode WHERE (roomtypeid IS NULL OR roomtypeid = $1) AND isactive = true AND validfrom <= CURRENT_DATE AND validto >= CURRENT_DATE AND (usagelimit IS NULL OR usedcount < usagelimit) ORDER BY discountvalue DESC, codeid", [roomTypeId])).rows,
  createDiscount: async (data) => (await query("INSERT INTO discountcode (codestring, roomtypeid, discounttype, discountvalue, validfrom, validto, usagelimit) VALUES (upper($1), $2, $3, $4, $5, $6, $7) RETURNING *", [data.codeString.trim(), data.roomTypeId, data.discountType, data.discountValue, data.validFrom, data.validTo, data.usageLimit])).rows[0],
  updateDiscount: async (id, data) => (await query("UPDATE discountcode SET codestring = $2, roomtypeid = $3, discounttype = $4, discountvalue = $5, validfrom = $6, validto = $7, usagelimit = $8 WHERE codeid = $1 RETURNING *", [id, data.codeString.trim(), data.roomTypeId, data.discountType, data.discountValue, data.validFrom, data.validTo, data.usageLimit])).rows[0],
  setDiscountActive: async (id, active) => (await query("UPDATE discountcode SET isactive = $2 WHERE codeid = $1 RETURNING *", [id, active])).rows[0],
  listServices: async ({ category } = {}) => (await query("SELECT serviceid, name, category, description, price, conditions, operatinghours, capacity FROM hotelservice WHERE isdeleted = false AND ($1::text IS NULL OR lower(category) = lower($1)) ORDER BY serviceid", [category || null])).rows,
  getService: async (id) => (await query("SELECT * FROM hotelservice WHERE serviceid = $1 AND isdeleted = false", [id])).rows[0],
  findServiceName: async (name, category, excludedId = null) => (await query("SELECT serviceid FROM hotelservice WHERE lower(name) = lower($1) AND lower(category) = lower($2) AND isdeleted = false AND ($3::int IS NULL OR serviceid <> $3)", [name, category, excludedId])).rows[0],
  countActiveServiceBookings: async (id) => (await query("SELECT COUNT(*)::int AS count FROM servicebooking sb JOIN booking b ON b.bookingid = sb.bookingid WHERE sb.serviceid = $1 AND sb.status = 'confirmed' AND b.status IN ('pending_payment', 'confirmed', 'checked_in')", [id])).rows[0].count,
  createService: async (data) => (await query("INSERT INTO hotelservice (name, category, description, price, conditions, operatinghours, capacity) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *", [data.name.trim(), data.category || "General", data.description || null, data.price, data.conditions || null, data.operatingHours || null, data.capacity || null])).rows[0],
  updateService: async (id, data) => (await query("UPDATE hotelservice SET name = COALESCE($2, name), category = COALESCE($3, category), description = COALESCE($4, description), price = COALESCE($5, price), conditions = COALESCE($6, conditions), operatinghours = COALESCE($7, operatinghours), capacity = COALESCE($8, capacity) WHERE serviceid = $1 AND isdeleted = false RETURNING *", [id, data.name?.trim() ?? null, data.category ?? null, data.description ?? null, data.price ?? null, data.conditions ?? null, data.operatingHours ?? null, data.capacity ?? null])).rows[0],
  deleteService: async (id) => (await query("UPDATE hotelservice SET isdeleted = true WHERE serviceid = $1 AND isdeleted = false AND NOT EXISTS (SELECT 1 FROM servicebooking sb JOIN booking b ON b.bookingid = sb.bookingid WHERE sb.serviceid = hotelservice.serviceid AND sb.status = 'confirmed' AND b.status IN ('pending_payment', 'confirmed', 'checked_in')) RETURNING serviceid", [id])).rows[0],
  listReviews: async ({ rating, sort, limit, offset, all = false }) => (await query(`SELECT rv.reviewid, rv.bookingid, rv.customerid, c.fullname AS author, rv.rating, rv.title, rv.comment, rv.isapproved, rv.createdat FROM review rv JOIN customer c ON c.customerid = rv.customerid WHERE ($4::boolean = true OR rv.isapproved = true) AND ($1::int IS NULL OR rv.rating = $1) ORDER BY ${sort === "highest" ? "rv.rating DESC, rv.createdat DESC" : sort === "lowest" ? "rv.rating ASC, rv.createdat DESC" : "rv.createdat DESC"} LIMIT $2 OFFSET $3`, [rating || null, limit, offset, Boolean(all)])).rows,
  reviewSummary: async () => (await query("SELECT COALESCE(AVG(rating), 0) AS average, COUNT(*)::int AS count, COUNT(*) FILTER (WHERE rating = 5)::int AS five, COUNT(*) FILTER (WHERE rating = 4)::int AS four, COUNT(*) FILTER (WHERE rating = 3)::int AS three, COUNT(*) FILTER (WHERE rating = 2)::int AS two, COUNT(*) FILTER (WHERE rating = 1)::int AS one FROM review WHERE isapproved = true")).rows[0],
  eligibleReviewBookings: async (customerId) => (await query(
    `SELECT b.bookingid, b.checkindate, b.checkoutdate, r.roomnumber, rt.name AS roomtype
     FROM booking b
     JOIN room r ON r.roomid = b.roomid
     JOIN roomtype rt ON rt.roomtypeid = r.roomtypeid
     WHERE b.customerid = $1 AND b.status = 'checked_out'
       AND NOT EXISTS (SELECT 1 FROM review rv WHERE rv.bookingid = b.bookingid AND rv.customerid = b.customerid)
     ORDER BY b.checkoutdate DESC`,
    [customerId]
  )).rows,
  createReview: async ({ bookingId, customerId, rating, title, comment }) => (await query("INSERT INTO review (bookingid, customerid, rating, title, comment) VALUES ($1, $2, $3, $4, $5) RETURNING *", [bookingId, customerId, rating, title || null, comment.trim()])).rows[0],
  approveReview: async (id, approved) => (await query("UPDATE review SET isapproved = $2 WHERE reviewid = $1 RETURNING *", [id, approved])).rows[0],
  reviewBooking: async (id) => (await query("SELECT bookingid, customerid, status FROM booking WHERE bookingid = $1", [id])).rows[0],
  serviceBookingNotification: async (bookingId, serviceId) => (await query("SELECT c.email, c.fullname, b.bookingid, hs.name AS servicename FROM booking b JOIN customer c ON c.customerid = b.customerid JOIN hotelservice hs ON hs.serviceid = $2 WHERE b.bookingid = $1", [bookingId, serviceId])).rows[0],
  listServiceBookings: async (customerId) => (await query("SELECT sb.*, hs.name AS servicename, b.customerid, b.roomid, r.roomnumber FROM servicebooking sb JOIN hotelservice hs ON hs.serviceid = sb.serviceid JOIN booking b ON b.bookingid = sb.bookingid JOIN room r ON r.roomid = b.roomid WHERE ($1::int IS NULL OR b.customerid = $1) ORDER BY sb.bookingdate DESC", [customerId || null])).rows,
  createServiceBooking: async ({ bookingId, serviceId, quantity, serviceDate, timeSlot, specialNotes }) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const booking = (await client.query("SELECT bookingid, customerid, checkindate, checkoutdate, status FROM booking WHERE bookingid = $1 FOR UPDATE", [bookingId])).rows[0];
      if (!booking || !["confirmed", "checked_in"].includes(booking.status)) throw Object.assign(new Error("A confirmed or active room booking is required."), { status: 409 });
      const checkInDate = new Date(booking.checkindate).toISOString().slice(0, 10);
      const checkOutDate = new Date(booking.checkoutdate).toISOString().slice(0, 10);
      if (serviceDate < checkInDate || serviceDate >= checkOutDate) throw Object.assign(new Error("Service date must be within the room stay period."), { status: 400 });
      const service = (await client.query("SELECT * FROM hotelservice WHERE serviceid = $1 AND isdeleted = false FOR UPDATE", [serviceId])).rows[0];
      if (!service) throw Object.assign(new Error("This service is currently unavailable."), { status: 404 });
      if (service.capacity !== null) {
        const used = (await client.query("SELECT COALESCE(SUM(quantity), 0)::int AS quantity FROM servicebooking WHERE serviceid = $1 AND servicedate = $2 AND timeslot = $3 AND status = 'confirmed'", [serviceId, serviceDate, timeSlot])).rows[0].quantity;
        if (Number(used) + quantity > service.capacity) throw Object.assign(new Error("Selected time slot is fully booked. Please select another time."), { status: 409 });
      }
      const total = (Number(service.price) * quantity).toFixed(2);
      const serviceBooking = (await client.query("INSERT INTO servicebooking (bookingid, serviceid, quantity, totalprice, servicedate, timeslot, specialnotes) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *", [bookingId, serviceId, quantity, total, serviceDate, timeSlot, specialNotes || null])).rows[0];
      await client.query("UPDATE booking SET totalamount = totalamount + $2 WHERE bookingid = $1", [bookingId, total]);
      await client.query("COMMIT");
      return serviceBooking;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },
  listCustomers: async () => (await query("SELECT c.customerid, c.fullname, c.email, c.phone, c.address, ua.isactive, c.createdat, COUNT(b.bookingid)::int AS bookingcount, MAX(b.createdat) AS lastbookingat FROM customer c JOIN useraccount ua ON ua.accountid = c.accountid LEFT JOIN booking b ON b.customerid = c.customerid GROUP BY c.customerid, ua.isactive ORDER BY c.customerid")).rows,
  getCustomer: async (id) => {
    const customer = (await query("SELECT c.customerid, c.accountid, c.fullname, c.email, c.phone, c.address, c.createdat, ua.isactive FROM customer c JOIN useraccount ua ON ua.accountid = c.accountid WHERE c.customerid = $1", [id])).rows[0];
    if (!customer) return null;
    const bookings = (await query("SELECT b.bookingid, b.checkindate, b.checkoutdate, b.status, b.totalamount, r.roomnumber, rt.name AS roomtype FROM booking b JOIN room r ON r.roomid = b.roomid JOIN roomtype rt ON rt.roomtypeid = r.roomtypeid WHERE b.customerid = $1 ORDER BY b.createdat DESC", [id])).rows;
    return { ...customer, bookings };
  },
  updateCustomer: async (id, data) => (await query("UPDATE customer SET fullname = $2, email = $3, phone = $4, address = $5 WHERE customerid = $1 RETURNING customerid, fullname, email, phone, address", [id, data.fullName.trim(), data.email.trim().toLowerCase(), data.phone || null, data.address || null])).rows[0],
  setCustomerActive: async (id, active) => (await query("UPDATE useraccount SET isactive = $2 WHERE accountid = (SELECT accountid FROM customer WHERE customerid = $1) RETURNING accountid, isactive", [id, active])).rows[0]
};
