import { useState } from 'react';
import Home from './Home.jsx';
import Book from './Book.jsx';
import Trips from './Trips.jsx';
import Ops from './Ops.jsx';
import { PageHead } from './Shared.jsx';

const TABS = { home: ['Home', Home], book: ['Book a flight', Book], trips: ['Manage my booking', Trips], ops: ['Operations', Ops] };
const HEADS = {
  book: ['Book a flight', 'Pick your route, choose your seat and get your reference by email.', 'book'],
  trips: ['Manage your booking', 'Find a booking with your email or reference to see the gate, status or cancel it.', 'manage'],
  ops: ['Operations control', 'Update flight status and gates, assign crew and watch seat sales.'],
};
const PLANE = 'M16 0 L-10 -10 L-5 0 L-10 10 Z';

export default function App() {
  const [tab, setTab] = useState('home');
  const [prefill, setPrefill] = useState(null);
  const go = (t, query = null) => { setPrefill(query); setTab(t); window.scrollTo({ top: 0 }); };
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
            <button key={k} className={k === tab ? 'on' : ''} onClick={() => go(k)}>{label}</button>
          ))}
        </nav>
      </header>
      {tab === 'home' ? <Home go={go} /> : (
        <>
          <PageHead title={HEADS[tab][0]} sub={HEADS[tab][1]} image={HEADS[tab][2]} />
          <main className="under-head"><View key={JSON.stringify(prefill)} initial={prefill} /></main>
        </>
      )}
    </>
  );
}
