# ERD schema reference

The classes in `src/models/erd/` reflect the fields visible in the supplied ERD image. These are frontend JavaScript model classes only; they do not create database tables.

## Entities and fields

- **UserAccount**: `AccountID` (PK), `Username`, `PasswordHash`, `Role`, `IsActive`
- **Customer**: `CustomerID` (PK), `AccountID` (FK), `FullName`, `Email`, `Phone`
- **RoomType**: `RoomTypeID` (PK), `Name`, `Price`, `Capacity`, `Amenities`
- **Room**: `RoomID` (PK), `RoomTypeID` (FK), `RoomNumber`, `Status`, `IsDeleted`
- **Booking**: `BookingID` (PK), `CustomerID` (FK), `RoomID` (FK), `CodeID` (FK), `CheckinDate`, `CheckOutDate`, `Status`, `TotalAmount`
- **Payment**: `PaymentID` (PK), `BookingID` (FK), `Amount`, `PaymentMethod`, `Status`, `TransactionDate`
- **Review**: `ReviewID` (PK), `BookingID` (FK), `CustomerID` (FK), `Rating`, `Comment`, `CreatedAt`
- **DiscountCode**: `CodeID` (PK), `CodeString`, `DiscountValue`, `ValidFrom`, `ValidTo`, `UsageLimit`
- **HotelService**: `ServiceID` (PK), `Name`, `Description`, `Price`, `Conditions`, `IsDeleted`
- **ServiceBooking**: `ServiceBookingID` (PK), `BookingID` (FK), `ServiceID` (FK), `Quantity`, `TotalPrice`, `BookingDate`

## Relationships visible in the diagram

- `Customer.AccountID` references `UserAccount.AccountID`.
- `Booking.CustomerID` references `Customer.CustomerID`.
- `Booking.RoomID` references `Room.RoomID`.
- `Booking.CodeID` references `DiscountCode.CodeID`.
- `Room.RoomTypeID` references `RoomType.RoomTypeID`.
- `Payment.BookingID` references `Booking.BookingID`.
- `Review.BookingID` references `Booking.BookingID` and `Review.CustomerID` references `Customer.CustomerID`.
- `ServiceBooking.BookingID` references `Booking.BookingID` and `ServiceBooking.ServiceID` references `HotelService.ServiceID`.

The image does not specify all cardinality/constraint details clearly enough to infer cascade rules or nullability; those should be confirmed against the database definition.
