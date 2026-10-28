# Backend folder skeleton (not implemented)
The user requested backend folders only. These directories are placeholders and intentionally contain no backend business logic or server implementation.

Suggested MVC/layered structure:
- `view/` — optional server-rendered views; for this React SPA, the actual UI is in `../src/views/`.
- `model/` — backend domain models/entities mapped from the ERD.
- `controller/` — request handlers / API controllers.
- `service/` — business rules for availability, booking lifecycle, payment, discount, reviews and hotel services.
- `repo/` — persistence interfaces and database access implementations.
- `routes/` — API route definitions.
- `middleware/` — authentication, role authorization and validation.
- `config/` — environment and database configuration.
- `database/` — migrations, seeds and schema notes.
No database, API, authentication, or payment gateway is configured in this starter.
