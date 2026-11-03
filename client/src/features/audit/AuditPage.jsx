import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ErrorState, LoadingState } from '../../components/feedback/States.jsx';
import { api } from '../../lib/api.js';

export function AuditPage() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { api('/audit-events').then(result => setRows(result.data)).catch(err => setError(err.message)); }, []);
  if (!rows && !error) return <main className="mx-auto max-w-6xl p-5 md:p-10"><LoadingState label="Loading audit history…" /></main>;
  return <main className="mx-auto max-w-6xl p-5 md:p-10"><div className="mb-8"><Link className="text-sm font-semibold text-forge" to="/app">← Dashboard</Link><p className="mb-2 mt-6 text-xs font-bold uppercase tracking-[.14em] text-forge">Administration</p><h1 className="font-display text-4xl font-semibold text-navy">Audit history</h1><p className="mt-2 text-sm text-slate-500">Approval and issuance events from the persisted audit log.</p></div>{error ? <ErrorState message={error} /> : <section className="panel overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead><tr className="border-b border-slate-200 text-xs uppercase text-slate-400"><th className="p-3">Event</th><th className="p-3">Actor</th><th className="p-3">Entity</th><th className="p-3">Details</th><th className="p-3">Timestamp</th></tr></thead><tbody>{rows.map(row => <tr className="border-b border-slate-100 last:border-0" key={row.id}><td className="p-3 font-semibold">{row.action}</td><td className="p-3">{row.actor_name || 'System'}<span className="block text-xs text-slate-500">{row.actor_role || ''}</span></td><td className="p-3">{row.entity_type}<span className="block text-xs text-slate-500">{row.entity_id}</span></td><td className="max-w-sm p-3 text-xs text-slate-600">{JSON.stringify(row.metadata)}</td><td className="p-3">{new Date(row.created_at).toLocaleString('en-IN')}</td></tr>)}</tbody></table></section>}</main>;
}
