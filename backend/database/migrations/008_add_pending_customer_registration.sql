CREATE TABLE IF NOT EXISTS PendingCustomerRegistration (
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

CREATE INDEX IF NOT EXISTS idx_pending_customer_registration_expires
    ON PendingCustomerRegistration (ExpiresAt);
