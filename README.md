# SkySS: Airline Reservation & Operations Management

Node.js (Express + SQLite) API and a React (Vite) client in one npm workspace.

## Run
```
npm install
npm run dev
```
Client: http://localhost:5173 · API: http://localhost:3001. The database file `skyss.db` is created and seeded
with aircraft, crew and a week of CMB/SIN/DXB flights on first start. Needs Node 18+.

## What is included
- **Booking:** flight search, live seat map, booking with reference code, look-up and cancel by email.
  Double booking is blocked by a database unique index, not just a UI check.
- **Operations:** flight status board (scheduled, boarding, delayed, cancelled and so on), gate changes,
  crew assignment, aircraft overlap check when adding flights. Cancelling a flight cancels its bookings.
  Ops endpoints need the `x-ops-key` header (default `dev-ops-key`, set `OPS_KEY` to change it).

## Next steps
Real authentication and roles, payments, e-ticket email, crew duty-time rules, flight creation form in the UI,
tests, and a move from SQLite to PostgreSQL for multi-instance deployment.

## Layout
```
server/src/db.js      schema + seed data
server/src/index.js   REST routes (booking and /api/ops)
client/src/           Book, Trips, Ops views
```
