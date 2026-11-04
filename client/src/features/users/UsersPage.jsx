import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ErrorState, LoadingState } from '../../components/feedback/States.jsx';
import { api } from '../../lib/api.js';

export function UsersPage() {
  const [rows, setRows] = useState(null); const [error, setError] = useState('');
  useEffect(() => { api('/users').then(result => setRows(result.data)).catch(err => setError(err.message)); }, []);
  if (!rows && !error) return <main className="mx-auto w-full max-w-6xl px-3.5 py-4 sm:p-6 md:p-10 text-[#F5F5F5] min-w-0"><LoadingState label="Loading users…" /></main>;
  return <main className="mx-auto w-full max-w-6xl px-3.5 py-4 sm:p-6 md:p-10 text-[#F5F5F5] min-w-0"><div className="mb-8"><Link className="text-sm font-semibold text-forge hover:text-[#E94B13] transition-colors" to="/app">← Dashboard</Link><p className="mb-2 mt-6 text-xs font-bold uppercase tracking-[.14em] text-forge">Administration</p><h1 className="font-display text-4xl font-semibold text-[#F5F5F5]">Users</h1><p className="mt-2 text-sm text-[#A3A3A3]">Authenticated users and their assigned roles.</p></div>{error ? <ErrorState message={error} /> : <section className="panel p-0 overflow-hidden min-w-0 w-full"><div className="table-scroll"><table className="w-full min-w-[560px] text-left text-sm"><thead><tr className="border-b border-[#292D34] text-xs uppercase tracking-wide text-[#737373]"><th className="p-3">Name</th><th className="p-3">Email</th><th className="p-3">Role</th><th className="p-3">Created</th></tr></thead><tbody>{rows.map(row => <tr className="border-b border-[#292D34] last:border-0 hover:bg-[#202020] transition-colors" key={row.id}><td className="p-3 font-semibold text-[#F5F5F5]">{row.name}</td><td className="p-3 text-[#A3A3A3]">{row.email}</td><td className="p-3 capitalize font-semibold text-forge">{row.role.replace('_', ' ')}</td><td className="p-3 text-[#737373]">{new Date(row.created_at).toLocaleDateString('en-IN')}</td></tr>)}</tbody></table></div></section>}</main>;
}
