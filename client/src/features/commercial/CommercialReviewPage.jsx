import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../../lib/api.js';
import { ErrorState, LoadingState } from '../../components/feedback/States.jsx';
import { AiReviewPanel } from '../../components/ai/AiReviewPanel.jsx';

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
        <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr] min-w-0 w-full">
          <section className="panel min-w-0 w-full">
            <div className="table-scroll" tabIndex={0} role="region" aria-label="Commercial review queue. Scroll horizontally for more columns.">
            <table className="w-full min-w-[500px] text-left text-sm">
              <thead>
                <tr className="border-b border-[#292D34] text-xs uppercase text-[#737373]">
                  <th className="p-3">RFQ</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Part</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(row => (
                  <tr
                    aria-label={`Open commercial review for ${row.rfq_number}, ${row.name}`}
                    className={`cursor-pointer border-b border-[#292D34] hover:bg-[#202020] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-forge transition-colors ${selected?.id === row.id ? 'bg-[#FF5A1F]/10 border-l-2 border-forge' : ''}`}
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
                    <td className="p-3 font-semibold text-[#F5F5F5]">{row.rfq_number}</td>
                    <td className="p-3 text-[#A3A3A3]">{row.customer_name}</td>
                    <td className="p-3 text-[#A3A3A3]">{row.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </section>

          {selected && (
            <section className="panel min-w-0 w-full space-y-6">
              <AiReviewPanel
                feature="commercial"
                reviewType="commercial_review"
                rfqId={selected.rfq_id}
                commercialReviewId={selected.id}
                costingRevisionId={selected.costing_revision_id}
                context={selected}
              />

              <div>
                <h2 className="font-display text-lg font-semibold text-[#F5F5F5]">{selected.rfq_number} · {selected.name}</h2>
                <p className="my-2 text-sm text-[#A3A3A3]">{selected.customer_name} · {selected.material} · annual volume {selected.annual_volume}</p>
              </div>

              <div className="rounded-lg border border-[#292D34] p-3 bg-[#111111]">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#737373] mb-2">Cost & Pricing Breakdown</p>
                <div className="space-y-1.5 text-sm">
                  {Object.entries(selected.calculations?.components || {}).map(([key, value]) => (
                    <div className="flex justify-between border-b border-[#292D34] py-1.5 text-xs" key={key}>
                      <span className="capitalize text-[#A3A3A3]">{key.replace(/([A-Z])/g, ' $1')}</span>
                      <strong className="text-[#F5F5F5]">{value}</strong>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1 text-[#F5F5F5]">Decision explanation (required)</label>
                <textarea
                  className="field min-h-24"
                  placeholder="Explain the commercial approval or requested changes"
                  value={comment}
                  onChange={event => setComment(event.target.value)}
                />
              </div>

              <div className="flex gap-3">
                <button className="button button-primary" disabled={!comment.trim()} onClick={() => decide('approved')}>
                  Approve quotation
                </button>
                <button className="button border border-[#292D34] bg-[#181818] text-[#A3A3A3] hover:text-[#EF4444] hover:border-[#EF4444]" disabled={!comment.trim()} onClick={() => decide('changes_requested')}>
                  Return for correction
                </button>
              </div>
            </section>
          )}
        </div>
      )}
    </main>
  );
}
