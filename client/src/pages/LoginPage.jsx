import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Logo } from '../components/ui/Logo.jsx';
import { api } from '../lib/api.js';

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
      onLogin(result.user);
      navigate('/app');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#080808] px-5 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center sm:justify-start">
          <Logo />
        </div>
        <div className="rounded-xl border border-[#292D34] bg-[#181818] p-6 shadow-sm sm:p-9">
          <p className="eyebrow mb-2">Workspace access</p>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-[#F5F5F5]">
            Welcome back.
          </h1>
          <p className="mt-2 text-sm text-[#A3A3A3]">
            Sign in to continue to your quotation workspace.
          </p>
          <form className="mt-8" onSubmit={submit}>
            <label className="mb-4 block text-sm font-semibold text-[#F5F5F5]">
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
            <label className="mb-4 block text-sm font-semibold text-[#F5F5F5]">
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
              <div role="alert" className="mb-4 rounded-md border border-[#EF4444]/30 bg-[#EF4444]/10 p-3 text-sm text-[#EF4444]">
                {error}
              </div>
            )}
            <button className="button button-primary w-full" disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in'} <ArrowRight size={17} />
            </button>
          </form>
        </div>
        <Link className="mt-6 block text-center text-sm font-semibold text-forge hover:text-[#E94B13] transition-colors" to="/">
          ← Back to home
        </Link>
      </div>
    </main>
  );
}
