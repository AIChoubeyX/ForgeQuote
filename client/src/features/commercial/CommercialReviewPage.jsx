import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Sparkles, FileText, CheckCircle2 } from 'lucide-react';
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
      const result = await api(`/commercial-reviews/${selected.id}/decision`, {
        method: 'POST',
        body: JSON.stringify({ decision, comment, rowVersion: selected.row_version })
      });
      setQuotationId(result.data.quotation?.id);
      setSelected(null);
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

  if (!rows) return <main className="mx-auto w-full max-w-6xl px-3.5 py-4 sm:p-6 md:p-10 text-[#F5F5F5] min-w-0"><LoadingState label="Loading commercial queue…" /></main>;

  return (
    <main className="mx-auto w-full max-w-6xl px-3.5 py-4 sm:p-6 md:p-10 text-[#F5F5F5] min-w-0">
      <div className="mb-8">
        <Link className="text-sm font-semibold text-forge hover:text-[#E94B13] transition-colors" to="/app">← Dashboard</Link>
        <p className="mb-2 mt-6 text-xs font-bold uppercase tracking-[.14em] text-forge">Commercial review</p>
        <h1 className="font-display text-4xl font-semibold text-[#F5F5F5]">
          {highValue ? 'High-value approvals' : statusFilter === 'pending' ? 'Quotation approvals' : 'Commercial decision history'}
        </h1>
        <p className="mt-2 text-sm text-[#A3A3A3]">Approve or inspect persisted commercial decisions.</p>
        {(highValue || statusFilter !== 'pending') && (
          <Link className="mt-3 inline-block text-sm font-semibold text-forge hover:text-[#E94B13] underline" to="/app/commercial-reviews">
            Clear active filter
          </Link>
        )}
      </div>

      {error && <ErrorState message={error} />}
      {quotationId && (
        <div className="mb-5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-400 flex items-center justify-between">
          <span>Quotation approved successfully.</span>
          <button className="button button-primary py-1.5 px-3 text-xs" onClick={download}>Download PDF</button>
        </div>
      )}

      {!rows.length ? (
        <section className="panel min-w-0 w-full"><p className="text-sm text-[#A3A3A3]">No quotations are pending commercial review.</p></section>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr] min-w-0 w-full">
          {/* Left Column: Review Queue Table */}
          <section className="panel min-w-0 w-full overflow-hidden flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-[#292D34] mb-2 px-1">
              <span className="text-xs font-bold uppercase tracking-wider text-[#A1A1AA]">
                Pending Commercial Queue ({rows.length})
              </span>
              <span className="text-[11px] text-[#71717A]">Click row to inspect</span>
            </div>
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-sm table-fixed min-w-[320px]">
                <thead>
                  <tr className="border-b border-[#292D34] text-[11px] uppercase tracking-wider text-[#737373] bg-[#16161A]/50">
                    <th className="p-3 w-[40%] font-semibold">RFQ #</th>
                    <th className="p-3 w-[32%] font-semibold">Customer</th>
                    <th className="p-3 w-[28%] font-semibold">Part</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#292D34]/60">
                  {rows.map(row => {
                    const isRowSelected = selected?.id === row.id;
                    return (
                      <tr
                        aria-label={`Open commercial review for ${row.rfq_number}, ${row.name}`}
                        className={`cursor-pointer transition-colors hover:bg-[#1E1E22] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-forge ${
                          isRowSelected
                            ? 'bg-[#FF5A1F]/10 border-l-2 border-forge text-white'
                            : 'text-[#D4D4D8]'
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
                        <td className="p-3 font-mono text-xs font-semibold text-[#F5F5F5] truncate" title={row.rfq_number}>
                          {row.rfq_number}
                        </td>
                        <td className="p-3 text-xs text-[#A3A3A3] truncate" title={row.customer_name}>
                          {row.customer_name}
                        </td>
                        <td className="p-3 text-xs text-[#A3A3A3] truncate" title={row.name}>
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

              <div className="border-b border-[#26262B] pb-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-forge/15 text-forge border border-forge/25">
                    {selected.rfq_number}
                  </span>
                  <span className="text-xs text-[#71717A]">Revision {selected.revision_number || 'V1'}</span>
                </div>
                <h2 className="font-display text-xl font-semibold text-[#F5F5F5] mt-1">{selected.name}</h2>
                <p className="mt-1 text-xs sm:text-sm text-[#A3A3A3]">
                  Customer: <span className="text-[#F5F5F5] font-medium">{selected.customer_name}</span> · Material: <span className="text-[#F5F5F5] font-medium">{selected.material}</span> · Annual Volume: <span className="text-[#F5F5F5] font-medium">{selected.annual_volume?.toLocaleString?.() || selected.annual_volume} pcs</span>
                </p>
              </div>

              <div className="rounded-xl border border-[#292D34] p-4 bg-[#141417]">
                <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-[#292D34]">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#A1A1AA]">
                    Cost & Pricing Breakdown
                  </p>
                  {selected.calculations?.sellingPrice && (
                    <span className="text-xs font-mono font-bold text-forge">
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
                        className={`flex justify-between py-1.5 text-xs border-b border-[#292D34]/50 ${
                          isSellingPrice ? 'pt-2.5 border-t-2 border-[#292D34] font-bold text-forge' : ''
                        }`}
                        key={key}
                      >
                        <span className={`capitalize ${isSellingPrice ? 'text-[#F5F5F5]' : 'text-[#A3A3A3]'}`}>
                          {key.replace(/([A-Z])/g, ' $1')}
                        </span>
                        <strong
                          className={`font-mono ${
                            isSellingPrice
                              ? 'text-sm font-bold text-forge'
                              : isScrap
                              ? 'text-emerald-400'
                              : isMargin
                              ? 'text-forge'
                              : 'text-[#F5F5F5]'
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

              <div>
                <label className="block text-sm font-semibold mb-1 text-[#F5F5F5]">
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
                  className="button button-primary py-2.5 px-4 text-xs font-semibold flex-1 justify-center"
                  disabled={!comment.trim()}
                  onClick={() => decide('approved')}
                >
                  Approve Quotation
                </button>
                <button
                  className="button border border-[#292D34] bg-[#18181B] text-[#A3A3A3] hover:text-[#EF4444] hover:border-[#EF4444] py-2.5 px-4 text-xs font-semibold flex-1 justify-center transition-colors"
                  disabled={!comment.trim()}
                  onClick={() => decide('changes_requested')}
                >
                  Return for Correction
                </button>
              </div>
            </section>
          ) : (
            <section className="panel min-w-0 w-full flex flex-col items-center justify-center p-8 sm:p-12 text-center border-dashed border-[#292D34] min-h-[380px] bg-[#121214]/60 rounded-xl">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1C1C20] border border-[#2B2B30] text-forge mb-4 shadow-inner">
                <Sparkles size={22} />
              </div>
              <h3 className="font-display text-base font-semibold text-[#F5F5F5]">
                Select a Quotation to Review
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-[#8E8E93] max-w-sm leading-relaxed">
                Click on any quotation from the queue on the left to inspect margin adequacy, cost breakdowns, and launch real-time AI advisory analysis.
              </p>
              <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#18181B] border border-[#26262B] px-3.5 py-1 text-[11px] text-[#A1A1AA]">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                <span>Live Groq Llama 3.3 · Immutable Audit Trail</span>
              </div>
            </section>
          )}
        </div>
      )}
    </main>
  );
}
