import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Sparkles, CheckCircle2, AlertCircle, ShieldCheck, ArrowRight } from 'lucide-react';
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
    const decisionComment = comment.trim();
    try {
      await api(`/routing-reviews/${selected.id}/decision`, {
        method: 'POST',
        body: JSON.stringify({ decision, comment: decisionComment, rowVersion: selected.row_version })
      });
      setMessage(decision === 'approved' ? 'Route approved and moved to Sales Head for commercial review.' : 'Route returned to the estimator for correction.');
      setSelected(current => current ? {
        ...current,
        status: decision,
        rfq_status: decision === 'approved' ? 'pending_sales_approval' : 'returned_for_revision',
        review_comment: decisionComment,
        reviewed_at: new Date().toISOString()
      } : null);
      setComment('');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!rows) return <main className="mx-auto w-full max-w-6xl px-3.5 py-4 sm:p-6 md:p-10 text-ink min-w-0"><LoadingState label="Loading routing queue…" /></main>;

  return (
    <main className="mx-auto w-full max-w-6xl px-3.5 py-4 sm:p-6 md:p-10 text-ink min-w-0">
      <div className="mb-8">
        <Link className="text-sm font-medium text-forge hover:text-forge-hover transition-colors" to="/app">← Dashboard</Link>
        <p className="mb-2 mt-6 text-xs font-medium text-forge">Plant review</p>
        <h1 className="font-display text-4xl font-normal text-ink">
          {statusFilter === 'pending_review' ? 'Routing review queue' : statusFilter === 'overdue' ? 'Overdue routing reviews' : 'Routing decision history'}
        </h1>
        <p className="mt-2 text-sm text-ink-soft">Review submitted operations and preserved plant decisions.</p>
      </div>

      {error && <div className="mb-4"><ErrorState message={error} /></div>}
      {message && <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-700">{message}</div>}

      {!rows.length ? (
        <EmptyState title={statusFilter === 'overdue' ? 'No overdue routes' : 'No routes are pending review'} message="New estimator submissions will appear here." />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr] min-w-0 w-full">
          {/* Left Column: Routing Review Queue Table */}
          <section className="panel min-w-0 w-full overflow-hidden flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-line mb-2 px-1">
              <span className="text-xs font-medium text-ink-soft">
                Pending Routes Queue ({rows.length})
              </span>
              <span className="text-[11px] text-ink-muted">Click row to inspect</span>
            </div>
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-sm table-fixed min-w-[320px]">
                <thead>
                  <tr className="border-b border-line text-[11px] text-ink-muted bg-surface/50">
                    <th className="p-3 w-[40%] font-medium">RFQ #</th>
                    <th className="p-3 w-[32%] font-medium">Part</th>
                    <th className="p-3 w-[28%] font-medium">Estimator</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  {rows.map(row => {
                    const isRowSelected = selected?.id === row.id;
                    return (
                      <tr
                        aria-label={`Open routing review for ${row.rfq_number}, ${row.name}`}
                        className={`cursor-pointer transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-forge ${
                          isRowSelected
                            ? 'bg-forge/10 border-l-2 border-forge text-ink'
                            : 'text-ink-soft'
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
                        <td className="p-3 font-mono text-xs font-medium text-ink truncate" title={row.rfq_number}>
                          {row.rfq_number}
                        </td>
                        <td className="p-3 text-xs text-ink-soft truncate" title={row.name}>
                          {row.name}
                        </td>
                        <td className="p-3 text-xs text-ink-soft truncate" title={row.estimator_name}>
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

              <div className="border-b border-line pb-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-forge/15 text-forge border border-forge/25">
                    {selected.rfq_number}
                  </span>
                  <span className="text-xs text-ink-muted">Revision {selected.revision_number || 'V1'}</span>
                </div>
                <h2 className="font-display text-xl font-normal text-ink mt-1">{selected.name}</h2>
                <p className="mt-1 text-xs sm:text-sm text-ink-soft">
                  Material: <span className="text-ink font-medium">{selected.material}</span> · Gross Weight: <span className="text-ink font-medium">{selected.gross_weight} kg</span> · Annual Volume: <span className="text-ink font-medium">{selected.annual_volume?.toLocaleString?.() || selected.annual_volume} pcs</span>
                </p>
              </div>

              <div className="rounded-xl border border-line p-4 bg-paper">
                <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-line">
                  <p className="text-xs font-medium text-ink-soft">
                    Operations in Manufacturing Route ({selected.operations?.length || 0})
                  </p>
                  <span className="text-xs font-mono text-ink-muted">Sequence Order</span>
                </div>
                <div className="space-y-2.5">
                  {selected.operations?.map(operation => (
                    <div
                      className="rounded-lg border border-line/80 p-3 bg-paper flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                      key={operation.id || operation.sequence}
                    >
                      <div>
                        <strong className="block text-xs sm:text-sm text-ink font-medium">
                          <span className="text-forge mr-1.5 font-mono">#{operation.sequence}</span>
                          {operation.operation_name}
                        </strong>
                        <span className="mt-0.5 block text-[11px] text-ink-soft font-mono">
                          Machine: {operation.machine_code}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs sm:text-right shrink-0">
                        <span className="rounded bg-surface px-2 py-1 text-ink-soft border border-line text-[11px]">
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

              {/* Decision Section: Action Form if Pending; Authoritative Status Banner if Already Decided */}
              {selected.status === 'approved' || selected.rfq_status === 'pending_sales_approval' || selected.rfq_status === 'ready_for_quote' || selected.rfq_status === 'quoted' ? (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs sm:text-sm text-emerald-700">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-700 shrink-0 mt-0.5 border border-emerald-500/30">
                      <ShieldCheck size={20} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <strong className="text-sm font-medium text-emerald-800">Route Approved · Stage Complete</strong>
                        <span className=" bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-medium text-emerald-800 border border-emerald-500/30 inline-flex items-center gap-1">
                          <CheckCircle2 size={11} /> Moved to Sales Head
                        </span>
                      </div>
                      <p className="text-xs text-ink-soft leading-relaxed">
                        This manufacturing route has been formally approved by the Plant Head and forwarded to the Sales Head for commercial review & quotation release. The route is locked against further plant modifications.
                      </p>
                      {selected.review_comment && (
                        <div className="mt-3 rounded-lg bg-paper border border-line p-3 text-xs">
                          <span className="block font-medium text-ink-muted text-[10px] mb-1">
                            Recorded Plant Decision Note:
                          </span>
                          <p className="text-ink italic font-mono text-[11px] leading-relaxed">"{selected.review_comment}"</p>
                        </div>
                      )}
                      {selected.reviewed_at && (
                        <p className="mt-2.5 text-[10px] text-ink-muted">
                          Approved on {new Date(selected.reviewed_at).toLocaleString('en-IN')}
                          {selected.reviewer_name ? ` by ${selected.reviewer_name}` : ''}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : selected.status === 'changes_requested' || selected.rfq_status === 'returned_for_revision' ? (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs sm:text-sm text-rose-700">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/20 text-rose-700 shrink-0 mt-0.5 border border-rose-500/30">
                      <AlertCircle size={20} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <strong className="text-sm font-medium text-rose-800">Route Returned for Revision</strong>
                        <span className=" bg-rose-500/20 px-2.5 py-0.5 text-[10px] font-medium text-rose-800 border border-rose-500/30 inline-flex items-center gap-1">
                          <ArrowRight size={11} /> Back with Estimator
                        </span>
                      </div>
                      <p className="text-xs text-ink-soft leading-relaxed">
                        Revisions were requested for this manufacturing route. The estimator has been notified to modify operations and submit an updated revision.
                      </p>
                      {selected.review_comment && (
                        <div className="mt-3 rounded-lg bg-paper border border-line p-3 text-xs">
                          <span className="block font-medium text-ink-muted text-[10px] mb-1">
                            Correction Instructions:
                          </span>
                          <p className="text-ink italic font-mono text-[11px] leading-relaxed">"{selected.review_comment}"</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-ink">
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
                      className="button button-primary py-2.5 px-4 text-xs font-medium flex-1 justify-center"
                      type="button"
                      disabled={loading || !comment.trim()}
                      onClick={() => decide('approved')}
                    >
                      {loading ? 'Saving…' : 'Approve Route'}
                    </button>
                    <button
                      className="button border border-line bg-surface text-ink-soft hover:text-danger hover:border-danger py-2.5 px-4 text-xs font-medium flex-1 justify-center transition-colors"
                      type="button"
                      disabled={loading || !comment.trim()}
                      onClick={() => decide('changes_requested')}
                    >
                      {loading ? 'Saving…' : 'Return for Revision'}
                    </button>
                  </div>
                </>
              )}
            </section>
          ) : (
            <section className="panel min-w-0 w-full flex flex-col items-center justify-center p-8 sm:p-12 text-center border-dashed border-line min-h-[380px] bg-paper/60 rounded-xl">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface border border-line text-forge mb-4 shadow-inner">
                <Sparkles size={22} />
              </div>
              <h3 className="font-display text-base font-normal text-ink">
                Select a Manufacturing Route to Review
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-ink-muted max-w-sm leading-relaxed">
                Click on any route from the plant queue on the left to inspect operation sequences, cycle times, machine hourly rates, and trigger AI engineering feasibility review.
              </p>
              <div className="mt-5 inline-flex items-center gap-2 bg-surface border border-line px-3.5 py-1 text-[11px] text-ink-soft">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600"></span>
                <span>Plant Head Review · Sequence Verification · Groq Llama 3.3</span>
              </div>
            </section>
          )}
        </div>
      )}
    </main>
  );
}
