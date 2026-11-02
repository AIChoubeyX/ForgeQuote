import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Logo } from '../components/ui/Logo.jsx';
import { api } from '../lib/api.js';

export function LoginPage({ onLogin }) {
  const [form, setForm] = useState({ email: '', password: '' }); const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const navigate = useNavigate();
  async function submit(event) { event.preventDefault(); setBusy(true); setError(''); try { const result = await api('/auth/login', { method: 'POST', body: JSON.stringify(form) }); onLogin(result.user); navigate('/app'); } catch (err) { setError(err.message); } finally { setBusy(false); } }
  return <main className="grid min-h-screen place-items-center bg-slate-50 px-5"><div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-9 shadow-sm"><Logo /><p className="mb-2 mt-12 text-xs font-bold uppercase tracking-[.14em] text-forge">Workspace access</p><h1 className="font-display text-4xl font-semibold text-navy">Welcome back.</h1><p className="mt-2 text-sm text-slate-500">Sign in to continue to your quotation workspace.</p><form className="mt-8" onSubmit={submit}><label className="mb-4 block text-sm font-semibold">Email<input className="field" type="email" required value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} /></label><label className="mb-4 block text-sm font-semibold">Password<input className="field" type="password" required value={form.password} onChange={event => setForm({ ...form, password: event.target.value })} /></label>{error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}<button className="button button-primary w-full" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'} <ArrowRight size={17} /></button></form><Link className="mt-6 block text-center text-sm font-semibold text-forge" to="/">← Back to home</Link></div></main>;
}
