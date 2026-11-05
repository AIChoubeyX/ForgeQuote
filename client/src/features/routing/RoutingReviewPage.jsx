import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { api } from '../../lib/api.js';
import { EmptyState, ErrorState, LoadingState } from '../../components/feedback/States.jsx';
import { AiReviewPanel } from '../../components/ai/AiReviewPanel.jsx';
import { formatCurrency } from '../../lib/formatters.js';

export function RoutingReviewPage() {
  const [params] = useSearchParams();
  const statusFilter = params.get('status') || 'pending_review';
  const [rows, setRows] = useState(null);
  const [selected, setSelected] = useState(null);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingId, setLoadingId] = useState(null);

  const load = () => {
    setError('');
    return api(`/routing-reviews?status=${statusFilter}`)
      .then(result => setRows(result.data))
      .catch(err => { setRows(current => current || []); setError(err.message); });
  };

  useEffect(() => { load(); }, [statusFilter]);

  async function open(row) {
    setError('');
    setMessage('');
    setLoadingId(row.id);
    try {
      const result = await api(`/routing-reviews/${row.id}`);
      setSelected(result.data);
      setComment('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingId(null);
    }
  }

  async function decide(decision) {
    if (!selected) return setError('Select a route before deciding.');
    if (!comment.trim()) return setError('Add a meaningful decision explanation before continuing.');
    setError('');
    setMessage('');
    setLoading(true);
    try {
      await api(`/routing-reviews/${selected.id}/decision`, {
        method: 'POST',
        body: JSON.stringify({ decision, comment: comment.trim(), rowVersion: selected.row_version })
      });
      setMessage(decision === 'approved' ? 'Route approved and sent to commercial review.' : 'Route returned to the estimator for correction.');
      setSelected(null);
      setComment('');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!rows) return <main className="mx-auto w-full max-w-6xl px-3.5 py-4 sm:p-6 md:p-10 text-[#F5F5F5] min-w-0"><LoadingState label="Loading routing queue…" /></main>;

  return (
    <main className="mx-auto w-full max-w-6xl px-3.5 py-4 sm:p-6 md:p-10 text-[#F5F5F5] min-w-0">
      <div className="mb-8">
        <Link className="text-sm font-semibold text-forge hover:text-[#E94B13] transition-colors" to="/app">← Dashboard</Link>
        <p className="mb-2 mt-6 text-xs font-bold uppercase tracking-[.14em] text-forge">Plant review</p>
        <h1 className="font-display text-4xl font-semibold text-[#F5F5F5]">
          {statusFilter === 'pending_review' ? 'Routing review queue' : statusFilter === 'overdue' ? 'Overdue routing reviews' : 'Routing decision history'}
        </h1>
        <p className="mt-2 text-sm text-[#A3A3A3]">Review submitted operations and preserved plant decisions.</p>
      </div>

      {error && <div className="mb-4"><ErrorState message={error} /></div>}
      {message && <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-400">{message}</div>}

      {!rows.length ? (
        <EmptyState title={statusFilter === 'overdue' ? 'No overdue routes' : 'No routes are pending review'} message="New estimator submissions will appear here." />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr] min-w-0 w-full">
          {/* Left Column: Routing Review Queue Table */}
          <section className="panel min-w-0 w-full overflow-hidden flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-[#292D34] mb-2 px-1">
              <span className="text-xs font-bold uppercase tracking-wider text-[#A1A1AA]">
                Pending Routes Queue ({rows.length})
              </span>
              <span className="text-[11px] text-[#71717A]">Click row to inspect</span>
            </div>
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-sm table-fixed min-w-[320px]">
                <thead>
                  <tr className="border-b border-[#292D34] text-[11px] uppercase tracking-wider text-[#737373] bg-[#16161A]/50">
                    <th className="p-3 w-[40%] font-semibold">RFQ #</th>
                    <th className="p-3 w-[32%] font-semibold">Part</th>
                    <th className="p-3 w-[28%] font-semibold">Estimator</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#292D34]/60">
                  {rows.map(row => {
                    const isRowSelected = selected?.id === row.id;
                    return (
                      <tr
                        aria-label={`Open routing review for ${row.rfq_number}, ${row.name}`}
                        className={`cursor-pointer transition-colors hover:bg-[#1E1E22] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-forge ${
                          isRowSelected
                            ? 'bg-[#FF5A1F]/10 border-l-2 border-forge text-white'
                            : 'text-[#D4D4D8]'
                        }`}
                        onKeyDown={event => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            open(row);
                          }
                        }}
                        onClick={() => open(row)}
                        key={row.id}
                        role="button"
                        tabIndex={0}
                      >
                        <td className="p-3 font-mono text-xs font-semibold text-[#F5F5F5] truncate" title={row.rfq_number}>
                          {row.rfq_number}
                        </td>
                        <td className="p-3 text-xs text-[#A3A3A3] truncate" title={row.name}>
                          {row.name}
                        </td>
                        <td className="p-3 text-xs text-[#A3A3A3] truncate" title={row.estimator_name}>
                          {row.estimator_name}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {loadingId && (
              <div className="mt-3 flex items-center gap-2 text-xs text-forge p-2">
                <span className="h-2 w-2 rounded-full bg-forge animate-ping" />
                <span>Loading route details…</span>
              </div>
            )}
          </section>

          {/* Right Column: Selected Route Detail or Elegant Placeholder */}
          {selected ? (
            <section className="panel min-w-0 w-full space-y-6">
              <AiReviewPanel
                feature="routing"
                reviewType="routing_review"
                rfqId={selected.rfq_id}
                costingRevisionId={selected.id}
                context={selected}
                isLocked={selected?.status !== 'pending_review'}
                lockMessage={
                  selected?.status === 'approved' || selected?.status === 'changes_requested'
                    ? 'AI review is complete for this workflow stage.'
                    : 'AI review is disabled because this RFQ has moved to the next workflow stage.'
                }
              />

              <div className="border-b border-[#26262B] pb-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-forge/15 text-forge border border-forge/25">
                    {selected.rfq_number}
                  </span>
                  <span className="text-xs text-[#71717A]">Revision {selected.revision_number || 'V1'}</span>
                </div>
                <h2 className="font-display text-xl font-semibold text-[#F5F5F5] mt-1">{selected.name}</h2>
                <p className="mt-1 text-xs sm:text-sm text-[#A3A3A3]">
                  Material: <span className="text-[#F5F5F5] font-medium">{selected.material}</span> · Gross Weight: <span className="text-[#F5F5F5] font-medium">{selected.gross_weight} kg</span> · Annual Volume: <span className="text-[#F5F5F5] font-medium">{selected.annual_volume?.toLocaleString?.() || selected.annual_volume} pcs</span>
                </p>
              </div>

              <div className="rounded-xl border border-[#292D34] p-4 bg-[#141417]">
                <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-[#292D34]">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#A1A1AA]">
                    Operations in Manufacturing Route ({selected.operations?.length || 0})
                  </p>
                  <span className="text-xs font-mono text-[#71717A]">Sequence Order</span>
                </div>
                <div className="space-y-2.5">
                  {selected.operations?.map(operation => (
                    <div
                      className="rounded-lg border border-[#292D34]/80 p-3 bg-[#111114] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                      key={operation.id || operation.sequence}
                    >
                      <div>
                        <strong className="block text-xs sm:text-sm text-[#F5F5F5] font-semibold">
                          <span className="text-forge mr-1.5 font-mono">#{operation.sequence}</span>
                          {operation.operation_name}
                        </strong>
                        <span className="mt-0.5 block text-[11px] text-[#A1A1AA] font-mono">
                          Machine: {operation.machine_code}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs sm:text-right shrink-0">
                        <span className="rounded bg-[#1A1A1E] px-2 py-1 text-[#D4D4D8] border border-[#2B2B30] text-[11px]">
                          {operation.cycle_time_minutes} min/pc
                        </span>
                        <span className="font-mono text-forge font-medium text-[11px]">
                          {operation.rate_unit === 'INR/hour' || operation.rate_unit === '₹/hr'
                            ? `${formatCurrency(operation.rate_value)}/hr`
                            : `${operation.rate_value} ${operation.rate_unit}`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1 text-[#F5F5F5]">
                  Plant Decision Explanation <span className="text-forge">*</span>
                </label>
                <textarea
                  className="field min-h-24 w-full text-xs sm:text-sm"
                  placeholder="Detail plant feasibility audit, tooling checks, or required sequence revisions"
                  value={comment}
                  onChange={event => setComment(event.target.value)}
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  className="button button-primary py-2.5 px-4 text-xs font-semibold flex-1 justify-center"
                  type="button"
                  disabled={loading || !comment.trim()}
                  onClick={() => decide('approved')}
                >
                  {loading ? 'Saving…' : 'Approve Route'}
                </button>
                <button
                  className="button border border-[#292D34] bg-[#18181B] text-[#A3A3A3] hover:text-[#EF4444] hover:border-[#EF4444] py-2.5 px-4 text-xs font-semibold flex-1 justify-center transition-colors"
                  type="button"
                  disabled={loading || !comment.trim()}
                  onClick={() => decide('changes_requested')}
                >
                  {loading ? 'Saving…' : 'Return for Revision'}
                </button>
              </div>
            </section>
          ) : (
            <section className="panel min-w-0 w-full flex flex-col items-center justify-center p-8 sm:p-12 text-center border-dashed border-[#292D34] min-h-[380px] bg-[#121214]/60 rounded-xl">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1C1C20] border border-[#2B2B30] text-forge mb-4 shadow-inner">
                <Sparkles size={22} />
              </div>
              <h3 className="font-display text-base font-semibold text-[#F5F5F5]">
                Select a Manufacturing Route to Review
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-[#8E8E93] max-w-sm leading-relaxed">
                Click on any route from the plant queue on the left to inspect operation sequences, cycle times, machine hourly rates, and trigger AI engineering feasibility review.
              </p>
              <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#18181B] border border-[#26262B] px-3.5 py-1 text-[11px] text-[#A1A1AA]">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                <span>Plant Head Review · Sequence Verification · Groq Llama 3.3</span>
              </div>
            </section>
          )}
        </div>
      )}
    </main>
  );
}
