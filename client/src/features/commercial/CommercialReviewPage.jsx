import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Sparkles, FileText, CheckCircle2, ShieldCheck, AlertCircle, ArrowRight } from 'lucide-react';
import { api } from '../../lib/api.js';
import { ErrorState, LoadingState } from '../../components/feedback/States.jsx';
import { AiReviewPanel } from '../../components/ai/AiReviewPanel.jsx';
import { formatCurrency } from '../../lib/formatters.js';

export function CommercialReviewPage() {
  const [params] = useSearchParams();
  const statusFilter = params.get('status') || 'pending';
  const highValue = params.get('highValue') === 'true';
  const [rows, setRows] = useState(null);
  const [selected, setSelected] = useState(null);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [quotationId, setQuotationId] = useState(null);

  const load = () => api(`/commercial-reviews?status=${highValue ? 'pending' : statusFilter}&highValue=${highValue}`)
    .then(result => setRows(result.data))
    .catch(err => setError(err.message));

  useEffect(() => { load(); }, [statusFilter, highValue]);

  async function open(id) {
    try {
      const res = await api(`/commercial-reviews/${id}`);
      setSelected(res.data);
    } catch (err) {
      setError(err.message);
    }
  }

  async function decide(decision) {
    try {
      const decisionComment = comment.trim();
      const result = await api(`/commercial-reviews/${selected.id}/decision`, {
        method: 'POST',
        body: JSON.stringify({ decision, comment: decisionComment, rowVersion: selected.row_version })
      });
      setQuotationId(result.data.quotation?.id);
      setSelected(current => current ? {
        ...current,
        status: decision,
        comment: decisionComment,
        reviewed_at: new Date().toISOString()
      } : null);
      setComment('');
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function download() {
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000/api'}/quotations/${quotationId}/pdf`, { credentials: 'include' });
    if (!response.ok) {
      setError((await response.json()).error?.message || 'PDF download failed');
      return;
    }
    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement('a');
    link.href = url;
    link.download = 'quotation.pdf';
    link.click();
    URL.revokeObjectURL(url);
  }

  if (!rows) return <main className="mx-auto w-full max-w-6xl px-3.5 py-4 sm:p-6 md:p-10 text-ink min-w-0"><LoadingState label="Loading commercial queue…" /></main>;

  return (
    <main className="mx-auto w-full max-w-6xl px-3.5 py-4 sm:p-6 md:p-10 text-ink min-w-0">
      <div className="mb-8">
        <Link className="text-sm font-medium text-forge hover:text-forge-hover transition-colors" to="/app">← Dashboard</Link>
        <p className="mb-2 mt-6 text-xs font-medium text-forge">Commercial review</p>
        <h1 className="font-display text-4xl font-normal text-ink">
          {highValue ? 'High-value approvals' : statusFilter === 'pending' ? 'Quotation approvals' : 'Commercial decision history'}
        </h1>
        <p className="mt-2 text-sm text-ink-soft">Approve or inspect persisted commercial decisions.</p>
        {(highValue || statusFilter !== 'pending') && (
          <Link className="mt-3 inline-block text-sm font-medium text-forge hover:text-forge-hover underline" to="/app/commercial-reviews">
            Clear active filter
          </Link>
        )}
      </div>

      {error && <ErrorState message={error} />}
      {quotationId && (
        <div className="mb-5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-700 flex items-center justify-between">
          <span>Quotation approved successfully.</span>
          <button className="button button-primary py-1.5 px-3 text-xs" onClick={download}>Download PDF</button>
        </div>
      )}

      {!rows.length ? (
        <section className="panel min-w-0 w-full"><p className="text-sm text-ink-soft">No quotations are pending commercial review.</p></section>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr] min-w-0 w-full">
          {/* Left Column: Review Queue Table */}
          <section className="panel min-w-0 w-full overflow-hidden flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-line mb-2 px-1">
              <span className="text-xs font-medium text-ink-soft">
                Pending Commercial Queue ({rows.length})
              </span>
              <span className="text-[11px] text-ink-muted">Click row to inspect</span>
            </div>
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-sm table-fixed min-w-[320px]">
                <thead>
                  <tr className="border-b border-line text-[11px] text-ink-muted bg-surface/50">
                    <th className="p-3 w-[40%] font-medium">RFQ #</th>
                    <th className="p-3 w-[32%] font-medium">Customer</th>
                    <th className="p-3 w-[28%] font-medium">Part</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  {rows.map(row => {
                    const isRowSelected = selected?.id === row.id;
                    return (
                      <tr
                        aria-label={`Open commercial review for ${row.rfq_number}, ${row.name}`}
                        className={`cursor-pointer transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-forge ${
                          isRowSelected
                            ? 'bg-forge/10 border-l-2 border-forge text-ink'
                            : 'text-ink-soft'
                        }`}
                        onKeyDown={event => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            open(row.id);
                          }
                        }}
                        onClick={() => open(row.id)}
                        key={row.id}
                        role="button"
                        tabIndex={0}
                      >
                        <td className="p-3 font-mono text-xs font-medium text-ink truncate" title={row.rfq_number}>
                          {row.rfq_number}
                        </td>
                        <td className="p-3 text-xs text-ink-soft truncate" title={row.customer_name}>
                          {row.customer_name}
                        </td>
                        <td className="p-3 text-xs text-ink-soft truncate" title={row.name}>
                          {row.name}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* Right Column: Selected Review Detail or Elegant Placeholder */}
          {selected ? (
            <section className="panel min-w-0 w-full space-y-6">
              <AiReviewPanel
                feature="commercial"
                reviewType="commercial_review"
                rfqId={selected.rfq_id}
                commercialReviewId={selected.id}
                costingRevisionId={selected.costing_revision_id}
                context={selected}
                isLocked={selected?.status !== 'pending'}
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
                  Customer: <span className="text-ink font-medium">{selected.customer_name}</span> · Material: <span className="text-ink font-medium">{selected.material}</span> · Annual Volume: <span className="text-ink font-medium">{selected.annual_volume?.toLocaleString?.() || selected.annual_volume} pcs</span>
                </p>
              </div>

              <div className="rounded-xl border border-line p-4 bg-paper">
                <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-line">
                  <p className="text-xs font-medium text-ink-soft">
                    Cost & Pricing Breakdown
                  </p>
                  {selected.calculations?.sellingPrice && (
                    <span className="text-xs font-mono font-medium text-forge">
                      Selling Price: {formatCurrency(selected.calculations.sellingPrice)}
                    </span>
                  )}
                </div>
                <div className="space-y-2 text-sm">
                  {Object.entries(selected.calculations?.components || {}).map(([key, value]) => {
                    const isSellingPrice = key === 'sellingPrice';
                    const isMargin = key.toLowerCase().includes('margin');
                    const isScrap = key.toLowerCase().includes('scrap');
                    return (
                      <div
                        className={`flex justify-between py-1.5 text-xs border-b border-line/50 ${
                          isSellingPrice ? 'pt-2.5 border-t-2 border-line font-medium text-forge' : ''
                        }`}
                        key={key}
                      >
                        <span className={`capitalize ${isSellingPrice ? 'text-ink' : 'text-ink-soft'}`}>
                          {key.replace(/([A-Z])/g, ' $1')}
                        </span>
                        <strong
                          className={`font-mono ${
                            isSellingPrice
                              ? 'text-sm font-medium text-forge'
                              : isScrap
                              ? 'text-emerald-700'
                              : isMargin
                              ? 'text-forge'
                              : 'text-ink'
                          }`}
                        >
                          {typeof value === 'number'
                            ? (isScrap ? formatCurrency(-Math.abs(value)) : formatCurrency(value))
                            : value}
                        </strong>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Decision Section: Action Form if Pending; Authoritative Status Banner if Already Decided */}
              {selected.status === 'approved' ? (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs sm:text-sm text-emerald-700">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-700 shrink-0 mt-0.5 border border-emerald-500/30">
                      <ShieldCheck size={20} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <strong className="text-sm font-medium text-emerald-800">Quotation Approved · Stage Complete</strong>
                        <span className=" bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-medium text-emerald-800 border border-emerald-500/30 inline-flex items-center gap-1">
                          <CheckCircle2 size={11} /> Ready for Customer Issuance
                        </span>
                      </div>
                      <p className="text-xs text-ink-soft leading-relaxed">
                        Commercial pricing and margins have been signed off. An authoritative quotation has been created and is ready to be released to the customer.
                      </p>
                      {selected.comment && (
                        <div className="mt-3 rounded-lg bg-paper border border-line p-3 text-xs">
                          <span className="block font-medium text-ink-muted text-[10px] mb-1">
                            Recorded Commercial Note:
                          </span>
                          <p className="text-ink italic font-mono text-[11px] leading-relaxed">"{selected.comment}"</p>
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
              ) : selected.status === 'changes_requested' ? (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs sm:text-sm text-rose-700">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/20 text-rose-700 shrink-0 mt-0.5 border border-rose-500/30">
                      <AlertCircle size={20} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <strong className="text-sm font-medium text-rose-800">Commercial Changes Requested</strong>
                        <span className=" bg-rose-500/20 px-2.5 py-0.5 text-[10px] font-medium text-rose-800 border border-rose-500/30 inline-flex items-center gap-1">
                          <ArrowRight size={11} /> Returned for Correction
                        </span>
                      </div>
                      <p className="text-xs text-ink-soft leading-relaxed">
                        Corrections were requested for commercial margins or pricing basis.
                      </p>
                      {selected.comment && (
                        <div className="mt-3 rounded-lg bg-paper border border-line p-3 text-xs">
                          <span className="block font-medium text-ink-muted text-[10px] mb-1">
                            Correction Instructions:
                          </span>
                          <p className="text-ink italic font-mono text-[11px] leading-relaxed">"{selected.comment}"</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-ink">
                      Commercial Decision Explanation <span className="text-forge">*</span>
                    </label>
                    <textarea
                      className="field min-h-24 w-full text-xs sm:text-sm"
                      placeholder="Detail commercial margin validation, pricing release justification, or requested corrections"
                      value={comment}
                      onChange={event => setComment(event.target.value)}
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <button
                      className="button button-primary py-2.5 px-4 text-xs font-medium flex-1 justify-center"
                      disabled={!comment.trim()}
                      onClick={() => decide('approved')}
                    >
                      Approve Quotation
                    </button>
                    <button
                      className="button border border-line bg-surface text-ink-soft hover:text-danger hover:border-danger py-2.5 px-4 text-xs font-medium flex-1 justify-center transition-colors"
                      disabled={!comment.trim()}
                      onClick={() => decide('changes_requested')}
                    >
                      Return for Correction
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
                Select a Quotation to Review
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-ink-muted max-w-sm leading-relaxed">
                Click on any quotation from the queue on the left to inspect margin adequacy, cost breakdowns, and launch real-time AI advisory analysis.
              </p>
              <div className="mt-5 inline-flex items-center gap-2 bg-surface border border-line px-3.5 py-1 text-[11px] text-ink-soft">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600"></span>
                <span>Live Groq Llama 3.3 · Immutable Audit Trail</span>
              </div>
            </section>
          )}
        </div>
      )}
    </main>
  );
}
