import { useEffect, useState } from 'react';
import { api, fmt } from './api.js';
import { AirportSelect, Photo } from './Shared.jsx';

function SeatPicker({ flight, onDone }) {
  const [map, setMap] = useState(null);
  const [seat, setSeat] = useState('');
  const [form, setForm] = useState({ passenger: '', email: '' });
  const [msg, setMsg] = useState('');
  if (!map) api(`/flights/${flight.id}/seats`).then(setMap);

  const book = async () => {
    try {
      const res = await api('/bookings', { method: 'POST', body: { flightId: flight.id, seat, ...form } });
      onDone({ ...res, email: form.email });
    } catch (e) {
      setMsg(e.message);
      api(`/flights/${flight.id}/seats`).then(setMap);
      setSeat('');
    }
  };
  if (!map) return <p>Loading seat map…</p>;
  return (
    <section className="panel">
      <h3>Choose a seat on {flight.number}</h3>
      <div className="seats">
        {Array.from({ length: map.rows }, (_, r) => (
          <div key={r} className="row">
            <span className="rn">{r + 1}</span>
            {map.cols.map((c, i) => {
              const id = `${r + 1}${c}`;
              return (
                <span key={id} style={{ display: 'contents' }}>
                  {i === map.cols.length / 2 && <span className="aisle" />}
                  <button className={`seat ${map.taken.includes(id) ? 'taken' : ''} ${seat === id ? 'pick' : ''}`}
                    disabled={map.taken.includes(id)} onClick={() => setSeat(id)} aria-label={`Seat ${id}`}>{c}</button>
                </span>
              );
            })}
          </div>
        ))}
      </div>
      <div className="form">
        <input placeholder="Passenger name" value={form.passenger} onChange={(e) => setForm({ ...form, passenger: e.target.value })} />
        <input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <button className="go" disabled={!seat} onClick={book}>{seat ? `Book seat ${seat}` : 'Pick a seat to continue'}</button>
      </div>
      {msg && <p className="err">{msg}</p>}
    </section>
  );
}

const DEST = [['CMB', 'SIN', 'Singapore', 'singapore', 'from $150'], ['CMB', 'DXB', 'Dubai', 'dubai', 'from $320'], ['SIN', 'CMB', 'Colombo', 'colombo', 'from $150']];
const HOW = [['1. Search', 'Choose where you are flying from and to, and the date if you know it.'],
  ['2. Pick your seat', 'Open a flight and choose your exact seat on the cabin map.'],
  ['3. Get your reference', 'Enter your name and email. Your reference is shown right away and emailed to you.']];

function Intro({ onPick }) {
  return (
    <>
      <h3 className="sect-t">Where to next?</h3>
      <div className="routes">
        {DEST.map(([from, to, city, img, price]) => (
          <article key={from + to} className="rcard">
            <Photo name={img} />
            <div className="info"><h4>{city}</h4><p>{price}</p><button className="go" onClick={() => onPick(from, to)}>See flights</button></div>
          </article>
        ))}
      </div>
      <h3 className="sect-t">How booking works</h3>
      <div className="cols">{HOW.map(([t, d]) => <div key={t} className="tip"><h4>{t}</h4><p>{d}</p></div>)}</div>
    </>
  );
}

export default function Book({ initial }) {
  const [q, setQ] = useState(initial || { from: '', to: '', date: '' });
  const [flights, setFlights] = useState(null);
  const [chosen, setChosen] = useState(null);
  const [ref, setRef] = useState('');

  const search = async (e) => {
    e?.preventDefault();
    setChosen(null); setRef('');
    setFlights(await api('/flights?' + new URLSearchParams(q)));
  };
  useEffect(() => { if (initial) search(); }, []); // run the search passed in from the home page
  const quick = async (from, to) => { const nq = { from, to, date: '' }; setQ(nq); setChosen(null); setRef(''); setFlights(await api('/flights?' + new URLSearchParams(nq))); };
  if (ref) return <section className="panel ok"><h2>Booking confirmed</h2><p>Your reference is <strong>{ref.ref}</strong>.</p><p>{ref.emailSent ? `We sent the confirmation to ${ref.email}. Check your inbox and spam folder.` : 'The confirmation email could not be sent, so please note your reference.'}</p></section>;
  return (
    <>
      <form className="search" onSubmit={search}>
        <AirportSelect label="From" value={q.from} onChange={(from) => setQ({ ...q, from })} exclude={q.to} />
        <AirportSelect label="To" value={q.to} onChange={(to) => setQ({ ...q, to })} exclude={q.from} />
        <label>Date<input type="date" value={q.date} onChange={(e) => setQ({ ...q, date: e.target.value })} /></label>
        <button className="go">Search flights</button>
      </form>
      {flights === null && <Intro onPick={quick} />}
      {flights && !flights.length && <p>No flights match. Try clearing a field.</p>}
      {flights?.map((f) => (
        <article key={f.id} className="flight">
          <div><strong>{f.number}</strong> {f.origin} to {f.dest}<br /><small>{fmt(f.depart)} – {fmt(f.arrive)}</small></div>
          <div className="right">${f.price}<br /><small>{f.capacity - f.booked} seats left</small></div>
          <button onClick={() => setChosen(f)} disabled={f.booked >= f.capacity}>Select</button>
        </article>
      ))}
      {chosen && <SeatPicker flight={chosen} onDone={setRef} />}
    </>
  );
}
