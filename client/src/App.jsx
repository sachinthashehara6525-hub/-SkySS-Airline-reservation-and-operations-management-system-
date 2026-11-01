import { useEffect, useState } from 'react';
import Home from './Home.jsx';
import Book from './Book.jsx';
import Trips from './Trips.jsx';
import MyFlights from './MyFlights.jsx';
import Ops from './Ops.jsx';
import Auth from './Auth.jsx';
import { PageHead } from './Shared.jsx';
import { api, getToken, setToken } from './api.js';

const TABS = { home: ['Home', Home], book: ['Book a flight', Book], myflights: ['My flights', MyFlights], trips: ['Manage my booking', Trips], ops: ['Operations', Ops], login: ['Sign in', Auth] };
const HEADS = {
  book: ['Book a flight', 'Pick your route, choose your seat and get your reference by email.', 'book'],
  trips: ['Manage your booking', 'Find a booking with your email or reference to see the gate, status or cancel it.', 'manage'],
  myflights: ['My flights', 'Every flight you have booked, in one place.', 'manage'],
  ops: ['Operations control', 'Update flight status and gates, assign crew and watch seat sales.'],
  login: ['Your SkySS account', 'Sign in or create an account.', 'book'],
};
const PLANE = 'M16 0 L-10 -10 L-5 0 L-10 10 Z';

export default function App() {
  const [tab, setTab] = useState('home');
  const [prefill, setPrefill] = useState(null);
  const [user, setUser] = useState(null);
  const go = (t, query = null) => { setPrefill(query); setTab(t); window.scrollTo({ top: 0 }); };

  useEffect(() => { if (getToken()) api('/auth/me').then(setUser).catch(() => setToken(null)); }, []);
  const onAuth = (u) => { setUser(u); go(u.role === 'staff' ? 'ops' : 'home'); };
  const signOut = () => { api('/auth/logout', { method: 'POST' }).catch(() => {}); setToken(null); setUser(null); go('home'); };

  const View = TABS[tab][1];
  const props = tab === 'login' ? { onAuth } : { initial: prefill, user, go };
  const nav = ['home', 'book', ...(user ? ['myflights'] : []), 'trips', ...(user?.role === 'staff' ? ['ops'] : [])];
  return (
    <>
      <header className="bar">
        <h1>
          <svg width="26" height="22" viewBox="-12 -12 30 24" aria-hidden="true"><path d={PLANE} fill="#fff" transform="rotate(-25)" /></svg>
          SkySS
        </h1>
        <nav>{nav.map((k) => <button key={k} className={k === tab ? 'on' : ''} onClick={() => go(k)}>{TABS[k][0]}</button>)}</nav>
        <div className="who">
          {user ? (<><span>Hi {user.name.split(' ')[0]}</span><button onClick={signOut}>Sign out</button></>)
            : <button onClick={() => go('login')}>Sign in</button>}
        </div>
      </header>
      {tab === 'home' ? <Home go={go} /> : (
        <>
          <PageHead title={HEADS[tab][0]} sub={HEADS[tab][1]} image={HEADS[tab][2]} />
          <main className="under-head"><View key={JSON.stringify(prefill)} {...props} /></main>
        </>
      )}
    </>
  );
}
