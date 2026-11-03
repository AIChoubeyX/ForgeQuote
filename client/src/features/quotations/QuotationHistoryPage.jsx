import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, FileCheck2, FileText, IndianRupee, PackageCheck } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { ErrorState, LoadingState } from '../../components/feedback/States.jsx';
import { api } from '../../lib/api.js';

const filters = [
  { value: '', label: 'All records' },
  { value: 'approved', label: 'Approved' },
  { value: 'issued', label: 'Issued' }
];

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

function formatValue(rows) {
  const total = rows.reduce((sum, row) => {
    const value = Number(row.calculations?.components?.sellingPrice);
    return Number.isFinite(value) ? sum + value : sum;
  }, 0);
  return total ? `₹${total.toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : '—';
}

function StatusBadge({ status }) {
  const issued = status === 'issued';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${issued ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${issued ? 'bg-emerald-500' : 'bg-amber-500'}`} />
      {issued ? 'Issued' : 'Approved'}
    </span>
  );
}

function RecordDetails({ row }) {
  return (
    <>
      <p className="font-semibold text-navy">{row.quotation_number}</p>
      <p className="mt-1 text-xs text-slate-500">{row.rfq_number} · {row.customer_name}</p>
    </>
  );
}

export function QuotationHistoryPage() {
  const [params, setParams] = useSearchParams();
  const status = params.get('status') || '';
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setData(null);
    setError('');
    api(`/quotations${status ? `?status=${encodeURIComponent(status)}` : ''}`)
      .then(result => setData(Array.isArray(result.data) ? result.data : []))
      .catch(err => setError(err.message));
  }, [status]);

  const rows = data || [];
  const summary = useMemo(() => ({
    issued: rows.filter(row => row.status === 'issued').length,
    value: formatValue(rows)
  }), [rows]);

  if (!data && !error) {
    return <main className="mx-auto max-w-6xl p-5 md:p-10"><LoadingState label="Loading quotation history…" /></main>;
  }

  return (
    <main className="mx-auto max-w-6xl p-5 md:p-10">
      <header className="mb-7">
        <Link className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-forge hover:text-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100" to="/app">
          <ArrowLeft size={16} aria-hidden="true" /> Back to dashboard
        </Link>
        <div className="mt-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[.14em] text-forge">Commercial history</p>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-navy md:text-4xl">Quotation history</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Review approved and issued quotations linked to their costing revision and RFQ.</p>
          </div>
          <div className="text-sm text-slate-500"><span className="font-semibold text-navy">{rows.length}</span> visible record{rows.length === 1 ? '' : 's'}</div>
        </div>
      </header>

      <nav aria-label="Quotation status filter" className="mb-6 flex min-h-12 flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm">
        {filters.map(filter => (
          <button
            className={`min-h-10 rounded-lg px-4 text-sm font-semibold transition focus:outline-none focus:ring-4 focus:ring-blue-100 ${status === filter.value ? 'bg-navy text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-navy'}`}
            key={filter.value || 'all'}
            onClick={() => setParams(filter.value ? { status: filter.value } : {})}
            aria-pressed={status === filter.value}
          >
            {filter.label}
          </button>
        ))}
      </nav>

      {error ? <ErrorState message={error} /> : (
        <>
          <section aria-label="Quotation summary" className="mb-6 grid gap-4 sm:grid-cols-3">
            {[
              ['Total records', rows.length, FileText],
              ['Issued records', summary.issued, PackageCheck],
              ['Visible value', summary.value, IndianRupee]
            ].map(([label, value, Icon]) => (
              <article className="panel flex items-center gap-4 p-5" key={label}>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-blue-50 text-forge"><Icon size={19} aria-hidden="true" /></span>
                <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 font-display text-xl font-semibold text-navy">{value}</p></div>
              </article>
            ))}
          </section>

          {!rows.length ? (
            <section className="panel py-14 text-center">
              <FileCheck2 className="mx-auto text-slate-300" size={30} aria-hidden="true" />
              <h2 className="mt-4 font-display text-lg font-semibold text-navy">No quotations found</h2>
              <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-slate-500">There are no {status || 'quotation'} records in this view yet.</p>
              {status && <button className="mt-5 min-h-11 text-sm font-semibold text-forge underline underline-offset-4 focus:outline-none focus:ring-4 focus:ring-blue-100" onClick={() => setParams({})}>View all records</button>}
            </section>
          ) : (
            <section className="panel overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <caption className="sr-only">Quotation records</caption>
                  <thead className="bg-slate-50">
                    <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                      <th className="p-4 font-semibold">Quotation</th><th className="p-4 font-semibold">Part</th><th className="p-4 font-semibold">Revision</th><th className="p-4 font-semibold">Value</th><th className="p-4 font-semibold">Status</th><th className="p-4 font-semibold">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(row => (
                      <tr className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70" key={row.id}>
                        <td className="p-4"><RecordDetails row={row} /></td>
                        <td className="p-4 text-slate-700">{row.part_name || '—'}</td>
                        <td className="p-4 text-slate-700">v{row.revision ?? '—'}</td>
                        <td className="p-4 font-semibold text-navy">{row.calculations?.components?.sellingPrice ? `₹${Number(row.calculations.components.sellingPrice).toLocaleString('en-IN')}` : '—'}</td>
                        <td className="p-4"><StatusBadge status={row.status} /></td>
                        <td className="whitespace-nowrap p-4 text-slate-500">{formatDate(row.issued_at || row.approved_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}
    </main>
  );
}
