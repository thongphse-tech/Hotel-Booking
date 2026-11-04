@echo off
setlocal
cd /d "%~dp0"
set "PSQL_PATH=C:\Program Files\PostgreSQL\18\bin\psql.exe"

if not exist "%PSQL_PATH%" (
  echo PostgreSQL psql was not found at "%PSQL_PATH%".
  exit /b 1
)

echo Enter the PostgreSQL password for user postgres when prompted.
"%PSQL_PATH%" -W -h localhost -U postgres -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE hotel_booking;"
if errorlevel 1 (
  echo Database creation failed. Check the password or whether hotel_booking already exists.
  pause
  exit /b 1
)

"%PSQL_PATH%" -W -h localhost -U postgres -d hotel_booking -v ON_ERROR_STOP=1 -f schema.sql
if errorlevel 1 (
  echo Schema setup failed. Read the PostgreSQL error above.
  pause
  exit /b 1
)

echo Database hotel_booking and its tables were created.
pause
endlocal
