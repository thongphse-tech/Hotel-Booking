import { pool, query } from "../config/database.js";

const roomFields = "r.roomid, r.roomtypeid, r.roomnumber, r.floor, r.status, r.isdeleted, rt.name AS type, rt.price, rt.capacity, rt.amenities, rt.description, rt.imageurl";
const roomSortOptions = {
  "price-asc": "rt.price ASC, r.roomnumber ASC",
  "price-desc": "rt.price DESC, r.roomnumber ASC",
  "capacity-asc": "rt.capacity ASC, rt.price ASC, r.roomnumber ASC",
  "capacity-desc": "rt.capacity DESC, rt.price ASC, r.roomnumber ASC"
};

export const roomRepo = {
  list: async ({ minimumCapacity, sort }) => (await query(
    `SELECT ${roomFields} FROM room r JOIN roomtype rt ON rt.roomtypeid = r.roomtypeid
     WHERE r.isdeleted = false AND rt.isdeleted = false
       AND r.status NOT IN ('maintenance', 'cleaning')
       AND ($1::integer IS NULL OR rt.capacity >= $1)
     ORDER BY ${roomSortOptions[sort]}`,
    [minimumCapacity]
  )).rows,
  listManagement: async () => (await query(
    `SELECT ${roomFields} FROM room r JOIN roomtype rt ON rt.roomtypeid = r.roomtypeid
     WHERE r.isdeleted = false AND rt.isdeleted = false ORDER BY r.roomnumber`
  )).rows,
  findById: async (id) => (await query(`SELECT ${roomFields} FROM room r JOIN roomtype rt ON rt.roomtypeid = r.roomtypeid WHERE r.roomid = $1 AND r.isdeleted = false AND rt.isdeleted = false`, [id])).rows[0],
  search: async ({ checkIn, checkOut, guests, type }) => (await query(`SELECT ${roomFields} FROM room r JOIN roomtype rt ON rt.roomtypeid = r.roomtypeid WHERE r.isdeleted = false AND rt.isdeleted = false AND r.status = 'available' AND rt.capacity >= $1 AND ($2::text IS NULL OR rt.name = $2) AND ($3::date IS NULL OR NOT EXISTS (SELECT 1 FROM booking b WHERE b.roomid = r.roomid AND (b.status IN ('confirmed','checked_in') OR (b.status = 'pending' AND b.createdat > NOW() - INTERVAL '15 minutes')) AND b.checkindate < $4::date AND b.checkoutdate > $3::date)) ORDER BY rt.price`, [Number(guests || 1), type && type !== "All" ? type : null, checkIn || null, checkOut || null])).rows,
  create: async ({ roomTypeId, roomNumber, floor, status = "available" }) => (await query("INSERT INTO room (roomtypeid, roomnumber, floor, status) VALUES ($1, $2, $3, $4) RETURNING *", [roomTypeId, roomNumber.trim(), floor, status])).rows[0],
  update: async (id, { roomTypeId, roomNumber, floor, status }) => (await query("UPDATE room SET roomtypeid = $2, roomnumber = $3, floor = $4, status = $5 WHERE roomid = $1 AND isdeleted = false RETURNING *", [id, roomTypeId, roomNumber.trim(), floor, status])).rows[0],
  updateStatus: async (id, status) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const room = (await client.query("SELECT roomid, status FROM room WHERE roomid = $1 AND isdeleted = false FOR UPDATE", [id])).rows[0];
      if (!room) {
        await client.query("ROLLBACK");
        return null;
      }
      const activeStay = (await client.query("SELECT 1 FROM booking WHERE roomid = $1 AND status = 'checked_in' LIMIT 1", [id])).rowCount > 0;
      if (activeStay && status !== "occupied") throw Object.assign(new Error("A room with an in-house guest must remain occupied until check-out."), { status: 409 });
      if (status === "occupied" && !activeStay) throw Object.assign(new Error("A room can only be marked occupied when a guest is checked in."), { status: 409 });
      const updated = (await client.query("UPDATE room SET status = $2 WHERE roomid = $1 RETURNING *", [id, status])).rows[0];
      await client.query("COMMIT");
      return updated;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },
  softDelete: async (id) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const room = (await client.query("SELECT roomid FROM room WHERE roomid = $1 AND isdeleted = false FOR UPDATE", [id])).rows[0];
      if (!room) {
        await client.query("ROLLBACK");
        return null;
      }
      const booking = await client.query(
        "SELECT 1 FROM booking WHERE roomid = $1 AND status IN ('pending', 'confirmed', 'checked_in') LIMIT 1",
        [id]
      );
      if (booking.rowCount) {
        await client.query("ROLLBACK");
        return { hasBookings: true };
      }
      await client.query("UPDATE room SET isdeleted = true WHERE roomid = $1", [id]);
      await client.query("COMMIT");
      return { hasBookings: false };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },
  listTypes: async () => (await query("SELECT * FROM roomtype WHERE isdeleted = false ORDER BY roomtypeid")).rows,
  createType: async (data) => (await query("INSERT INTO roomtype (name, price, capacity, amenities, description) VALUES ($1, $2, $3, $4, $5) RETURNING *", [data.name.trim(), data.price, data.capacity, data.amenities || null, data.description || null])).rows[0],
  updateType: async (id, data) => (await query("UPDATE roomtype SET name = COALESCE($2, name), price = COALESCE($3, price), capacity = COALESCE($4, capacity), amenities = COALESCE($5, amenities), description = COALESCE($6, description) WHERE roomtypeid = $1 AND isdeleted = false RETURNING *", [id, data.name?.trim() ?? null, data.price ?? null, data.capacity ?? null, data.amenities ?? null, data.description ?? null])).rows[0],
  setTypeImage: async (id, imageurl) => (await query("UPDATE roomtype SET imageurl = $2 WHERE roomtypeid = $1 AND isdeleted = false RETURNING roomtypeid, imageurl", [id, imageurl])).rows[0],
  deleteType: async (id) => (await query("UPDATE roomtype SET isdeleted = true WHERE roomtypeid = $1 AND isdeleted = false RETURNING roomtypeid", [id])).rows[0],
  typeHasRooms: async (id) => (await query("SELECT 1 FROM room WHERE roomtypeid = $1 AND isdeleted = false LIMIT 1", [id])).rowCount > 0
};
