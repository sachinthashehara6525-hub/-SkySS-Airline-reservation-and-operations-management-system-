import crypto from 'node:crypto';
import { q } from './db.js';

const scrypt = (pw, salt) => new Promise((res, rej) => crypto.scrypt(pw, salt, 64, (e, k) => (e ? rej(e) : res(k))));
const sha = (t) => crypto.createHash('sha256').update(t).digest('hex');
const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role });
const bearer = (req) => (req.get('authorization') || '').replace(/^Bearer /, '');

export async function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  return salt.toString('hex') + ':' + (await scrypt(pw, salt)).toString('hex');
}
async function verifyPassword(pw, stored) {
  const [s, h] = stored.split(':');
  const k = await scrypt(pw, Buffer.from(s, 'hex'));
  const hb = Buffer.from(h, 'hex');
  return k.length === hb.length && crypto.timingSafeEqual(k, hb);
}
async function startSession(userId) {
  const token = crypto.randomBytes(32).toString('hex'); // only a hash of it is stored
  await q("INSERT INTO sessions (token_hash, user_id, expires) VALUES ($1, $2, now() + interval '7 days')", [sha(token), userId]);
  return token;
}

// Sets req.user when a valid session token is sent.
export async function attachUser(req, _res, next) {
  try {
    const t = bearer(req);
    if (t) {
      const [u] = await q('SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = $1 AND s.expires > now()', [sha(t)]);
      if (u) req.user = u;
    }
    next();
  } catch (e) { next(e); }
}
export const requireStaff = (req, res, next) =>
  req.user?.role === 'staff' ? next() : res.status(req.user ? 403 : 401).json({ error: 'Staff sign-in required' });

const tries = new Map();
const tooMany = (key) => {
  const now = Date.now();
  const recent = (tries.get(key) || []).filter((t) => now - t < 60000);
  recent.push(now); tries.set(key, recent);
  return recent.length > 8;
};

export function mountAuth(app, h, fail) {
  app.post('/api/auth/register', h(async (req, res) => {
    const { name = '', email = '', password = '' } = req.body;
    if (!name.trim() || !/^\S+@\S+\.\S+$/.test(email) || password.length < 8) return fail(res, 400, 'Enter your name, a valid email and a password of at least 8 characters');
    try {
      const [u] = await q('INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3) RETURNING *', [email.toLowerCase(), name.trim(), await hashPassword(password)]);
      res.status(201).json({ token: await startSession(u.id), user: publicUser(u) });
    } catch (e) {
      if (e.code === '23505') return fail(res, 409, 'An account with this email already exists');
      throw e;
    }
  }));
  app.post('/api/auth/login', h(async (req, res) => {
    const email = (req.body.email || '').toLowerCase();
    if (tooMany(email + req.ip)) return fail(res, 429, 'Too many attempts. Wait a minute and try again.');
    const [u] = await q('SELECT * FROM users WHERE email = $1', [email]);
    if (!u || !(await verifyPassword(req.body.password || '', u.password_hash))) return fail(res, 401, 'Wrong email or password');
    res.json({ token: await startSession(u.id), user: publicUser(u) });
  }));
  app.post('/api/auth/logout', h(async (req, res) => {
    if (bearer(req)) await q('DELETE FROM sessions WHERE token_hash = $1', [sha(bearer(req))]);
    res.json({ ok: true });
  }));
  app.get('/api/auth/me', (req, res) => (req.user ? res.json(publicUser(req.user)) : fail(res, 401, 'Not signed in')));
}

// Creates the first staff account. Set ADMIN_EMAIL and ADMIN_PASSWORD in .env, or a password is generated and printed once.
export async function seedAdmin() {
  const [{ n }] = await q("SELECT COUNT(*)::int AS n FROM users WHERE role = 'staff'");
  if (n) return;
  const email = (process.env.ADMIN_EMAIL || 'admin@skyss.local').toLowerCase();
  const password = process.env.ADMIN_PASSWORD || crypto.randomBytes(6).toString('hex');
  await q("INSERT INTO users (email, name, password_hash, role) VALUES ($1, 'Operations Admin', $2, 'staff') ON CONFLICT (email) DO UPDATE SET role = 'staff'", [email, await hashPassword(password)]);
  console.log(`Staff account created. Email: ${email}  Password: ${password}  (shown once, keep it safe)`);
}
