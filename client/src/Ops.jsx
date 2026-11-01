import { useEffect, useState } from 'react';
import { api, fmt } from './api.js';
import { AIRPORTS } from './Shared.jsx';

const STATUSES = ['SCHEDULED', 'BOARDING', 'DEPARTED', 'ARRIVED', 'DELAYED', 'CANCELLED'];

const EMPTY = { number: '', origin: '', dest: '', depart: '', arrive: '', price: '', aircraftId: '', gate: '' };

function AddFlight({ aircraft, onAdd }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState(EMPTY);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setErr(''); setOk('');
    if (f.origin === f.dest) return setErr('Origin and destination must be different.');
    if (new Date(f.arrive) <= new Date(f.depart)) return setErr('Arrival must be after departure.');
    try {
      await onAdd({
        number: f.number.trim().toUpperCase(), origin: f.origin, dest: f.dest,
        depart: new Date(f.depart).toISOString(), arrive: new Date(f.arrive).toISOString(),
        price: Number(f.price) || 0, aircraftId: Number(f.aircraftId), gate: f.gate.trim(),
      });
      setOk(`Flight ${f.number.trim().toUpperCase()} added. It now shows in the list below and in passenger search.`);
      setF(EMPTY);
    } catch (e2) { setErr(e2.message); }
  };

  return (
    <section className="panel addflight">
      <button type="button" className="go" onClick={() => setOpen(!open)}>{open ? 'Close form' : 'Add a flight'}</button>
      {open && (
        <form className="addform" onSubmit={submit}>
          <label>Flight number<input required placeholder="SS301" value={f.number} onChange={set('number')} /></label>
          <label>From<select required value={f.origin} onChange={set('origin')}><option value="">Select</option>
            {AIRPORTS.map(([c, n]) => <option key={c} value={c}>{n} ({c})</option>)}</select></label>
          <label>To<select required value={f.dest} onChange={set('dest')}><option value="">Select</option>
            {AIRPORTS.map(([c, n]) => <option key={c} value={c}>{n} ({c})</option>)}</select></label>
          <label>Departure<input required type="datetime-local" value={f.depart} onChange={set('depart')} /></label>
          <label>Arrival<input required type="datetime-local" value={f.arrive} onChange={set('arrive')} /></label>
          <label>Price (USD)<input type="number" min="0" step="1" placeholder="150" value={f.price} onChange={set('price')} /></label>
          <label>Aircraft<select required value={f.aircraftId} onChange={set('aircraftId')}><option value="">Select</option>
            {aircraft.map((a) => <option key={a.id} value={a.id}>{a.tail} ({a.model}, {a.rows * a.cols.length} seats)</option>)}</select></label>
          <label>Gate<input placeholder="B3" value={f.gate} onChange={set('gate')} /></label>
          <div className="addbtn"><button className="go">Save flight</button></div>
        </form>
      )}
      {ok && <p className="okmsg">{ok}</p>}
      {err && <p className="err">{err}</p>}
    </section>
  );
}

export default function Ops({ user, go }) {
  const [data, setData] = useState(null);
  const [msg, setMsg] = useState('');
  const call = (path, opts) => api(path, opts);
  const load = async () => {
    try {
      const [flights, crew, aircraft] = await Promise.all([call('/ops/flights'), call('/ops/crew'), call('/ops/aircraft')]);
      setData({ flights, crew, aircraft }); setMsg('');
    } catch (e) { setMsg(e.message); }
  };
  const patch = (id, body) => call(`/ops/flights/${id}`, { method: 'PATCH', body }).then(load).catch((e) => setMsg(e.message));
  const addCrew = (id, crewId) => crewId && call(`/ops/flights/${id}/crew`, { method: 'POST', body: { crewId } }).then(load);

  useEffect(() => { if (user?.role === 'staff') load(); }, [user?.role]);
  if (user?.role !== 'staff') return (
    <section className="panel signin">
      <h3>Staff only</h3>
      <p>{user ? 'Your account does not have operations access.' : 'Sign in with a staff account to open the flight board.'}</p>
      {!user && <button className="go" onClick={() => go('login')}>Sign in</button>}
    </section>
  );
  if (!data) return <p>{msg || 'Loading operations…'}</p>;

  const fl = data.flights;
  const count = (s) => fl.filter((f) => f.status === s).length;
  const sold = fl.reduce((n, f) => n + f.booked, 0);
  const cap = fl.reduce((n, f) => n + f.capacity, 0);
  return (
    <>
      {msg && <p className="err">{msg}</p>}
      <div className="stats">
        <div className="stat"><strong>{fl.length}</strong><span>Flights</span></div>
        <div className="stat warn"><strong>{count('DELAYED')}</strong><span>Delayed</span></div>
        <div className="stat bad"><strong>{count('CANCELLED')}</strong><span>Cancelled</span></div>
        <div className="stat"><strong>{sold}/{cap}</strong><span>Seats sold</span></div>
      </div>
      <AddFlight aircraft={data.aircraft} onAdd={(body) => call('/ops/flights', { method: 'POST', body }).then(load)} />
      {fl.map((f) => (
        <article key={f.id} className="flight ops">
          <div>
            <strong>{f.number}</strong> {f.origin} to {f.dest} <span className={`pill ${f.status.toLowerCase()}`}>{f.status.toLowerCase()}</span>
            <br /><small>{fmt(f.depart)} · {f.tail} ({f.model}) · {f.booked}/{f.capacity} seats sold</small>
            <progress className="occ" max={f.capacity} value={f.booked} aria-label={`${f.booked} of ${f.capacity} seats sold`} />
            <small>Crew: {f.crew || 'none assigned'}</small>
          </div>
          <label>Status
            <select value={f.status} onChange={(e) => patch(f.id, { status: e.target.value })}>
              {STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select></label>
          <label>Gate
            <input defaultValue={f.gate} onBlur={(e) => e.target.value !== f.gate && patch(f.id, { gate: e.target.value })} /></label>
          <label>Add crew
            <select value="" onChange={(e) => addCrew(f.id, e.target.value)}>
              <option value="">Select…</option>
              {data.crew.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.role})</option>)}
            </select></label>
        </article>
      ))}
    </>
  );
}
