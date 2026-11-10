-- Hotel Booking Database Schema for PostgreSQL
-- Based on ERD_SCHEMA.md

-- Drop tables if they exist (clean slate)
DROP TABLE IF EXISTS ServiceBooking;
DROP TABLE IF EXISTS Review;
DROP TABLE IF EXISTS RefundRequest;
DROP TABLE IF EXISTS Payment;
DROP TABLE IF EXISTS Booking;
DROP TABLE IF EXISTS DiscountCode;
DROP TABLE IF EXISTS HotelService;
DROP TABLE IF EXISTS Room;
DROP TABLE IF EXISTS RoomType;
DROP TABLE IF EXISTS Customer;
DROP TABLE IF EXISTS PasswordResetOtp;
DROP TABLE IF EXISTS PendingCustomerRegistration;
DROP TABLE IF EXISTS UserAccount;

-- Create UserAccount table
CREATE TABLE UserAccount (
    AccountID SERIAL PRIMARY KEY,
    Username VARCHAR(50) UNIQUE NOT NULL,
    PasswordHash VARCHAR(255) NOT NULL,
    Role VARCHAR(20) NOT NULL CHECK (Role IN ('admin', 'staff', 'customer')),
    IsActive BOOLEAN DEFAULT true,
    FailedLoginAttempts INTEGER NOT NULL DEFAULT 0,
    LockedUntil TIMESTAMP,
    TokenVersion INTEGER NOT NULL DEFAULT 0,
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE PendingCustomerRegistration (
    Email VARCHAR(100) PRIMARY KEY,
    FullName VARCHAR(100) NOT NULL,
    Phone VARCHAR(20),
    PasswordHash VARCHAR(255) NOT NULL,
    OtpHash CHAR(64) NOT NULL,
    ExpiresAt TIMESTAMPTZ NOT NULL,
    Attempts INTEGER NOT NULL DEFAULT 0 CHECK (Attempts >= 0),
    LastSentAt TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CreatedAt TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_pending_customer_registration_expires
    ON PendingCustomerRegistration (ExpiresAt);

CREATE TABLE PasswordResetOtp (
    AccountID INTEGER PRIMARY KEY,
    Email VARCHAR(100) NOT NULL,
    OtpHash CHAR(64) NOT NULL,
    ExpiresAt TIMESTAMPTZ NOT NULL,
    Attempts INTEGER NOT NULL DEFAULT 0 CHECK (Attempts >= 0),
    LastSentAt TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    VerifiedAt TIMESTAMPTZ,
    ResetTokenID UUID,
    CreatedAt TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (AccountID) REFERENCES UserAccount(AccountID) ON DELETE CASCADE
);
CREATE INDEX idx_password_reset_otp_expires ON PasswordResetOtp (ExpiresAt);

-- Create Customer table
CREATE TABLE Customer (
    CustomerID SERIAL PRIMARY KEY,
    AccountID INTEGER UNIQUE NOT NULL,
    FullName VARCHAR(100) NOT NULL,
    Email VARCHAR(100) UNIQUE NOT NULL,
    Phone VARCHAR(20),
    Address VARCHAR(255),
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
    ImageURL VARCHAR(500),
    IsDeleted BOOLEAN DEFAULT false,
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Room table
CREATE TABLE Room (
    RoomID SERIAL PRIMARY KEY,
    RoomTypeID INTEGER NOT NULL,
    RoomNumber VARCHAR(20) UNIQUE NOT NULL,
    Floor INTEGER NOT NULL DEFAULT 1 CHECK (Floor >= 0),
    Status VARCHAR(20) NOT NULL CHECK (Status IN ('available', 'occupied', 'maintenance', 'cleaning')),
    IsDeleted BOOLEAN DEFAULT false,
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (RoomTypeID) REFERENCES RoomType(RoomTypeID) ON DELETE RESTRICT
);

-- Create DiscountCode table
CREATE TABLE DiscountCode (
    CodeID SERIAL PRIMARY KEY,
    CodeString VARCHAR(50) UNIQUE NOT NULL,
    RoomTypeID INTEGER REFERENCES RoomType(RoomTypeID) ON DELETE RESTRICT,
    DiscountType VARCHAR(20) NOT NULL DEFAULT 'percentage' CHECK (DiscountType IN ('percentage', 'fixed')),
    DiscountValue DECIMAL(12, 2) NOT NULL CHECK (DiscountValue >= 0),
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
    OperatingHours VARCHAR(120),
    Category VARCHAR(50) NOT NULL DEFAULT 'General',
    Capacity INTEGER CHECK (Capacity IS NULL OR Capacity > 0),
    IsDeleted BOOLEAN DEFAULT false,
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX unique_active_service_name_category ON HotelService (LOWER(Name), LOWER(Category)) WHERE IsDeleted = false;

-- Create Booking table
CREATE TABLE Booking (
    BookingID SERIAL PRIMARY KEY,
    CustomerID INTEGER NOT NULL,
    RoomID INTEGER NOT NULL,
    CodeID INTEGER,
    CheckinDate DATE NOT NULL,
    CheckOutDate DATE NOT NULL,
    GuestCount INTEGER NOT NULL DEFAULT 1 CHECK (GuestCount > 0),
    Status VARCHAR(20) NOT NULL CHECK (Status IN ('pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled')),
    TotalAmount DECIMAL(10, 2) NOT NULL CHECK (TotalAmount >= 0),
    GuestName VARCHAR(100),
    ContactPhone VARCHAR(20),
    SpecialRequests TEXT,
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
    Title VARCHAR(120),
    Comment TEXT,
    IsApproved BOOLEAN NOT NULL DEFAULT false,
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
    ServiceDate DATE,
    TimeSlot VARCHAR(50),
    SpecialNotes TEXT,
    Status VARCHAR(20) NOT NULL DEFAULT 'confirmed' CHECK (Status IN ('confirmed', 'cancelled', 'completed')),
    FOREIGN KEY (BookingID) REFERENCES Booking(BookingID) ON DELETE CASCADE,
    FOREIGN KEY (ServiceID) REFERENCES HotelService(ServiceID) ON DELETE RESTRICT
);

-- Create indexes for better query performance
CREATE INDEX idx_booking_customer ON Booking(CustomerID);
CREATE INDEX idx_booking_room ON Booking(RoomID);
CREATE INDEX idx_booking_status ON Booking(Status);
CREATE INDEX idx_booking_dates ON Booking(CheckinDate, CheckOutDate);
CREATE INDEX idx_payment_booking ON Payment(BookingID);

-- Create RefundRequest table for manually reviewed refunds after cancellation
CREATE TABLE RefundRequest (
    RefundRequestID SERIAL PRIMARY KEY,
    BookingID INTEGER NOT NULL UNIQUE,
    CustomerID INTEGER NOT NULL,
    Amount DECIMAL(10, 2) NOT NULL CHECK (Amount > 0),
    Status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (Status IN ('pending', 'refunded')),
    CreatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ProcessedAt TIMESTAMP,
    ProcessedBy INTEGER,
    FOREIGN KEY (BookingID) REFERENCES Booking(BookingID) ON DELETE RESTRICT,
    FOREIGN KEY (CustomerID) REFERENCES Customer(CustomerID) ON DELETE RESTRICT,
    FOREIGN KEY (ProcessedBy) REFERENCES UserAccount(AccountID) ON DELETE RESTRICT
);
CREATE INDEX idx_refund_request_status_created ON RefundRequest(Status, CreatedAt);

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
