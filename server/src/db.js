import pg from 'pg';

const URL_ = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/skyss';
export const pool = new pg.Pool({ connectionString: URL_ });
export const q = (text, params) => pool.query(text, params).then((r) => r.rows);

// Creates the "skyss" database itself if it does not exist yet.
async function ensureDatabase() {
  const u = new URL(URL_);
  const name = u.pathname.slice(1);
  if (!/^\w+$/.test(name)) throw new Error('DATABASE_URL must end with a simple database name');
  u.pathname = '/postgres';
  const admin = new pg.Client({ connectionString: u.toString() });
  await admin.connect();
  const { rowCount } = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [name]);
  if (!rowCount) await admin.query(`CREATE DATABASE "${name}"`);
  await admin.end();
}

export async function init() {
  await ensureDatabase();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS aircraft (id SERIAL PRIMARY KEY, tail TEXT UNIQUE NOT NULL, model TEXT, seat_rows INT NOT NULL, seat_cols TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS crew (id SERIAL PRIMARY KEY, name TEXT NOT NULL, role TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS flights (
      id SERIAL PRIMARY KEY, number TEXT NOT NULL, origin TEXT NOT NULL, dest TEXT NOT NULL,
      depart TIMESTAMPTZ NOT NULL, arrive TIMESTAMPTZ NOT NULL, price DOUBLE PRECISION DEFAULT 0,
      aircraft_id INT NOT NULL REFERENCES aircraft(id), gate TEXT DEFAULT '', status TEXT NOT NULL DEFAULT 'SCHEDULED');
    CREATE TABLE IF NOT EXISTS flight_crew (
      flight_id INT REFERENCES flights(id) ON DELETE CASCADE, crew_id INT REFERENCES crew(id), PRIMARY KEY (flight_id, crew_id));
    CREATE TABLE IF NOT EXISTS bookings (
      ref TEXT PRIMARY KEY, flight_id INT NOT NULL REFERENCES flights(id), passenger TEXT NOT NULL, email TEXT NOT NULL,
      seat TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'CONFIRMED', created TIMESTAMPTZ DEFAULT now());
    CREATE UNIQUE INDEX IF NOT EXISTS one_seat ON bookings (flight_id, seat) WHERE status = 'CONFIRMED';
    CREATE INDEX IF NOT EXISTS bookings_email ON bookings (email);
  `);

  const [{ n }] = await q('SELECT COUNT(*)::int AS n FROM aircraft');
  if (n) return;
  await pool.query("INSERT INTO aircraft (tail, model, seat_rows, seat_cols) VALUES ('4R-SKA','A320',20,'ABCDEF'), ('4R-SKB','A321',28,'ABCDEF')");
  await pool.query("INSERT INTO crew (name, role) VALUES ('Nimal Perera','Captain'), ('Ayesha Khan','First Officer'), ('Dilini Silva','Cabin Lead'), ('Ravi Menon','Cabin Crew')");
  const routes = [['SS101', 'CMB', 'SIN', 4, 150], ['SS102', 'SIN', 'CMB', 4, 150], ['SS201', 'CMB', 'DXB', 5, 320], ['SS202', 'DXB', 'CMB', 5, 320]];
  for (let d = 1; d <= 7; d++) {
    for (const [i, [no, o, t, hrs, price]] of routes.entries()) {
      const dep = new Date(Date.now() + d * 864e5); dep.setUTCHours(2 + i * 4, 0, 0, 0);
      const arr = new Date(dep.getTime() + hrs * 36e5);
      await pool.query(
        'INSERT INTO flights (number, origin, dest, depart, arrive, price, aircraft_id, gate) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
        [no, o, t, dep.toISOString(), arr.toISOString(), price, (i % 2) + 1, 'A' + (i + 1)]);
    }
  }
}
