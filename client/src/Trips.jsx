import { useState } from 'react';
import { api, fmt } from './api.js';

export default function Trips() {
  const [email, setEmail] = useState('');
  const [rows, setRows] = useState(null);
  const [msg, setMsg] = useState('');
  const load = () => api('/bookings?email=' + encodeURIComponent(email)).then(setRows).catch((e) => setMsg(e.message));
  const cancel = async (ref) => {
    try { await api(`/bookings/${ref}?email=${encodeURIComponent(email)}`, { method: 'DELETE' }); load(); }
    catch (e) { setMsg(e.message); }
  };
  return (
    <>
      <form className="search" onSubmit={(e) => { e.preventDefault(); setMsg(''); load(); }}>
        <input type="email" placeholder="Email used when booking" value={email} onChange={(e) => setEmail(e.target.value)} />
        <button className="go">Find my bookings</button>
      </form>
      {msg && <p className="err">{msg}</p>}
      {rows && !rows.length && <p>No bookings found for this email.</p>}
      {rows?.map((b) => (
        <article key={b.ref} className="flight">
          <div><strong>{b.ref}</strong> {b.number}, {b.origin} to {b.dest}<br />
            <small>{fmt(b.depart)} · Seat {b.seat} · Gate {b.gate || 'to be announced'} · Flight {b.flight_status.toLowerCase()}</small></div>
          <div className="right">{b.status.toLowerCase()}</div>
          {b.status === 'CONFIRMED' && <button onClick={() => cancel(b.ref)}>Cancel booking</button>}
        </article>
      ))}
    </>
  );
}
