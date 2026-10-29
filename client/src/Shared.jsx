import { useState } from 'react';

// Airports offered in the dropdowns. Add a row here when you add a new route.
export const AIRPORTS = [['CMB', 'Colombo'], ['SIN', 'Singapore'], ['DXB', 'Dubai']];
const PLANE = 'M16 0 L-10 -10 L-5 0 L-10 10 Z';
const PALETTE = {
  singapore: ['#5aa2f0', '#dcebfb'], dubai: ['#8dbdf2', '#fbe3c8'], colombo: ['#4f93e8', '#e6f1fc'],
  book: ['#1565d8', '#bcd9f6'], manage: ['#0b2a5b', '#5aa2f0'], default: ['#5aa2f0', '#dcebfb'],
};

// Illustrated sky and skyline, used until a real photo is added.
function Scene({ name }) {
  const seed = [...name].reduce((n, c) => n + c.charCodeAt(0), 0);
  const [top, bottom] = PALETTE[name] || PALETTE.default;
  const towers = Array.from({ length: 14 }, (_, i) => ({ x: i * 30 - 10, h: 30 + ((seed * (i + 3) * 7) % 70), w: 22 + ((seed + i * 5) % 10) }));
  return (
    <svg viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs><linearGradient id={`sky-${name}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={top} /><stop offset="1" stopColor={bottom} /></linearGradient></defs>
      <rect width="400" height="200" fill={`url(#sky-${name})`} />
      <circle cx="320" cy="55" r="22" fill="#fff" opacity=".85" />
      <g transform="translate(110 55) rotate(-20) scale(1.6)"><path d={PLANE} fill="#fff" /></g>
      {towers.map((t, i) => <rect key={i} x={t.x} y={200 - t.h} width={t.w} height={t.h} fill="#0b2a5b" opacity=".28" />)}
    </svg>
  );
}

// Shows /images/<name>.jpg when the file exists, otherwise the illustration.
export function Photo({ name }) {
  const [ok, setOk] = useState(true);
  return (
    <div className="photo">
      {ok ? <img src={`/images/${name}.jpg`} alt="" loading="lazy" onError={() => setOk(false)} /> : <Scene name={name} />}
    </div>
  );
}

// Shows the photo only if the file exists, and nothing at all otherwise.
export function RealPhoto({ name }) {
  const [ok, setOk] = useState(true);
  return ok ? <div className="photo real"><img src={`/images/${name}.jpg`} alt="" onError={() => setOk(false)} /></div> : null;
}

export function AirportSelect({ label, value, onChange, exclude, anyLabel = 'Anywhere' }) {
  return (
    <label>
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{anyLabel}</option>
        {AIRPORTS.filter(([code]) => code !== exclude).map(([code, city]) => (
          <option key={code} value={code}>{city} ({code})</option>
        ))}
      </select>
    </label>
  );
}

export function PageHead({ title, sub, image }) {
  return (
    <section className="phead">
      <div className="wrap">
        <div><h2>{title}</h2><p>{sub}</p></div>
        {image && <div className="phoot"><Photo name={image} /></div>}
      </div>
    </section>
  );
}
