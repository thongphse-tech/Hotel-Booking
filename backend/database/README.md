# Database Setup

PostgreSQL must be installed and running, with `psql` available.

On Windows with PostgreSQL 18, run `setup.bat` from this folder. It prompts for the `postgres` password, creates `hotel_booking`, and creates the tables without inserting sample data. The script stops if the database already exists. For an existing database, run unapplied migrations in order, including `migrations/002_add_room_floor.sql` and `migrations/003_add_booking_guest_details.sql`.

To apply the room-floor migration to an existing database, run `psql -d hotel_booking -f migrations/002_add_room_floor.sql` from this folder.

Apply `migrations/003_add_booking_guest_details.sql` to persist guest contact details and special requests for new bookings. Apply `migrations/005_add_discount_type.sql` to support percentage and fixed-amount discount codes, `migrations/006_add_review_title.sql` for review titles, and `migrations/007_add_service_operating_hours.sql` for service operating hours.

Apply `migrations/008_add_pending_customer_registration.sql` to an existing database to enable email OTP registration. This migration adds only the temporary pending-registration table; it does not alter existing customer or account records.

Apply `migrations/009_add_password_reset_otp.sql` to enable password reset by email OTP. This migration adds a separate OTP table and does not alter existing account or customer records.

Apply `migrations/010_add_discount_room_type.sql` to associate discount codes with a room type. Existing codes remain available for all room types; admins choose a room type or all room types when creating a code. During booking, customers see currently valid codes for the selected room type, and the API checks the same room-type rule when applying and creating the booking.

The database starts empty. Register a customer through the web UI. To grant that account administrator access, connect to `hotel_booking` with `psql` and run:

```sql
UPDATE UserAccount SET Role = 'admin' WHERE Username = 'your-email@example.com';
```

Sign out and sign in again to refresh the role in the API session.

The schema creates these tables: `UserAccount`, `Customer`, `RoomType`, `Room`, `DiscountCode`, `HotelService`, `Booking`, `Payment`, `RefundRequest`, `Review`, and `ServiceBooking`.

Role responsibilities are enforced in backend routes: customers operate on their own bookings; staff handle daily booking and stay operations; admins manage rooms, room types, service catalog, discounts, account activation, and refund completion. There is no implemented general Staff/Admin account-management API or configurable policy-management API in the current project.
