# Database Setup Instructions

## Prerequisites
- PostgreSQL installed and running
- psql command-line tool available

## Steps to create the database

### 1. Create the database
```bash
# Connect to PostgreSQL
psql -U postgres

# Create the database
CREATE DATABASE hotel_booking;

# Exit psql
\q
```

### 2. Run the schema script
```bash
# Option 1: Using psql command
psql -U postgres -d hotel_booking -f schema.sql

# Option 2: Connect to database and run
psql -U postgres -d hotel_booking
\i schema.sql
```

### 3. Verify the database
```bash
psql -U postgres -d hotel_booking

# List all tables
\dt

# Check table structure
\d UserAccount
\d Customer
\d RoomType
\d Room
\d Booking
\d Payment
\d Review
\d DiscountCode
\d HotelService
\d ServiceBooking

# View sample data
SELECT * FROM UserAccount;
SELECT * FROM RoomType;
SELECT * FROM Room;
```

## Database Schema Overview

### Tables:
1. **UserAccount** - User authentication and role management
2. **Customer** - Customer profile information
3. **RoomType** - Room types with pricing and amenities
4. **Room** - Individual rooms with status
5. **DiscountCode** - Discount/coupon codes
6. **HotelService** - Additional hotel services
7. **Booking** - Room bookings
8. **Payment** - Payment transactions
9. **Review** - Customer reviews
10. **ServiceBooking** - Booked services for a booking

### Key Features:
- Foreign key constraints with appropriate cascade rules
- Check constraints for data validation
- Indexes for query optimization
- Auto-updating timestamps for Booking table
- Sample data for testing

## Sample Data Included:
- 2 user accounts (admin, staff)
- 2 customer profiles
- 4 room types
- 6 rooms
- 3 discount codes
- 4 hotel services

## Notes:
- The script drops existing tables before creating new ones (use with caution in production)
- Password hashes are placeholders - use bcrypt in your application
- Adjust connection parameters (-U postgres) based on your PostgreSQL setup
- Remove sample data INSERT statements for production deployment
