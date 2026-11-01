import { useEffect, useRef, useState } from 'react';
import { api, setToken } from './api.js';

const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const PLANE = 'M16 0 L-10 -10 L-5 0 L-10 10 Z';
const STAGES = [[0, 'Checking your details'], [30, 'Securing your session'], [65, 'Preparing your flights'], [92, 'Welcome aboard']];
const R = 52;
const C = 2 * Math.PI * R;

// Success screen: a ring and a plane move from 1 to 100, then the page opens.
function Launch({ name, onDone }) {
  const [p, setP] = useState(reduce ? 100 : 1);
  useEffect(() => {
    let raf, t;
    if (reduce) { t = setTimeout(onDone, 500); return () => clearTimeout(t); }
    const start = performance.now();
    const tick = (now) => {
      const x = Math.min((now - start) / 2600, 1);
      const eased = x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
      setP(Math.max(1, Math.round(eased * 100)));
      if (x < 1) raf = requestAnimationFrame(tick); else t = setTimeout(onDone, 700);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); clearTimeout(t); };
  }, []);
  const stage = [...STAGES].reverse().find(([at]) => p >= at)[1];
  return (
    <div className="launch" role="status" aria-live="polite">
      <div className="ring">
        <svg viewBox="0 0 120 120" aria-hidden="true">
          <circle cx="60" cy="60" r={R} className="ring-bg" />
          <circle cx="60" cy="60" r={R} className="ring-fg" strokeDasharray={C} strokeDashoffset={C * (1 - p / 100)} />
        </svg>
        <span className="ring-num">{p}<small>%</small></span>
        {p >= 100 && <div className="burst" aria-hidden="true">{Array.from({ length: 14 }, (_, i) => <i key={i} style={{ '--a': `${i * (360 / 14)}deg` }} />)}</div>}
      </div>
      <p className="launch-stage">{stage}</p>
      <div className="runway" aria-hidden="true">
        <span className="runway-fill" style={{ width: `${p}%` }} />
        <span className="plane-run" style={{ left: `${p}%` }}><svg width="26" height="20" viewBox="-12 -12 30 24"><path d={PLANE} fill="#1565d8" /></svg></span>
      </div>
      {p >= 100 && <p className="launch-hi">Welcome, {name}</p>}
    </div>
  );
}

function Rejected({ message }) {
  return (
    <div className="reject" role="alert">
      <svg viewBox="0 0 120 120" className="x-ring" aria-hidden="true">
        <circle cx="60" cy="60" r="52" className="rej-circle" />
        <path d="M42 42 L78 78 M78 42 L42 78" className="rej-x" />
      </svg>
      <p className="launch-stage">Access denied</p>
      <p>{message}</p>
    </div>
  );
}

export default function Auth({ onAuth }) {
  const [mode, setMode] = useState('login');
  const [f, setF] = useState({ name: '', email: '', password: '' });
  const [phase, setPhase] = useState('form'); // form, checking, success, rejected
  const [msg, setMsg] = useState('');
  const [user, setUser] = useState(null);
  const [gid, setGid] = useState('');
  const gref = useRef(null);
  const timer = useRef(null);
  const login = mode === 'login';
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const finish = async (call) => {
    setPhase('checking');
    try {
      const { token, user: u } = await call();
      setToken(token); setUser(u); setPhase('success');
    } catch (e) {
      setMsg(e.message); setPhase('rejected');
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setPhase('form'), 2600);
    }
  };
  const submit = (e) => { e.preventDefault(); finish(() => api(`/auth/${login ? 'login' : 'register'}`, { method: 'POST', body: f })); };

  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => { api('/auth/config').then((c) => setGid(c.googleClientId)).catch(() => {}); }, []);
  useEffect(() => {
    if (!gid || phase !== 'form') return;
    const init = () => {
      window.google.accounts.id.initialize({ client_id: gid, callback: (r) => finish(() => api('/auth/google', { method: 'POST', body: { credential: r.credential } })) });
      if (gref.current) window.google.accounts.id.renderButton(gref.current, { theme: 'outline', size: 'large', width: 320, text: 'continue_with' });
    };
    if (window.google?.accounts) return init();
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client'; s.async = true; s.onload = init;
    document.head.appendChild(s);
  }, [gid, phase]);

  return (
    <section className={`panel signin ${phase === 'rejected' ? 'shake' : ''}`}>
      {phase === 'success' && <Launch name={user.name.split(' ')[0]} onDone={() => onAuth(user)} />}
      {phase === 'rejected' && <Rejected message={msg} />}
      {phase === 'checking' && <div className="launch" role="status"><div className="spin" /><p className="launch-stage">Checking your details</p></div>}
      {phase === 'form' && (
        <>
          <h3>{login ? 'Sign in' : 'Create your account'}</h3>
          <p>{login ? 'Passengers see their bookings here. Staff open the operations board.' : 'An account keeps all of your bookings in one place.'}</p>
          {gid && <><div ref={gref} className="gbtn" /><p className="or"><span>or use your email</span></p></>}
          <form className="authform" onSubmit={submit}>
            {!login && <label>Full name<input required value={f.name} onChange={set('name')} autoComplete="name" /></label>}
            <label>Email<input required type="email" value={f.email} onChange={set('email')} autoComplete="email" /></label>
            <label>Password<input required type="password" minLength={login ? undefined : 8} value={f.password} onChange={set('password')} autoComplete={login ? 'current-password' : 'new-password'} /></label>
            {!login && <small>Use at least 8 characters.</small>}
            <button className="go">{login ? 'Sign in' : 'Create account'}</button>
          </form>
          <p><button type="button" className="linkbtn" onClick={() => { setMode(login ? 'register' : 'login'); setMsg(''); }}>
            {login ? 'New here? Create an account' : 'Already have an account? Sign in'}</button></p>
        </>
      )}
    </section>
  );
}
