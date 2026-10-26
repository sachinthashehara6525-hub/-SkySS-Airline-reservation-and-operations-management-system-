import { useState } from 'react';
import Book from './Book.jsx';
import Trips from './Trips.jsx';
import Ops from './Ops.jsx';

const TABS = { book: ['Book a flight', Book], trips: ['Manage my booking', Trips], ops: ['Operations', Ops] };
const ARC = 'M10 170 C 150 -10, 380 -10, 560 120';
const PLANE = 'M16 0 L-10 -10 L-5 0 L-10 10 Z';
const reduceMotion = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

function Hero() {
  return (
    <section className="hero">
      <div className="hero-in">
        <div>
          <h2>Where are you flying next?</h2>
          <p>Search flights between Colombo, Singapore and Dubai, then choose your own seat.</p>
        </div>
        <svg className="trail" viewBox="0 0 600 205" aria-hidden="true">
          <path d={ARC} fill="none" stroke="rgba(255,255,255,.75)" strokeWidth="2" strokeDasharray="3 9" strokeLinecap="round" />
          <circle cx="10" cy="170" r="6" fill="#fff" />
          <circle cx="560" cy="120" r="6" fill="#fff" />
          <text x="10" y="197" fill="#fff" fontSize="15" fontWeight="600">CMB</text>
          <text x="572" y="148" fill="#fff" fontSize="15" fontWeight="600" textAnchor="end">SIN</text>
          <g transform={reduceMotion ? 'translate(560 120) rotate(36)' : undefined}>
            <path d={PLANE} fill="#fff" transform="scale(1.6)" />
            {!reduceMotion && (
              <animateMotion dur="7s" fill="freeze" rotate="auto" path={ARC}
                calcMode="spline" keyPoints="0;1" keyTimes="0;1" keySplines="0.3 0 0.2 1" />
            )}
          </g>
        </svg>
      </div>
    </section>
  );
}

export default function App() {
  const [tab, setTab] = useState('book');
  const View = TABS[tab][1];
  return (
    <>
      <header className="bar">
        <h1>
          <svg width="26" height="22" viewBox="-12 -12 30 24" aria-hidden="true">
            <path d={PLANE} fill="#fff" transform="rotate(-25)" />
          </svg>
          SkySS
        </h1>
        <nav>
          {Object.entries(TABS).map(([k, [label]]) => (
            <button key={k} className={k === tab ? 'on' : ''} onClick={() => setTab(k)}>{label}</button>
          ))}
        </nav>
      </header>
      {tab === 'book' && <Hero />}
      <main className={tab === 'book' ? 'hero-on' : ''}>
        <View />
      </main>
    </>
  );
}
