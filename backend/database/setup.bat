@echo off
REM Database Setup Script for Hotel Booking
REM Make sure PostgreSQL is installed and running

set PGPASSWORD=your_password_here
set PSQL_PATH="C:\Program Files\PostgreSQL\18\bin\psql.exe"

echo Creating database hotel_booking...
%PSQL_PATH% -U postgres -c "CREATE DATABASE hotel_booking;"

echo Running schema.sql...
%PSQL_PATH% -U postgres -d hotel_booking -f schema.sql

echo.
echo Database setup completed!
echo.
echo To verify, run:
echo %PSQL_PATH% -U postgres -d hotel_booking -c "\dt"

pause
