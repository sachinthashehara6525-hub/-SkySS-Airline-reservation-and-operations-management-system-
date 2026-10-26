import { useState } from 'react';
import { api, fmt } from './api.js';

function SeatPicker({ flight, onDone }) {
  const [map, setMap] = useState(null);
  const [seat, setSeat] = useState('');
  const [form, setForm] = useState({ passenger: '', email: '' });
  const [msg, setMsg] = useState('');
  if (!map) api(`/flights/${flight.id}/seats`).then(setMap);

  const book = async () => {
    try {
      const { ref } = await api('/bookings', { method: 'POST', body: { flightId: flight.id, seat, ...form } });
      onDone(ref);
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

export default function Book() {
  const [q, setQ] = useState({ from: '', to: '', date: '' });
  const [flights, setFlights] = useState(null);
  const [chosen, setChosen] = useState(null);
  const [ref, setRef] = useState('');

  const search = async (e) => {
    e.preventDefault();
    setChosen(null); setRef('');
    setFlights(await api('/flights?' + new URLSearchParams(q)));
  };
  if (ref) return <section className="panel ok"><h2>Booking confirmed</h2><p>Your reference is <strong>{ref}</strong>. Use it with your email to manage the booking.</p></section>;
  return (
    <>
      <form className="search" onSubmit={search}>
        <input placeholder="From (e.g. CMB)" value={q.from} onChange={(e) => setQ({ ...q, from: e.target.value })} />
        <input placeholder="To (e.g. SIN)" value={q.to} onChange={(e) => setQ({ ...q, to: e.target.value })} />
        <input type="date" value={q.date} onChange={(e) => setQ({ ...q, date: e.target.value })} />
        <button className="go">Search flights</button>
      </form>
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
