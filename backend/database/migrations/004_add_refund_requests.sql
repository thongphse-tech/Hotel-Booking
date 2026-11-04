CREATE TABLE IF NOT EXISTS RefundRequest (
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

CREATE INDEX IF NOT EXISTS idx_refund_request_status_created
    ON RefundRequest(Status, CreatedAt);
