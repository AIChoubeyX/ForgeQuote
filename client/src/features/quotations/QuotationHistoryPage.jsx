import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Download,
  FileCheck2,
  FileText,
  IndianRupee,
  Loader2,
  PackageCheck
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { ErrorState, LoadingState } from '../../components/feedback/States.jsx';
import { api, downloadFile } from '../../lib/api.js';

const filters = [
  { value: '', label: 'All records' },
  { value: 'approved', label: 'Approved (Unissued)' },
  { value: 'issued', label: 'Issued' }
];

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString('en-IN', {
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
  const isIssued = status === 'issued';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
        isIssued
          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
          : 'bg-[#FF5A1F]/15 text-[#FF5A1F] border border-[#66301C]'
      }`}
    >
      <span
        aria-hidden="true"
        className={`h-1.5 w-1.5 rounded-full ${isIssued ? 'bg-emerald-400' : 'bg-[#FF5A1F]'}`}
      />
      {isIssued ? 'Issued' : 'Approved (Unissued)'}
    </span>
  );
}

export function QuotationHistoryPage() {
  const [params, setParams] = useSearchParams();
  const statusFilter = params.get('status') || '';
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [downloadingId, setDownloadingId] = useState(null);

  useEffect(() => {
    setData(null);
    setError('');
    setActionError('');
    api(`/quotations${statusFilter ? `?status=${encodeURIComponent(statusFilter)}` : ''}`)
      .then(result => setData(Array.isArray(result.data) ? result.data : []))
      .catch(err => setError(err.message));
  }, [statusFilter]);

  const rows = data || [];

  const summary = useMemo(() => ({
    total: rows.length,
    issued: rows.filter(row => row.status === 'issued').length,
    approved: rows.filter(row => row.status === 'approved').length,
    value: formatValue(rows)
  }), [rows]);

  async function handleDownloadOrIssue(quotation) {
    try {
      setDownloadingId(quotation.id);
      setActionError('');
      const filename = `${quotation.quotation_number || 'Quotation'}_v${quotation.revision ?? 1}.pdf`;
      await downloadFile(`/quotations/${quotation.id}/pdf`, filename);

      // Successfully issued/downloaded: update in local state so counts and badges reflect immediate issue
      setData(prev =>
        prev
          ? prev.map(item =>
              item.id === quotation.id
                ? {
                    ...item,
                    status: 'issued',
                    issued_at: item.issued_at || new Date().toISOString()
                  }
                : item
            )
          : prev
      );
    } catch (err) {
      setActionError(`Failed to download quotation: ${err.message}`);
    } finally {
      setDownloadingId(null);
    }
  }

  if (!data && !error) {
    return (
      <main className="mx-auto max-w-7xl p-5 md:p-8 lg:p-10 text-[#F5F5F5]">
        <LoadingState label="Loading quotation history…" />
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-3.5 py-4 sm:p-6 md:p-8 lg:p-10 text-[#F5F5F5] min-w-0">
      <header className="mb-8">
        <Link
          className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-forge hover:text-[#E94B13] transition-colors focus:outline-none focus:ring-2 focus:ring-forge"
          to="/app"
        >
          <ArrowLeft size={16} aria-hidden="true" /> Back to dashboard
        </Link>
        <div className="mt-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="eyebrow mb-2">Authoritative commercial records</p>
            <h1 className="font-display text-3xl font-bold tracking-tight text-[#F5F5F5] md:text-4xl">
              Quotation history
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#A3A3A3]">
              Review approved and issued commercial quotations, trace costing revisions, and issue official customer PDF documents.
            </p>
          </div>
          <div className="text-sm text-[#A3A3A3]">
            <span className="font-semibold text-[#F5F5F5]">{rows.length}</span> visible record{rows.length === 1 ? '' : 's'}
          </div>
        </div>
      </header>

      {/* Status Filter Tabs */}
      <nav aria-label="Quotation status filter" className="mb-6 flex min-h-12 flex-wrap items-center gap-1 rounded-xl border border-[#292D34] bg-[#111111] p-1.5 shadow-sm">
        {filters.map(filter => (
          <button
            className={`min-h-10 rounded-lg px-4 text-sm font-semibold transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-forge ${
              statusFilter === filter.value
                ? 'bg-forge text-white shadow-sm'
                : 'text-[#A3A3A3] hover:bg-[#181818] hover:text-[#F5F5F5]'
            }`}
            key={filter.value || 'all'}
            onClick={() => setParams(filter.value ? { status: filter.value } : {})}
            aria-pressed={statusFilter === filter.value}
          >
            {filter.label}
          </button>
        ))}
      </nav>

      {actionError && (
        <div className="mb-6 flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
          <AlertCircle size={18} className="shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {error ? (
        <ErrorState message={error} />
      ) : (
        <>
          {/* Summary KPI Cards */}
          <section aria-label="Quotation summary" className="mb-8 grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 min-w-0 w-full">
            <article className="panel flex items-center gap-4 p-4 sm:p-5 min-w-0">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#FF5A1F]/15 border border-[#66301C] text-forge">
                <FileText size={18} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#A3A3A3] truncate">Total records</p>
                <p className="mt-1 font-display text-2xl font-bold text-[#F5F5F5]">{summary.total}</p>
              </div>
            </article>

            <article className="panel flex items-center gap-4 p-4 sm:p-5 min-w-0">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                <PackageCheck size={18} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#A3A3A3] truncate">Issued records</p>
                <p className="mt-1 font-display text-2xl font-bold text-[#F5F5F5]">{summary.issued}</p>
              </div>
            </article>

            <article className="panel flex items-center gap-4 p-4 sm:p-5 min-w-0">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400">
                <FileCheck2 size={18} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#A3A3A3] truncate">Approved records</p>
                <p className="mt-1 font-display text-2xl font-bold text-[#F5F5F5]">{summary.approved}</p>
              </div>
            </article>

            <article className="panel flex items-center gap-4 p-4 sm:p-5 min-w-0">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#FF5A1F]/15 border border-[#66301C] text-forge">
                <IndianRupee size={18} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#A3A3A3] truncate">Visible value</p>
                <p className="mt-1 font-display text-2xl font-bold text-forge truncate">{summary.value}</p>
              </div>
            </article>
          </section>

          {!rows.length ? (
            <section className="panel py-16 text-center min-w-0 w-full">
              <FileCheck2 className="mx-auto text-[#737373]" size={36} aria-hidden="true" />
              <h2 className="mt-4 font-display text-lg font-semibold text-[#F5F5F5]">No quotations found</h2>
              <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-[#A3A3A3]">
                There are no {statusFilter ? `"${statusFilter}"` : ''} records in this view yet.
              </p>
              {statusFilter && (
                <button
                  className="mt-5 min-h-11 text-sm font-semibold text-forge hover:text-[#E94B13] underline underline-offset-4 focus:outline-none focus:ring-2 focus:ring-forge"
                  onClick={() => setParams({})}
                >
                  View all records
                </button>
              )}
            </section>
          ) : (
            <section className="panel overflow-hidden p-0 min-w-0 w-full">
              <div className="table-scroll">
                <table className="w-full min-w-[850px] text-left text-sm">
                  <caption className="sr-only">Authoritative quotation records</caption>
                  <thead className="bg-[#111111] border-b border-[#292D34]">
                    <tr className="text-xs uppercase tracking-wider text-[#A3A3A3]">
                      <th className="p-4 font-semibold">Quotation</th>
                      <th className="p-4 font-semibold">Part details</th>
                      <th className="p-4 font-semibold">Revision</th>
                      <th className="p-4 font-semibold">Selling value</th>
                      <th className="p-4 font-semibold">Status</th>
                      <th className="p-4 font-semibold">Timestamp</th>
                      <th className="p-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#292D34]">
                    {rows.map(row => {
                      const isRowDownloading = downloadingId === row.id;
                      const isApprovedOnly = row.status === 'approved';
                      const sellingPrice = row.calculations?.components?.sellingPrice;

                      return (
                        <tr
                          className="hover:bg-[#181818] transition-colors"
                          key={row.id}
                        >
                          <td className="p-4">
                            <p className="font-semibold text-[#F5F5F5]">{row.quotation_number}</p>
                            <p className="mt-1 text-xs text-[#737373]">
                              {row.rfq_number} · {row.customer_name}
                            </p>
                          </td>
                          <td className="p-4">
                            <p className="font-medium text-[#F5F5F5]">{row.part_name || '—'}</p>
                            {row.part_number && (
                              <p className="text-xs text-[#737373]">PN: {row.part_number}</p>
                            )}
                          </td>
                          <td className="p-4 text-[#A3A3A3]">v{row.revision ?? '1'}</td>
                          <td className="p-4 font-semibold text-forge">
                            {sellingPrice
                              ? `₹${Number(sellingPrice).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
                              : '—'}
                          </td>
                          <td className="p-4">
                            <StatusBadge status={row.status} />
                          </td>
                          <td className="whitespace-nowrap p-4 text-xs text-[#A3A3A3]">
                            <div>
                              <span className="text-[#737373]">
                                {row.status === 'issued' ? 'Issued: ' : 'Approved: '}
                              </span>
                              {formatDate(row.issued_at || row.approved_at)}
                            </div>
                          </td>
                          <td className="p-4 text-right">
                            {isApprovedOnly ? (
                              <button
                                disabled={isRowDownloading}
                                onClick={() => handleDownloadOrIssue(row)}
                                className="inline-flex min-h-9 items-center gap-1.5 rounded-md bg-forge px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-[#E94B13] disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-forge"
                                title="Issue this quotation and download the authoritative customer PDF"
                              >
                                {isRowDownloading ? (
                                  <>
                                    <Loader2 size={13} className="animate-spin" />
                                    <span>Issuing…</span>
                                  </>
                                ) : (
                                  <>
                                    <PackageCheck size={14} />
                                    <span>Issue & Download</span>
                                  </>
                                )}
                              </button>
                            ) : (
                              <button
                                disabled={isRowDownloading}
                                onClick={() => handleDownloadOrIssue(row)}
                                className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-[#292D34] bg-[#15181D] px-3 py-1.5 text-xs font-medium text-[#F5F5F5] hover:border-forge hover:text-forge disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-forge"
                                title="Download the authoritative customer quotation PDF"
                              >
                                {isRowDownloading ? (
                                  <>
                                    <Loader2 size={13} className="animate-spin" />
                                    <span>Downloading…</span>
                                  </>
                                ) : (
                                  <>
                                    <Download size={14} />
                                    <span>Download PDF</span>
                                  </>
                                )}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
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
