-- Test data for review functionality
-- This script creates a customer, room, and bookings for testing reviews
-- Password for testreview user is: password123

-- Step 1: Create test user account (if not exists)
-- Password hash for 'password123'
INSERT INTO UserAccount (Username, PasswordHash, Role, IsActive)
VALUES ('testreview', '$2b$10$rOZzQz5QZz5QZz5QZz5QZuY7QZz5QZz5QZz5QZz5QZz5QZz5QZz5Q', 'customer', true)
ON CONFLICT (Username) DO NOTHING;

-- Step 2: Create test customer (if not exists)
INSERT INTO Customer (AccountID, FullName, Email, Phone)
SELECT AccountID, 'Test Review User', 'testreview@example.com', '0901234567'
FROM UserAccount WHERE Username = 'testreview'
ON CONFLICT (Email) DO NOTHING;

-- Step 3: Get or create a room type and room
-- First, get an existing room type
DO $$
DECLARE
    v_roomtypeid INTEGER;
    v_roomid INTEGER;
    v_customerid INTEGER;
BEGIN
    -- Get an existing room type
    SELECT RoomTypeID INTO v_roomtypeid FROM RoomType LIMIT 1;

    -- If no room type exists, create one
    IF v_roomtypeid IS NULL THEN
        INSERT INTO RoomType (Name, Price, Capacity, Amenities, Description)
        VALUES ('Deluxe Room', 1500000, 2, 'WiFi, AC, TV, Mini Bar', 'Comfortable deluxe room with modern amenities')
        RETURNING RoomTypeID INTO v_roomtypeid;
    END IF;

    -- Get an existing room
    SELECT RoomID INTO v_roomid FROM Room WHERE RoomTypeID = v_roomtypeid LIMIT 1;

    -- If no room exists, create one
    IF v_roomid IS NULL THEN
        INSERT INTO Room (RoomNumber, RoomTypeID, Status, IsDeleted)
        VALUES ('101', v_roomtypeid, 'available', false)
        RETURNING RoomID INTO v_roomid;
    END IF;

    -- Get the customer ID
    SELECT CustomerID INTO v_customerid FROM Customer WHERE Email = 'testreview@example.com';

    -- Create a checked_in booking for this customer (can check out early)
    INSERT INTO Booking (CustomerID, RoomID, CheckinDate, CheckOutDate, GuestCount, Status, TotalAmount, GuestName, ContactPhone)
    VALUES (
        v_customerid,
        v_roomid,
        CURRENT_DATE - INTERVAL '2 days',
        CURRENT_DATE + INTERVAL '3 days',
        2,
        'checked_in',
        3000000,
        'Test Review User',
        '0901234567'
    )
    ON CONFLICT DO NOTHING;

    -- Create a payment for this booking (required for checkout)
    INSERT INTO Payment (BookingID, Amount, PaymentMethod, Status, TransactionRef)
    SELECT b.BookingID, b.TotalAmount, 'cash', 'completed', 'TEST-' || b.BookingID
    FROM Booking b
    WHERE b.CustomerID = v_customerid AND b.Status = 'checked_in'
    AND NOT EXISTS (SELECT 1 FROM Payment p WHERE p.BookingID = b.BookingID);

    RAISE NOTICE 'Test review data created successfully. Customer: testreview / password123';
END $$;

-- Verify the data
SELECT
    b.BookingID,
    c.FullName,
    c.Email,
    r.RoomNumber,
    rt.Name AS RoomType,
    b.CheckinDate,
    b.CheckOutDate,
    b.Status,
    b.TotalAmount,
    p.Status AS PaymentStatus,
    p.Amount AS PaidAmount
FROM Booking b
JOIN Customer c ON c.CustomerID = b.CustomerID
JOIN Room r ON r.RoomID = b.RoomID
JOIN RoomType rt ON rt.RoomTypeID = r.RoomTypeID
LEFT JOIN Payment p ON p.BookingID = b.BookingID
WHERE c.Email = 'testreview@example.com';
