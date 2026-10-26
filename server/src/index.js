import 'dotenv/config'; // must stay first so DATABASE_URL is loaded before db.js
import express from 'express';
import cors from 'cors';
import crypto from 'node:crypto';
import { pool, q, init } from './db.js';
import { sendBookingEmail } from './mailer.js';

const app = express();
app.use(cors());
app.use(express.json());

const OPS_KEY = process.env.OPS_KEY || 'dev-ops-key'; // replace with real auth before production
const STATUSES = ['SCHEDULED', 'BOARDING', 'DEPARTED', 'ARRIVED', 'DELAYED', 'CANCELLED'];
const ops = (req, res, next) =>
  req.get('x-ops-key') === OPS_KEY ? next() : res.status(401).json({ error: 'Operations key required' });
const fail = (res, code, error) => res.status(code).json({ error });
const h = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next); // async errors -> handler below

const BOOKED = "(SELECT COUNT(*)::int FROM bookings b WHERE b.flight_id = f.id AND b.status = 'CONFIRMED')";

// ---------- Passenger booking ----------
app.get('/api/flights', h(async (req, res) => {
  const { from = '', to = '', date = '' } = req.query;
  res.json(await q(`
    SELECT f.*, a.seat_rows * length(a.seat_cols) AS capacity, ${BOOKED} AS booked
    FROM flights f JOIN aircraft a ON a.id = f.aircraft_id
    WHERE f.origin ILIKE $1 AND f.dest ILIKE $2 AND f.status <> 'CANCELLED'
      AND ($3::text = '' OR (f.depart AT TIME ZONE 'UTC')::date = $3::text::date)
    ORDER BY f.depart`, [from + '%', to + '%', date]));
}));

app.get('/api/flights/:id/seats', h(async (req, res) => {
  const [a] = await q('SELECT a.seat_rows, a.seat_cols FROM flights f JOIN aircraft a ON a.id = f.aircraft_id WHERE f.id = $1', [req.params.id]);
  if (!a) return fail(res, 404, 'Flight not found');
  const taken = (await q("SELECT seat FROM bookings WHERE flight_id = $1 AND status = 'CONFIRMED'", [req.params.id])).map((r) => r.seat);
  res.json({ rows: a.seat_rows, cols: a.seat_cols.split(''), taken });
}));

app.post('/api/bookings', h(async (req, res) => {
  const { flightId, passenger, email, seat } = req.body;
  if (!flightId || !passenger?.trim() || !/^\S+@\S+\.\S+$/.test(email || '') || !seat) return fail(res, 400, 'Flight, name, valid email and seat are required');
  const [f] = await q('SELECT f.status, a.seat_rows, a.seat_cols FROM flights f JOIN aircraft a ON a.id = f.aircraft_id WHERE f.id = $1', [flightId]);
  if (!f) return fail(res, 404, 'Flight not found');
  if (!['SCHEDULED', 'DELAYED'].includes(f.status)) return fail(res, 409, 'This flight is closed for booking');
  const m = /^(\d+)([A-Z])$/.exec(seat);
  if (!m || +m[1] < 1 || +m[1] > f.seat_rows || !f.seat_cols.includes(m[2])) return fail(res, 400, 'Seat does not exist on this aircraft');
  const ref = crypto.randomBytes(3).toString('hex').toUpperCase();
  try {
    await q('INSERT INTO bookings (ref, flight_id, passenger, email, seat) VALUES ($1,$2,$3,$4,$5)', [ref, flightId, passenger.trim(), email.toLowerCase(), seat]);
  } catch (e) {
    if (e.code === '23505') return fail(res, 409, `Seat ${seat} was just taken. Pick another seat.`);
    throw e;
  }
  const [fl] = await q('SELECT number, origin, dest, depart FROM flights WHERE id = $1', [flightId]);
  const emailSent = await sendBookingEmail(email.toLowerCase(), { ref, passenger: passenger.trim(), seat, ...fl });
  res.status(201).json({ ref, emailSent });
}));

app.get('/api/bookings', h(async (req, res) => {
  const email = (req.query.email || '').trim().toLowerCase();
  const ref = (req.query.ref || '').trim().toUpperCase();
  if (!email && !ref) return fail(res, 400, 'Enter your email or your booking reference');
  res.json(await q(`SELECT b.ref, b.passenger, b.seat, b.status, f.number, f.origin, f.dest, f.depart, f.gate, f.status AS flight_status
    FROM bookings b JOIN flights f ON f.id = b.flight_id
    WHERE ($1 = '' OR b.email = $1) AND ($2 = '' OR b.ref = $2) ORDER BY f.depart`, [email, ref]));
}));

app.delete('/api/bookings/:ref', h(async (req, res) => {
  const r = await pool.query("UPDATE bookings SET status = 'CANCELLED' WHERE ref = $1 AND email = $2 AND status = 'CONFIRMED'",
    [req.params.ref, (req.query.email || '').toLowerCase()]);
  r.rowCount ? res.json({ ok: true }) : fail(res, 404, 'No active booking matches that reference and email');
}));

// ---------- Operations ----------
app.get('/api/ops/flights', ops, h(async (_req, res) => {
  res.json(await q(`
    SELECT f.*, a.tail, a.model, ${BOOKED} AS booked, a.seat_rows * length(a.seat_cols) AS capacity,
      (SELECT string_agg(c.name, ', ') FROM flight_crew fc JOIN crew c ON c.id = fc.crew_id WHERE fc.flight_id = f.id) AS crew
    FROM flights f JOIN aircraft a ON a.id = f.aircraft_id ORDER BY f.depart`));
}));
app.get('/api/ops/aircraft', ops, h(async (_req, res) => res.json(await q('SELECT id, tail, model, seat_rows AS rows, seat_cols AS cols FROM aircraft'))));
app.get('/api/ops/crew', ops, h(async (_req, res) => res.json(await q('SELECT * FROM crew ORDER BY id'))));

app.post('/api/ops/flights', ops, h(async (req, res) => {
  const { number, origin, dest, depart, arrive, price, aircraftId, gate } = req.body;
  if (!number || !origin || !dest || !depart || !arrive || !aircraftId) return fail(res, 400, 'Missing flight details');
  if (new Date(arrive) <= new Date(depart)) return fail(res, 400, 'Arrival must be after departure');
  const clash = await q("SELECT 1 FROM flights WHERE aircraft_id = $1 AND status <> 'CANCELLED' AND depart < $3 AND arrive > $2", [aircraftId, depart, arrive]);
  if (clash.length) return fail(res, 409, 'That aircraft is already assigned to an overlapping flight');
  const [row] = await q('INSERT INTO flights (number, origin, dest, depart, arrive, price, aircraft_id, gate) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id',
    [number, origin.toUpperCase(), dest.toUpperCase(), depart, arrive, price || 0, aircraftId, gate || '']);
  res.status(201).json({ id: row.id });
}));

app.patch('/api/ops/flights/:id', ops, h(async (req, res) => {
  const { status, gate } = req.body;
  if (status && !STATUSES.includes(status)) return fail(res, 400, 'Unknown status');
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    await c.query('UPDATE flights SET status = COALESCE($1, status), gate = COALESCE($2, gate) WHERE id = $3', [status ?? null, gate ?? null, req.params.id]);
    if (status === 'CANCELLED') await c.query("UPDATE bookings SET status = 'CANCELLED' WHERE flight_id = $1", [req.params.id]);
    await c.query('COMMIT');
  } catch (e) { await c.query('ROLLBACK'); throw e; } finally { c.release(); }
  res.json({ ok: true });
}));

app.post('/api/ops/flights/:id/crew', ops, h(async (req, res) => {
  await q('INSERT INTO flight_crew (flight_id, crew_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [req.params.id, req.body.crewId]);
  res.json({ ok: true });
}));

app.use((err, _req, res, _next) => {
  if (['22P02', '22007', '22008'].includes(err.code)) return fail(res, 400, 'Invalid input');
  console.error(err);
  fail(res, 500, 'Something went wrong on our side');
});

try {
  await init();
  app.listen(process.env.PORT || 3001, () => console.log('SkySS API on :' + (process.env.PORT || 3001) + ' (PostgreSQL connected)'));
} catch (e) {
  console.error('Could not start. Check PostgreSQL is running and DATABASE_URL in server/.env is correct.\n', e.message);
  process.exit(1);
}
