import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ErrorState, LoadingState } from '../../components/feedback/States.jsx';
import { api } from '../../lib/api.js';

export function AuditPage() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { api('/audit-events').then(result => setRows(result.data)).catch(err => setError(err.message)); }, []);
  if (!rows && !error) return <main className="mx-auto w-full max-w-6xl px-3.5 py-4 sm:p-6 md:p-10 text-[#F5F5F5] min-w-0"><LoadingState label="Loading audit history…" /></main>;
  return <main className="mx-auto w-full max-w-6xl px-3.5 py-4 sm:p-6 md:p-10 text-[#F5F5F5] min-w-0"><div className="mb-8"><Link className="text-sm font-semibold text-forge hover:text-[#E94B13] transition-colors" to="/app">← Dashboard</Link><p className="mb-2 mt-6 text-xs font-bold uppercase tracking-[.14em] text-forge">Administration</p><h1 className="font-display text-4xl font-semibold text-[#F5F5F5]">Audit history</h1><p className="mt-2 text-sm text-[#A3A3A3]">Approval and issuance events from the persisted audit log.</p></div>{error ? <ErrorState message={error} /> : <section className="panel p-0 overflow-hidden min-w-0 w-full"><div className="table-scroll"><table className="w-full min-w-[760px] text-left text-sm"><thead><tr className="border-b border-[#292D34] text-xs uppercase tracking-wide text-[#737373]"><th className="p-3">Event</th><th className="p-3">Actor</th><th className="p-3">Entity</th><th className="p-3">Details</th><th className="p-3">Timestamp</th></tr></thead><tbody>{rows.map(row => <tr className="border-b border-[#292D34] last:border-0 hover:bg-[#202020] transition-colors" key={row.id}><td className="p-3 font-semibold text-[#F5F5F5]">{row.action}</td><td className="p-3 text-[#A3A3A3]">{row.actor_name || 'System'}<span className="block text-xs text-[#737373]">{row.actor_role || ''}</span></td><td className="p-3 text-forge font-mono text-xs">{row.entity_type}<span className="block text-xs text-[#737373]">{row.entity_id}</span></td><td className="max-w-sm p-3 text-xs text-[#737373] font-mono break-all">{JSON.stringify(row.metadata)}</td><td className="p-3 text-[#A3A3A3]">{new Date(row.created_at).toLocaleString('en-IN')}</td></tr>)}</tbody></table></div></section>}</main>;
}
