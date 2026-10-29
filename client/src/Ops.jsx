import { useState } from 'react';
import { api, fmt } from './api.js';

const STATUSES = ['SCHEDULED', 'BOARDING', 'DEPARTED', 'ARRIVED', 'DELAYED', 'CANCELLED'];

export default function Ops() {
  const [key, setKey] = useState('');
  const [data, setData] = useState(null);
  const [msg, setMsg] = useState('');
  const call = (path, opts) => api(path, { ...opts, opsKey: key });
  const load = async () => {
    try {
      const [flights, crew] = await Promise.all([call('/ops/flights'), call('/ops/crew')]);
      setData({ flights, crew }); setMsg('');
    } catch (e) { setMsg(e.message); }
  };
  const patch = (id, body) => call(`/ops/flights/${id}`, { method: 'PATCH', body }).then(load).catch((e) => setMsg(e.message));
  const addCrew = (id, crewId) => crewId && call(`/ops/flights/${id}/crew`, { method: 'POST', body: { crewId } }).then(load);

  if (!data) return (
    <form className="panel signin" onSubmit={(e) => { e.preventDefault(); load(); }}>
      <h3>Staff sign-in</h3>
      <p>Enter the operations key to open the flight board.</p>
      <div className="form">
        <input type="password" placeholder="Operations key" value={key} onChange={(e) => setKey(e.target.value)} />
        <button className="go">Open operations</button>
      </div>
      {msg && <p className="err">{msg}</p>}
    </form>
  );

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
