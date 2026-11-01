# SkySS: Airline Reservation and Operations Management System

SkySS is a full-stack web application for selling airline seats and managing the flights behind them. Passengers search for flights, choose an exact seat on a cabin map and receive a booking reference by email. Airline staff use a separate operations area to update flight status and gates, assign crew and add flights. Data is stored in PostgreSQL.

Built for the EC4307 Web Application Development mini project.

## Features

**Passengers**
- Search flights with From and To dropdowns and a date filter
- Live seat map; a seat can never be sold twice (enforced by a database index)
- Booking with a six-character reference and a confirmation email
- Accounts (email and password, optional Google sign-in) with a My flights page
- Manage booking: find a booking by email or reference and cancel it

**Staff (Operations)**
- Flight board with status labels, gate changes and crew assignment
- Add a flight form, with a check that an aircraft is not double-booked
- Summary cards for flights, delays, cancellations and seats sold
- Staff-only access through role-based accounts

## Technology

| Layer | Technology |
| --- | --- |
| Frontend | React 18, Vite, CSS |
| Backend | Node.js, Express 4 |
| Database | PostgreSQL (`pg`) |
| Email | Nodemailer with Gmail SMTP |
| Security | scrypt password hashing, random session tokens |

## Screenshots

| Home | Book a flight |
| --- | --- |
| ![Home page](docs/home.png) | ![Book a flight](docs/book.png) |

| Manage my booking | My flights |
| --- | --- |
| ![Manage my booking](docs/manage-booking.png) | ![My flights](docs/my-flights.png) |

![Operations control](docs/operations.png)

## Database design

![Entity relationship diagram](docs/erd.png)

Seven tables: `users`, `sessions`, `aircraft`, `crew`, `flights`, `flight_crew` and `bookings`. A partial unique index on `bookings (flight_id, seat)` where `status = 'CONFIRMED'` guarantees a seat is sold only once. Cancelling is a soft delete (status `CANCELLED`), so booking history is kept and the seat is released.

## Setup

Requirements: Node.js 18 or later, PostgreSQL 14 or later, Git.

```bash
git clone <repository-url>
cd <repository-folder>
npm install
```

Copy `server/.env.example` to `server/.env` and fill in the values:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection, for example `postgres://postgres:YOUR_PASSWORD@localhost:5432/skyss` |
| `GMAIL_USER`, `GMAIL_APP_PASSWORD` | Gmail address and a Google App Password for confirmation emails (optional) |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | First staff account. If the password is empty, one is generated and printed once in the terminal |
| `GOOGLE_CLIENT_ID` | Google sign-in client ID (optional) |
| `PORT` | API port, default 3001 |

Start the client and server together:

```bash
npm run dev
```

Open http://localhost:5173. On the first start the server creates the `skyss` database, all tables, sample aircraft, crew and a week of flights, and the staff account. Without Gmail settings, bookings still work and the email step is skipped.

## Project structure

```
client/src/   App, Home, Book, Trips, MyFlights, Ops, Auth, Shared, styles.css
server/src/   index.js (routes), db.js (schema and seed), auth.js, mailer.js
docs/         ERD and screenshots
```

## API summary

| Method and path | Access | Purpose |
| --- | --- | --- |
| `GET /api/flights` | Public | Search flights |
| `GET /api/flights/:id/seats` | Public | Seat layout and taken seats |
| `POST /api/bookings` | Public or user | Create a booking |
| `GET /api/bookings` | Email, reference or user | Find bookings |
| `DELETE /api/bookings/:ref` | Owner or matching email | Cancel a booking |
| `POST /api/auth/register`, `/login`, `/google` | Public | Create an account or sign in |
| `GET /api/ops/flights`, `POST /api/ops/flights` | Staff | List and add flights |
| `PATCH /api/ops/flights/:id` | Staff | Change status or gate |
| `POST /api/ops/flights/:id/crew` | Staff | Assign crew |

## Limitations

No payments, no editing of booking details after booking, no automated tests yet. Apple sign-in and deployment to a cloud host are future work.
