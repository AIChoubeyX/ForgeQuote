import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ErrorState, LoadingState } from '../../components/feedback/States.jsx';
import { api } from '../../lib/api.js';

export function AuditPage() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { api('/audit-events').then(result => setRows(result.data)).catch(err => setError(err.message)); }, []);
  if (!rows && !error) return <main className="mx-auto w-full max-w-6xl px-3.5 py-4 sm:p-6 md:p-10 text-ink min-w-0"><LoadingState label="Loading audit history…" /></main>;
  return <main className="mx-auto w-full max-w-6xl px-3.5 py-4 sm:p-6 md:p-10 text-ink min-w-0"><div className="mb-8"><Link className="text-sm font-medium text-forge hover:text-forge-hover transition-colors" to="/app">← Dashboard</Link><p className="mb-2 mt-6 text-xs font-medium text-forge">Administration</p><h1 className="font-display text-4xl font-normal text-ink">Audit history</h1><p className="mt-2 text-sm text-ink-soft">Approval and issuance events from the persisted audit log.</p></div>{error ? <ErrorState message={error} /> : <section className="panel p-0 overflow-hidden min-w-0 w-full"><div className="table-scroll"><table className="w-full min-w-[760px] text-left text-sm"><thead><tr className="border-b border-line text-xs text-ink-muted"><th className="p-3">Event</th><th className="p-3">Actor</th><th className="p-3">Entity</th><th className="p-3">Details</th><th className="p-3">Timestamp</th></tr></thead><tbody>{rows.map(row => <tr className="border-b border-line last:border-0 hover:bg-sunken transition-colors" key={row.id}><td className="p-3 font-medium text-ink">{row.action}</td><td className="p-3 text-ink-soft">{row.actor_name || 'System'}<span className="block text-xs text-ink-muted">{row.actor_role || ''}</span></td><td className="p-3 text-forge font-mono text-xs">{row.entity_type}<span className="block text-xs text-ink-muted">{row.entity_id}</span></td><td className="max-w-sm p-3 text-xs text-ink-muted font-mono break-all">{JSON.stringify(row.metadata)}</td><td className="p-3 text-ink-soft">{new Date(row.created_at).toLocaleString('en-IN')}</td></tr>)}</tbody></table></div></section>}</main>;
}
