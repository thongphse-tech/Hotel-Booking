-- Hotel Booking Database Schema for PostgreSQL
-- Based on ERD_SCHEMA.md

-- Drop tables if they exist (clean slate)
DROP TABLE IF EXISTS ServiceBooking;
DROP TABLE IF EXISTS Review;
DROP TABLE IF EXISTS Payment;
DROP TABLE IF EXISTS Booking;
DROP TABLE IF EXISTS DiscountCode;
DROP TABLE IF EXISTS HotelService;
DROP TABLE IF EXISTS Room;
DROP TABLE IF EXISTS RoomType;
DROP TABLE IF EXISTS Customer;
DROP TABLE IF EXISTS UserAccount;

-- Create UserAccount table
CREATE TABLE UserAccount (
    AccountID SERIAL PRIMARY KEY,
    Username VARCHAR(50) UNIQUE NOT NULL,
    PasswordHash VARCHAR(255) NOT NULL,
    Role VARCHAR(20) NOT NULL CHECK (Role IN ('admin', 'staff', 'customer')),
    IsActive BOOLEAN DEFAULT true,
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Customer table
CREATE TABLE Customer (
    CustomerID SERIAL PRIMARY KEY,
    AccountID INTEGER UNIQUE NOT NULL,
    FullName VARCHAR(100) NOT NULL,
    Email VARCHAR(100) UNIQUE NOT NULL,
    Phone VARCHAR(20),
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (AccountID) REFERENCES UserAccount(AccountID) ON DELETE CASCADE
);

-- Create RoomType table
CREATE TABLE RoomType (
    RoomTypeID SERIAL PRIMARY KEY,
    Name VARCHAR(100) NOT NULL,
    Price DECIMAL(10, 2) NOT NULL CHECK (Price >= 0),
    Capacity INTEGER NOT NULL CHECK (Capacity > 0),
    Amenities TEXT,
    Description TEXT,
    IsDeleted BOOLEAN DEFAULT false,
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Room table
CREATE TABLE Room (
    RoomID SERIAL PRIMARY KEY,
    RoomTypeID INTEGER NOT NULL,
    RoomNumber VARCHAR(20) UNIQUE NOT NULL,
    Status VARCHAR(20) NOT NULL CHECK (Status IN ('available', 'occupied', 'maintenance', 'cleaning')),
    IsDeleted BOOLEAN DEFAULT false,
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (RoomTypeID) REFERENCES RoomType(RoomTypeID) ON DELETE RESTRICT
);

-- Create DiscountCode table
CREATE TABLE DiscountCode (
    CodeID SERIAL PRIMARY KEY,
    CodeString VARCHAR(50) UNIQUE NOT NULL,
    DiscountValue DECIMAL(5, 2) NOT NULL CHECK (DiscountValue >= 0 AND DiscountValue <= 100),
    ValidFrom DATE NOT NULL,
    ValidTo DATE NOT NULL,
    UsageLimit INTEGER CHECK (UsageLimit > 0),
    UsedCount INTEGER DEFAULT 0,
    IsActive BOOLEAN DEFAULT true,
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (ValidTo >= ValidFrom)
);

-- Create HotelService table
CREATE TABLE HotelService (
    ServiceID SERIAL PRIMARY KEY,
    Name VARCHAR(100) NOT NULL,
    Description TEXT,
    Price DECIMAL(10, 2) NOT NULL CHECK (Price >= 0),
    Conditions TEXT,
    IsDeleted BOOLEAN DEFAULT false,
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Booking table
CREATE TABLE Booking (
    BookingID SERIAL PRIMARY KEY,
    CustomerID INTEGER NOT NULL,
    RoomID INTEGER NOT NULL,
    CodeID INTEGER,
    CheckinDate DATE NOT NULL,
    CheckOutDate DATE NOT NULL,
    Status VARCHAR(20) NOT NULL CHECK (Status IN ('pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled')),
    TotalAmount DECIMAL(10, 2) NOT NULL CHECK (TotalAmount >= 0),
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (CustomerID) REFERENCES Customer(CustomerID) ON DELETE RESTRICT,
    FOREIGN KEY (RoomID) REFERENCES Room(RoomID) ON DELETE RESTRICT,
    FOREIGN KEY (CodeID) REFERENCES DiscountCode(CodeID) ON DELETE SET NULL,
    CHECK (CheckOutDate > CheckinDate)
);

-- Create Payment table
CREATE TABLE Payment (
    PaymentID SERIAL PRIMARY KEY,
    BookingID INTEGER NOT NULL,
    Amount DECIMAL(10, 2) NOT NULL CHECK (Amount >= 0),
    PaymentMethod VARCHAR(50) NOT NULL CHECK (PaymentMethod IN ('credit_card', 'debit_card', 'cash', 'bank_transfer', 'paypal')),
    Status VARCHAR(20) NOT NULL CHECK (Status IN ('pending', 'completed', 'failed', 'refunded')),
    TransactionDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    TransactionRef VARCHAR(100),
    FOREIGN KEY (BookingID) REFERENCES Booking(BookingID) ON DELETE CASCADE
);

-- Create Review table
CREATE TABLE Review (
    ReviewID SERIAL PRIMARY KEY,
    BookingID INTEGER NOT NULL,
    CustomerID INTEGER NOT NULL,
    Rating INTEGER NOT NULL CHECK (Rating >= 1 AND Rating <= 5),
    Comment TEXT,
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (BookingID) REFERENCES Booking(BookingID) ON DELETE CASCADE,
    FOREIGN KEY (CustomerID) REFERENCES Customer(CustomerID) ON DELETE CASCADE,
    UNIQUE (BookingID, CustomerID)
);

-- Create ServiceBooking table
CREATE TABLE ServiceBooking (
    ServiceBookingID SERIAL PRIMARY KEY,
    BookingID INTEGER NOT NULL,
    ServiceID INTEGER NOT NULL,
    Quantity INTEGER NOT NULL CHECK (Quantity > 0),
    TotalPrice DECIMAL(10, 2) NOT NULL CHECK (TotalPrice >= 0),
    BookingDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (BookingID) REFERENCES Booking(BookingID) ON DELETE CASCADE,
    FOREIGN KEY (ServiceID) REFERENCES HotelService(ServiceID) ON DELETE RESTRICT
);

-- Create indexes for better query performance
CREATE INDEX idx_booking_customer ON Booking(CustomerID);
CREATE INDEX idx_booking_room ON Booking(RoomID);
CREATE INDEX idx_booking_status ON Booking(Status);
CREATE INDEX idx_booking_dates ON Booking(CheckinDate, CheckOutDate);
CREATE INDEX idx_payment_booking ON Payment(BookingID);
CREATE INDEX idx_review_customer ON Review(CustomerID);
CREATE INDEX idx_review_booking ON Review(BookingID);
CREATE INDEX idx_servicebooking_booking ON ServiceBooking(BookingID);
CREATE INDEX idx_room_type ON Room(RoomTypeID);
CREATE INDEX idx_room_status ON Room(Status);
CREATE INDEX idx_customer_account ON Customer(AccountID);
CREATE INDEX idx_discountcode_active ON DiscountCode(IsActive, ValidFrom, ValidTo);

-- Create function to automatically update UpdatedAt timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.UpdatedAt = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for Booking table
CREATE TRIGGER update_booking_updated_at
    BEFORE UPDATE ON Booking
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Sample data (optional - remove in production)
INSERT INTO UserAccount (Username, PasswordHash, Role, IsActive) VALUES
('admin', '$2b$10$placeholder_hash_for_admin', 'admin', true),
('staff1', '$2b$10$placeholder_hash_for_staff', 'staff', true);

INSERT INTO Customer (AccountID, FullName, Email, Phone) VALUES
(1, 'Admin User', 'admin@hotelease.com', '0123456789'),
(2, 'Staff User', 'staff@hotelease.com', '0987654321');

INSERT INTO RoomType (Name, Price, Capacity, Amenities, Description) VALUES
('Standard Room', 100.00, 2, 'WiFi, TV, AC', 'Comfortable standard room'),
('Deluxe Room', 150.00, 2, 'WiFi, TV, AC, Mini-bar, Balcony', 'Spacious deluxe room with balcony'),
('Suite', 250.00, 4, 'WiFi, TV, AC, Mini-bar, Balcony, Living Room, Kitchen', 'Luxury suite with separate living area'),
('Family Room', 200.00, 4, 'WiFi, TV, AC, Mini-bar, 2 Bedrooms', 'Perfect for families');

INSERT INTO Room (RoomTypeID, RoomNumber, Status) VALUES
(1, '101', 'available'),
(1, '102', 'available'),
(2, '201', 'available'),
(2, '202', 'available'),
(3, '301', 'available'),
(4, '401', 'available');

INSERT INTO DiscountCode (CodeString, DiscountValue, ValidFrom, ValidTo, UsageLimit) VALUES
('WELCOME10', 10.00, '2024-01-01', '2024-12-31', 100),
('SUMMER20', 20.00, '2024-06-01', '2024-08-31', 50),
('LOYALTY15', 15.00, '2024-01-01', '2024-12-31', 200);

INSERT INTO HotelService (Name, Description, Price, Conditions) VALUES
('Breakfast', 'Continental breakfast buffet', 15.00, '7:00 AM - 10:00 AM'),
('Airport Transfer', 'Pick-up and drop-off service', 30.00, '24 hours advance booking required'),
('Spa Treatment', 'Full body massage', 80.00, 'By appointment'),
('Laundry Service', 'Daily laundry service', 20.00, 'Same-day service for requests before 10 AM');
