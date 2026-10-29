import { useEffect, useRef, useState } from 'react';
import { api, fmt } from './api.js';
import { AirportSelect, Photo, RealPhoto } from './Shared.jsx';

const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const ARC = 'M10 170 C 150 -10, 380 -10, 560 120';
const PLANE = 'M16 0 L-10 -10 L-5 0 L-10 10 Z';
const LABEL = { SCHEDULED: 'On time', BOARDING: 'Boarding', DELAYED: 'Delayed', DEPARTED: 'Departed', ARRIVED: 'Arrived', CANCELLED: 'Cancelled' };
const ROUTES = [
  { from: 'CMB', to: 'SIN', name: 'Colombo to Singapore', info: 'About 4 hours · from $150', img: 'singapore' },
  { from: 'CMB', to: 'DXB', name: 'Colombo to Dubai', info: 'About 5 hours · from $320', img: 'dubai' },
  { from: 'SIN', to: 'CMB', name: 'Singapore to Colombo', info: 'About 4 hours · from $150', img: 'colombo' },
];

// Fades and lifts its content the first time it scrolls into view.
function Reveal({ children, delay = 0 }) {
  const ref = useRef(null);
  const [on, setOn] = useState(reduce);
  useEffect(() => {
    if (reduce || !ref.current) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setOn(true); io.disconnect(); } }, { threshold: 0.15 });
    io.observe(ref.current);
    return () => io.disconnect();
  }, []);
  return <div ref={ref} className={`reveal ${on ? 'in' : ''}`} style={{ transitionDelay: `${delay}ms` }}>{children}</div>;
}

export default function Home({ go }) {
  const [q, setQ] = useState({ from: '', to: '', date: '' });
  const [next, setNext] = useState(null);
  const photoRef = useRef(null);

  useEffect(() => { api('/flights').then((r) => setNext(r.slice(0, 4))).catch(() => setNext([])); }, []);

  // Parallax: the hero photo drifts slower than the page.
  useEffect(() => {
    if (reduce) return;
    let raf;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (photoRef.current) photoRef.current.style.transform = `translateY(${Math.min(window.scrollY, 600) * 0.15}px)`;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf); };
  }, []);

  return (
    <div className="home">
      <section className="hero">
        <div className="hero-in">
          <div>
            <h2>Where are you flying next?</h2>
            <p>Search flights between Colombo, Singapore and Dubai, then choose your own seat.</p>
            <p><button className="go" onClick={() => go('book')}>Search flights</button></p>
          </div>
          <div className="hero-art">
            <div ref={photoRef} className="parallax"><RealPhoto name="hero" /></div>
            <svg className="trail" viewBox="0 0 600 205" aria-hidden="true">
              <path d={ARC} fill="none" stroke="#fff" strokeWidth="2.5" strokeDasharray="3 9" strokeLinecap="round" />
              <circle cx="10" cy="170" r="6" fill="#fff" />
              <circle cx="560" cy="120" r="6" fill="#fff" />
              <text x="10" y="198" fill="#fff" fontSize="15" fontWeight="600">CMB</text>
              <text x="572" y="148" fill="#fff" fontSize="15" fontWeight="600" textAnchor="end">SIN</text>
              <g transform={reduce ? 'translate(560 120) rotate(36)' : undefined}>
                <path d={PLANE} fill="#fff" transform="scale(1.6)" />
                {!reduce && <animateMotion dur="7s" fill="freeze" rotate="auto" path={ARC} calcMode="spline" keyPoints="0;1" keyTimes="0;1" keySplines="0.3 0 0.2 1" />}
              </g>
            </svg>
          </div>
        </div>
      </section>

      <div className="wrap">
        <form className="hsearch" onSubmit={(e) => { e.preventDefault(); go('book', q); }}>
          <AirportSelect label="From" value={q.from} onChange={(from) => setQ({ ...q, from })} exclude={q.to} />
          <AirportSelect label="To" value={q.to} onChange={(to) => setQ({ ...q, to })} exclude={q.from} />
          <label>Date<input type="date" value={q.date} onChange={(e) => setQ({ ...q, date: e.target.value })} /></label>
          <button className="go">Search flights</button>
        </form>
      </div>

      <section className="wrap sect">
        <Reveal>
          <h3 className="sect-t">Happening now</h3>
          <div className="board">
            <div className="brow bhead"><span>Flight</span><span>Route</span><span>Departs</span><span>Gate</span><span>Status</span></div>
            {next === null && <div className="brow">Loading flights…</div>}
            {next?.length === 0 && <div className="brow">No upcoming flights yet.</div>}
            {next?.map((f) => (
              <div className="brow" key={f.id}>
                <strong>{f.number}</strong><span>{f.origin} to {f.dest}</span><span>{fmt(f.depart)}</span><span>{f.gate || '-'}</span>
                <span className={`pill ${f.status.toLowerCase()}`}>{LABEL[f.status] || f.status}</span>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      <section className="wrap sect">
        <Reveal><h3 className="sect-t">Popular routes</h3></Reveal>
        <div className="routes">
          {ROUTES.map((r, i) => (
            <Reveal key={r.name} delay={i * 120}>
              <article className="rcard">
                <Photo name={r.img} />
                <div className="info">
                  <h4>{r.name}</h4>
                  <p>{r.info}</p>
                  <button className="go" onClick={() => go('book', { from: r.from, to: r.to, date: '' })}>View flights</button>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="why">
        <div className="wrap">
          <Reveal><h3 className="sect-t">Why fly with SkySS</h3></Reveal>
          <div className="cols">
            {[['Choose your seat', 'See the cabin map and pick the exact seat. Taken seats are blocked instantly.'],
              ['Instant reference', 'Your booking reference arrives by email the moment you book.'],
              ['Live gate updates', 'Delays and gate changes show as soon as operations updates them.']].map(([t, d], i) => (
              <Reveal key={t} delay={i * 120}><h4>{t}</h4><p>{d}</p></Reveal>
            ))}
          </div>
        </div>
      </section>

      <footer className="foot"><div className="wrap">SkySS · Airline Reservation and Operations</div></footer>
    </div>
  );
}
