import { useState } from 'react';
import { api, fmt } from './api.js';

export default function Trips() {
  const [email, setEmail] = useState('');
  const [ref, setRef] = useState('');
  const [rows, setRows] = useState(null);
  const [msg, setMsg] = useState('');

  const load = () => {
    const p = new URLSearchParams();
    if (email.trim()) p.set('email', email.trim());
    if (ref.trim()) p.set('ref', ref.trim());
    return api('/bookings?' + p).then(setRows).catch((e) => { setRows(null); setMsg(e.message); });
  };
  const cancel = async (r) => {
    if (!email.trim()) return setMsg('Enter the email used for this booking to cancel it.');
    try {
      await api(`/bookings/${r}?email=${encodeURIComponent(email.trim())}`, { method: 'DELETE' });
      setMsg('');
      load();
    } catch (e) { setMsg(e.message); }
  };

  return (
    <>
      <form className="search" onSubmit={(e) => { e.preventDefault(); setMsg(''); load(); }}>
        <input type="email" placeholder="Email used when booking" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input placeholder="Booking reference (e.g. 3FA9C2)" value={ref} onChange={(e) => setRef(e.target.value)} />
        <button className="go">Find my booking</button>
      </form>
      <p><small>Search with your email, your reference, or both. Cancelling needs the email.</small></p>
      {msg && <p className="err">{msg}</p>}
      {rows && !rows.length && <p>No booking found. Check the email and reference.</p>}
      {rows?.map((b) => (
        <article key={b.ref} className="flight">
          <div><strong>{b.ref}</strong> {b.number}, {b.origin} to {b.dest}<br />
            <small>{b.passenger} · {fmt(b.depart)} · Seat {b.seat} · Gate {b.gate || 'to be announced'} · Flight {b.flight_status.toLowerCase()}</small></div>
          <div className="right">{b.status.toLowerCase()}</div>
          {b.status === 'CONFIRMED' && <button onClick={() => cancel(b.ref)}>Cancel booking</button>}
        </article>
      ))}
    </>
  );
}
