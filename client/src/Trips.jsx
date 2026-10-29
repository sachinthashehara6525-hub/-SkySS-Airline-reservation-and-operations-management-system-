import { useState } from 'react';
import { api, fmt } from './api.js';

const STEPS = [['SCHEDULED', 'Booked'], ['BOARDING', 'Boarding'], ['DEPARTED', 'Departed'], ['ARRIVED', 'Arrived']];
const CITY = { CMB: 'Colombo', SIN: 'Singapore', DXB: 'Dubai' };

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
        <label>Email<input type="email" placeholder="Email used when booking" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label>Booking reference<input placeholder="For example 3FA9C2" value={ref} onChange={(e) => setRef(e.target.value)} /></label>
        <button className="go">Find my booking</button>
      </form>
      <p><small>Search with your email, your reference, or both. Cancelling needs the email.</small></p>
      {msg && <p className="err">{msg}</p>}
      {rows && !rows.length && <p>No booking found. Check the email and reference.</p>}
      {rows === null && !msg && (
        <>
          <h3 className="sect-t">What you can do here</h3>
          <div className="cols">
            {[['Check your flight status', 'See whether your flight is booked, boarding, departed or delayed.'],
              ['Find your gate', 'Your gate shows on the ticket as soon as operations assigns it.'],
              ['Cancel a booking', 'Cancel with the email you booked with, and the seat is released for other passengers.']].map(([t, d]) => (
              <div key={t} className="tip"><h4>{t}</h4><p>{d}</p></div>
            ))}
          </div>
          <h3 className="sect-t">Cannot find your booking?</h3>
          <p>Your reference is the 6 characters in the email titled Your SkySS booking. Check your spam folder if it is not in your inbox. You can also search with only your email to list all of your bookings.</p>
        </>
      )}
      {rows?.map((b) => {
        const live = b.status === 'CONFIRMED' && b.flight_status !== 'CANCELLED';
        const at = STEPS.findIndex(([s]) => s === (b.flight_status === 'DELAYED' ? 'SCHEDULED' : b.flight_status));
        return (
          <article key={b.ref} className="ticket">
            <div className="main">
              <small>{b.number} · {fmt(b.depart)} · {b.passenger}</small>
              <div className="route"><span>{CITY[b.origin] || b.origin}</span><span aria-hidden="true">→</span><span>{CITY[b.dest] || b.dest}</span></div>
              <small>Seat {b.seat} · Gate {b.gate || 'to be announced'}</small>
              {b.flight_status === 'DELAYED' && <p><span className="pill delayed">Flight delayed</span></p>}
              {b.flight_status === 'CANCELLED' && <p><span className="pill cancelled">Flight cancelled</span></p>}
              {live && (
                <ol className="steps">
                  {STEPS.map(([s, label], i) => <li key={s} className={i <= at ? 'done' : ''}>{label}</li>)}
                </ol>
              )}
            </div>
            <div className="stub">
              <span className="ref">{b.ref}</span>
              <span className={`pill ${b.status === 'CONFIRMED' ? 'scheduled' : 'cancelled'}`}>{b.status.toLowerCase()}</span>
              {b.status === 'CONFIRMED' && <button onClick={() => cancel(b.ref)}>Cancel booking</button>}
            </div>
          </article>
        );
      })}
    </>
  );
}
