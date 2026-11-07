import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Logo } from '../components/ui/Logo.jsx';
import { PixelField } from '../components/brand/PixelField.jsx';
import { api, setToken } from '../lib/api.js';

export function LoginPage({ onLogin }) {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const result = await api('/auth/login', { method: 'POST', body: JSON.stringify(form) });
      if (result?.token) setToken(result.token);
      onLogin(result.user);
      navigate('/app');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen bg-paper lg:grid-cols-2">
      <div className="flex flex-col px-5 py-5 sm:px-10">
        <Logo />
        <div className="mx-auto my-auto w-full max-w-md py-12">
          <h1 className="display-xl text-ink">Welcome back.</h1>
          <p className="mt-4 text-[15px] leading-relaxed text-ink">
            Sign in to continue to your quotation workspace.
          </p>
          <form className="mt-10" onSubmit={submit}>
            <label className="mb-4 block text-sm font-medium text-ink">
              Email
              <input
                className="field"
                type="email"
                autoComplete="email"
                required
                value={form.email}
                onChange={event => setForm({ ...form, email: event.target.value })}
              />
            </label>
            <label className="mb-4 block text-sm font-medium text-ink">
              Password
              <input
                className="field"
                type="password"
                autoComplete="current-password"
                required
                value={form.password}
                onChange={event => setForm({ ...form, password: event.target.value })}
              />
            </label>
            {error && (
              <div role="alert" className="mb-4 rounded-md border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
                {error}
              </div>
            )}
            <button className="button button-primary w-full" disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in'} <ArrowRight size={17} />
            </button>
          </form>
          <Link className="mt-6 inline-block text-sm text-forge transition-colors hover:text-forge-hover" to="/">
            ← Back to home
          </Link>
        </div>
      </div>
      <div className="relative hidden lg:block">
        <PixelField cell={36} density={0.42} />
      </div>
    </main>
  );
}
