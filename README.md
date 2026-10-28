# StayEase — Hotel Booking React Frontend

A React + Vite frontend prototype based on the use cases in the supplied Hotel Booking report (UC-01 to UC-25): authentication/profile, room catalog/search/availability, room and room-type administration, bookings/history/cancellation/payment status, check-in/check-out, customer management, discount codes, reviews and hotel services.

## Run locally
1. Install Node.js (LTS).
2. Open this project folder in a terminal.
3. Run `npm install`.
4. Run `npm run dev`.
5. Open the local URL printed by Vite.

## Important scope
- This is frontend-only. The UI uses mock data in `src/repo/mockData.js`.
- Booking creation, cancellation and payment-status changes are local demo interactions only; no real booking/payment is performed.
- Sign-in/register, full CRUD management screens, actual availability verification, check-in/check-out persistence and service booking need backend API integration.
- The backend directory contains only the requested folder skeleton.
- The ERD image supplied separately is represented by JavaScript model classes under `src/models/erd/`. See `ERD_SCHEMA.md` for the fields and relationships read from that image. The existing `src/models/` classes remain UI-friendly models used by the demo screens.

## Structure
```text
src/
  controllers/   # UI-facing controller functions
  models/        # UI-friendly models plus erd/ classes matching the supplied ERD
  repo/          # mock data and repository access
  services/      # validation and business-flow helpers
  views/         # React screens
  styles.css
ERD_SCHEMA.md  # fields and relationships from the supplied ERD image
backend/
  view/
  model/
  service/
  controller/
  repo/
  routes/
  middleware/
  config/
  database/
```

The `src/controllers`, `src/services`, and `src/repo` files are client-side demonstration layers for organizing frontend code; they are not secure server-side controllers or repositories.
