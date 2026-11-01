import { useState } from 'react';
import { api, setToken } from './api.js';

export default function Auth({ onAuth }) {
  const [mode, setMode] = useState('login');
  const [f, setF] = useState({ name: '', email: '', password: '' });
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const login = mode === 'login';

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    try {
      const { token, user } = await api(`/auth/${login ? 'login' : 'register'}`, { method: 'POST', body: f });
      setToken(token);
      onAuth(user);
    } catch (e2) { setErr(e2.message); }
  };

  return (
    <section className="panel signin">
      <h3>{login ? 'Sign in' : 'Create your account'}</h3>
      <p>{login ? 'Passengers see their bookings here. Staff open the operations board.' : 'An account keeps all of your bookings in one place.'}</p>
      <form className="authform" onSubmit={submit}>
        {!login && <label>Full name<input required value={f.name} onChange={set('name')} autoComplete="name" /></label>}
        <label>Email<input required type="email" value={f.email} onChange={set('email')} autoComplete="email" /></label>
        <label>Password<input required type="password" minLength={login ? undefined : 8} value={f.password} onChange={set('password')} autoComplete={login ? 'current-password' : 'new-password'} /></label>
        {!login && <small>Use at least 8 characters.</small>}
        <button className="go">{login ? 'Sign in' : 'Create account'}</button>
      </form>
      {err && <p className="err">{err}</p>}
      <p><button type="button" className="linkbtn" onClick={() => { setMode(login ? 'register' : 'login'); setErr(''); }}>
        {login ? 'New here? Create an account' : 'Already have an account? Sign in'}</button></p>
    </section>
  );
}
