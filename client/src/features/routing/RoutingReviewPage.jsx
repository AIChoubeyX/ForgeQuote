import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../../lib/api.js';
import { EmptyState, ErrorState, LoadingState } from '../../components/feedback/States.jsx';

export function RoutingReviewPage() {
  const [params] = useSearchParams();
  const statusFilter = params.get('status') || 'pending_review';
  const [rows, setRows] = useState(null); const [selected, setSelected] = useState(null); const [comment, setComment] = useState(''); const [error, setError] = useState(''); const [message, setMessage] = useState(''); const [loading, setLoading] = useState(false); const [loadingId, setLoadingId] = useState(null);
  const load = () => { setError(''); return api(`/routing-reviews?status=${statusFilter}`).then(result => setRows(result.data)).catch(err => { setRows(current => current || []); setError(err.message); }); };
  useEffect(() => { load(); }, [statusFilter]);
  async function open(row) {
    setError(''); setMessage(''); setLoadingId(row.id);
    try { setSelected((await api(`/routing-reviews/${row.id}`)).data); setComment(''); } catch (err) { setError(err.message); }
    finally { setLoadingId(null); }
  }
  async function decide(decision) {
    if (!selected) return setError('Select a route before deciding.');
    if (!comment.trim()) return setError('Add a meaningful decision explanation before continuing.');
    setError(''); setMessage(''); setLoading(true);
    try {
      await api(`/routing-reviews/${selected.id}/decision`, { method: 'POST', body: JSON.stringify({ decision, comment: comment.trim(), rowVersion: selected.row_version }) });
      setMessage(decision === 'approved' ? 'Route approved and sent to commercial review.' : 'Route returned to the estimator for correction.');
      setSelected(null); setComment(''); await load();
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }
  if (!rows) return <main className="mx-auto max-w-6xl p-5 md:p-10"><LoadingState label="Loading routing queue…" /></main>;
  return <main className="mx-auto max-w-6xl p-5 md:p-10"><div className="mb-8"><Link className="text-sm font-semibold text-forge" to="/app">← Dashboard</Link><p className="mb-2 mt-6 text-xs font-bold uppercase tracking-[.14em] text-forge">Plant review</p><h1 className="font-display text-4xl font-semibold text-navy">{statusFilter === 'pending_review' ? 'Routing review queue' : statusFilter === 'overdue' ? 'Overdue routing reviews' : 'Routing decision history'}</h1><p className="mt-2 text-sm text-slate-500">Review submitted operations and preserved plant decisions.</p></div>{error && <div className="mb-4"><ErrorState message={error} /></div>}{message && <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">{message}</div>}{!rows.length ? <EmptyState title={statusFilter === 'overdue' ? 'No overdue routes' : 'No routes are pending review'} message="New estimator submissions will appear here." /> : <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]"><section className="panel min-w-0"><div className="table-scroll"><table className="w-full text-left text-sm"><thead><tr className="border-b border-slate-200 text-xs uppercase text-slate-400"><th className="p-3">RFQ</th><th className="p-3">Part</th><th className="p-3">Estimator</th></tr></thead><tbody>{rows.map(row => <tr className={`cursor-pointer border-b border-slate-100 hover:bg-slate-50 ${selected?.id === row.id ? 'bg-blue-50' : ''}`} onClick={() => open(row)} key={row.id}><td className="p-3 font-semibold">{row.rfq_number}</td><td className="p-3">{row.name}</td><td className="p-3">{row.estimator_name}</td></tr>)}</tbody></table></div>{loadingId && <p className="mt-3 text-sm text-slate-500">Loading route…</p>}</section>{selected && <section className="panel min-w-0"><h2 className="font-display text-lg font-semibold text-navy">{selected.rfq_number} · {selected.name}</h2><p className="my-3 text-sm text-slate-500">{selected.material} · {selected.gross_weight} kg · annual volume {selected.annual_volume}</p><div className="mb-4 space-y-2">{selected.operations?.map(operation => <div className="rounded border border-slate-100 p-3 text-sm" key={operation.id}><strong className="block">{operation.sequence}. {operation.operation_name}</strong><span className="mt-1 block text-slate-500">{operation.machine_code} · {operation.cycle_time_minutes} min · {operation.rate_value} {operation.rate_unit}</span></div>)}</div><label className="block text-sm font-semibold">Decision explanation<textarea className="field min-h-24" placeholder="Explain the approval or requested correction" value={comment} onChange={event => setComment(event.target.value)} /></label><div className="mt-4 flex flex-col gap-3 sm:flex-row"><button className="button button-primary w-full sm:w-auto" type="button" disabled={loading} onClick={() => decide('approved')}>{loading ? 'Saving…' : 'Approve route'}</button><button className="button w-full border border-slate-200 text-slate-600 sm:w-auto" type="button" disabled={loading} onClick={() => decide('changes_requested')}>{loading ? 'Saving…' : 'Return for revision'}</button></div></section>}</div>}</main>;
}
