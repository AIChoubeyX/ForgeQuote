import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ErrorState, LoadingState } from '../../components/feedback/States.jsx';
import { api } from '../../lib/api.js';

export function UsersPage() {
  const [rows, setRows] = useState(null); const [error, setError] = useState('');
  useEffect(() => { api('/users').then(result => setRows(result.data)).catch(err => setError(err.message)); }, []);
  if (!rows && !error) return <main className="mx-auto w-full max-w-6xl px-3.5 py-4 sm:p-6 md:p-10 text-ink min-w-0"><LoadingState label="Loading users…" /></main>;
  return <main className="mx-auto w-full max-w-6xl px-3.5 py-4 sm:p-6 md:p-10 text-ink min-w-0"><div className="mb-8"><Link className="text-sm font-medium text-forge hover:text-forge-hover transition-colors" to="/app">← Dashboard</Link><p className="mb-2 mt-6 text-xs font-medium text-forge">Administration</p><h1 className="font-display text-4xl font-normal text-ink">Users</h1><p className="mt-2 text-sm text-ink-soft">Authenticated users and their assigned roles.</p></div>{error ? <ErrorState message={error} /> : <section className="panel p-0 overflow-hidden min-w-0 w-full"><div className="table-scroll"><table className="w-full min-w-[560px] text-left text-sm"><thead><tr className="border-b border-line text-xs text-ink-muted"><th className="p-3">Name</th><th className="p-3">Email</th><th className="p-3">Role</th><th className="p-3">Created</th></tr></thead><tbody>{rows.map(row => <tr className="border-b border-line last:border-0 hover:bg-sunken transition-colors" key={row.id}><td className="p-3 font-medium text-ink">{row.name}</td><td className="p-3 text-ink-soft">{row.email}</td><td className="p-3 capitalize font-medium text-forge">{row.role.replace('_', ' ')}</td><td className="p-3 text-ink-muted">{new Date(row.created_at).toLocaleDateString('en-IN')}</td></tr>)}</tbody></table></div></section>}</main>;
}
