# -SkySS-Airline-reservation-and-operations-management-system-

SkySS is a full-stack web application for selling airline seats and running the flights behind them. Passengers search flights, choose a seat on a live seat map and manage their bookings. Operations staff track flight status, gates, crew and aircraft from one board.

## Features

**Passenger booking**
- Search flights by origin, destination and date
- Seat selection on a visual cabin map
- Booking confirmation with a reference code
- Look up and cancel a booking with email and reference
- Double booking is prevented by a database unique index

**Airline operations**
- Flight board with status updates (scheduled, boarding, delayed, departed, arrived, cancelled) and gate changes
- Crew assignment per flight
- Aircraft overlap check when scheduling flights
- Cancelling a flight cancels its bookings in a single transaction
- Operations endpoints protected by an `x-ops-key` header

## Tech stack

| Layer    | Technology                        |
| -------- | --------------------------------- |
| Frontend | React 18, Vite, plain CSS         |
| Backend  | Node.js, Express                  |
| Database | PostgreSQL (`pg`)                 |

## Getting started

Requirements: Node.js 18 or later and PostgreSQL 14 or later.

```bash
npm install
cp server/.env.example server/.env   # then set your PostgreSQL password
npm run dev
```

- Web app: http://localhost:5173
- API: http://localhost:3001

On first start the server creates the `skyss` database and tables and loads sample aircraft, crew and a week of flights.

## Project structure

```
client/src/       React views: Book, Trips, Ops
server/src/db.js  PostgreSQL connection, schema and seed data
server/src/index.js  REST API (booking and /api/ops routes)
```

## Roadmap

User accounts and roles, online payments, e-ticket emails, crew duty-time rules, a flight creation form in the UI and automated tests.
