import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ErrorState, LoadingState } from '../../components/feedback/States.jsx';
import { api } from '../../lib/api.js';

export function UsersPage() {
  const [rows, setRows] = useState(null); const [error, setError] = useState('');
  useEffect(() => { api('/users').then(result => setRows(result.data)).catch(err => setError(err.message)); }, []);
  if (!rows && !error) return <main className="mx-auto max-w-6xl p-5 md:p-10"><LoadingState label="Loading users…" /></main>;
  return <main className="mx-auto max-w-6xl p-5 md:p-10"><div className="mb-8"><Link className="text-sm font-semibold text-forge" to="/app">← Dashboard</Link><p className="mb-2 mt-6 text-xs font-bold uppercase tracking-[.14em] text-forge">Administration</p><h1 className="font-display text-4xl font-semibold text-navy">Users</h1><p className="mt-2 text-sm text-slate-500">Authenticated users and their assigned roles.</p></div>{error ? <ErrorState message={error} /> : <section className="panel overflow-x-auto"><table className="w-full min-w-[560px] text-left text-sm"><thead><tr className="border-b border-slate-200 text-xs uppercase text-slate-400"><th className="p-3">Name</th><th className="p-3">Email</th><th className="p-3">Role</th><th className="p-3">Created</th></tr></thead><tbody>{rows.map(row => <tr className="border-b border-slate-100 last:border-0" key={row.id}><td className="p-3 font-semibold">{row.name}</td><td className="p-3">{row.email}</td><td className="p-3 capitalize">{row.role.replace('_', ' ')}</td><td className="p-3">{new Date(row.created_at).toLocaleDateString('en-IN')}</td></tr>)}</tbody></table></section>}</main>;
}
