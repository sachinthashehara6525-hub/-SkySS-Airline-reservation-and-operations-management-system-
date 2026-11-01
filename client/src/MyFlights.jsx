import { useEffect, useState } from 'react';
import { api } from './api.js';
import { Ticket } from './Trips.jsx';

export default function MyFlights({ user, go }) {
  const [rows, setRows] = useState(null);
  const [msg, setMsg] = useState('');
  const load = () => api('/bookings').then(setRows).catch((e) => setMsg(e.message));
  useEffect(() => { if (user) load(); }, [user]);
  const cancel = async (ref) => {
    try { await api(`/bookings/${ref}`, { method: 'DELETE' }); setMsg(''); load(); }
    catch (e) { setMsg(e.message); }
  };

  if (!user) return (
    <section className="panel signin">
      <h3>Sign in to see your flights</h3>
      <p>Your booked flights are saved to your account.</p>
      <button className="go" onClick={() => go('login')}>Sign in</button>
    </section>
  );

  const now = Date.now();
  const upcoming = (rows || []).filter((b) => b.status === 'CONFIRMED' && b.flight_status !== 'CANCELLED' && new Date(b.depart) >= now);
  const earlier = (rows || []).filter((b) => !upcoming.includes(b)).reverse();
  return (
    <>
      {msg && <p className="err">{msg}</p>}
      {rows === null && !msg && <p>Loading your flights…</p>}
      {rows && !rows.length && (
        <section className="panel">
          <h3>No flights yet</h3>
          <p>When you book a flight, it appears here.</p>
          <button className="go" onClick={() => go('book')}>Book a flight</button>
        </section>
      )}
      {upcoming.length > 0 && <><h3 className="sect-t">Upcoming flights</h3>{upcoming.map((b) => <Ticket key={b.ref} b={b} onCancel={cancel} />)}</>}
      {earlier.length > 0 && <><h3 className="sect-t">Past and cancelled</h3>{earlier.map((b) => <Ticket key={b.ref} b={b} />)}</>}
    </>
  );
}
