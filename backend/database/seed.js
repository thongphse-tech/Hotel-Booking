import pg from "pg";
import bcrypt from "bcryptjs";
import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: join(__dirname, '../.env') });

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function seed() {
  try {
    console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');
    console.log('Starting database seed...');

    // Insert Room Types
    console.log('Seeding room types...');
    const roomTypes = await pool.query(`
      INSERT INTO roomtype (name, price, capacity, amenities, description)
      VALUES
        ('Standard', 800000, 2, 'WiFi, TV, Air conditioning', 'Comfortable room with essential amenities'),
        ('Deluxe', 1200000, 3, 'WiFi, TV, Air conditioning, Mini bar, Balcony', 'Spacious room with premium amenities'),
        ('Suite', 2000000, 4, 'WiFi, TV, Air conditioning, Mini bar, Balcony, Living room, Bath tub', 'Luxury suite with separate living area')
      ON CONFLICT DO NOTHING
      RETURNING roomtypeid
    `);

    const roomTypeIds = roomTypes.rows.map(r => r.roomtypeid);

    // Insert Rooms
    console.log('Seeding rooms...');
    const rooms = await pool.query(`
      INSERT INTO room (roomtypeid, roomnumber, status)
      VALUES
        ($1, '101', 'available'),
        ($1, '102', 'available'),
        ($1, '103', 'available'),
        ($2, '201', 'available'),
        ($2, '202', 'available'),
        ($2, '203', 'available'),
        ($3, '301', 'available'),
        ($3, '302', 'available')
      ON CONFLICT (roomnumber) DO UPDATE SET isdeleted = false
      RETURNING roomid
    `, [roomTypeIds[0], roomTypeIds[1], roomTypeIds[2]]);

    // Insert Hotel Services
    console.log('Seeding hotel services...');
    await pool.query(`
      INSERT INTO hotelservice (name, description, price, conditions, category, capacity)
      VALUES
        ('Breakfast', 'Daily continental breakfast buffet', 150000, 'Available 6:00-10:00 AM', 'Food & Beverage', 50),
        ('Spa Treatment', 'Relaxing massage and therapy', 500000, 'Booking required 24h in advance', 'Wellness', 4),
        ('Airport Transfer', 'Round trip airport pickup and drop-off', 300000, '24 hours notice required', 'Transport', 4),
        ('Laundry Service', 'Daily laundry and dry cleaning', 100000, 'Same-day service available', 'Housekeeping', null),
        ('Room Service', '24/7 in-room dining', 0, 'Menu items charged separately', 'Food & Beverage', null)
      ON CONFLICT DO NOTHING
    `);

    // Insert Discount Codes
    console.log('Seeding discount codes...');
    await pool.query(`
      INSERT INTO discountcode (codestring, discountvalue, validfrom, validto, usagelimit, isactive)
      VALUES
        ('WELCOME10', 10, CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', 100, true),
        ('SUMMER20', 20, CURRENT_DATE, CURRENT_DATE + INTERVAL '60 days', 50, true),
        ('LOYALTY15', 15, CURRENT_DATE, CURRENT_DATE + INTERVAL '90 days', 200, true)
      ON CONFLICT (codestring) DO UPDATE SET isactive = true
    `);

    // Create Admin Account
    console.log('Creating admin account...');
    const adminEmail = 'admin@stayease.com';
    const adminPassword = await bcrypt.hash('Admin@123', 12);

    await pool.query(`
      INSERT INTO useraccount (username, passwordhash, role, isactive)
      VALUES ($1, $2, 'admin', true)
      ON CONFLICT (username) DO UPDATE SET passwordhash = $2, role = 'admin'
      RETURNING accountid
    `, [adminEmail, adminPassword]);

    const adminResult = await pool.query(`SELECT accountid FROM useraccount WHERE username = $1`, [adminEmail]);
    const adminId = adminResult.rows[0].accountid;

    await pool.query(`
      INSERT INTO customer (accountid, fullname, email, phone, address)
      VALUES ($1, 'System Administrator', $2, '0901234567', '123 Admin Street')
      ON CONFLICT (accountid) DO UPDATE SET fullname = 'System Administrator', email = $2
    `, [adminId, adminEmail]);

    console.log('✅ Database seed completed successfully!');
    console.log('\n=== Admin Account ===');
    console.log('Email:', adminEmail);
    console.log('Password: Admin@123');
    console.log('\nPlease change the password after first login!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
}

seed();
