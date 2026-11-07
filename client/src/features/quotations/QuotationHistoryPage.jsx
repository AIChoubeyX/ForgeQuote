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
      className={`inline-flex items-center gap-1.5 whitespace-nowrap px-2.5 py-1 text-xs font-medium ${
        isIssued
          ? 'bg-emerald-500/15 text-emerald-700 border border-emerald-500/30'
          : 'bg-forge/15 text-forge border border-line-strong'
      }`}
    >
      <span
        aria-hidden="true"
        className={`h-1.5 w-1.5 rounded-full ${isIssued ? 'bg-emerald-600' : 'bg-forge'}`}
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
      <main className="mx-auto max-w-7xl p-5 md:p-8 lg:p-10 text-ink">
        <LoadingState label="Loading quotation history…" />
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-3.5 py-4 sm:p-6 md:p-8 lg:p-10 text-ink min-w-0">
      <header className="mb-8">
        <Link
          className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-forge hover:text-forge-hover transition-colors focus:outline-none focus:ring-2 focus:ring-forge"
          to="/app"
        >
          <ArrowLeft size={16} aria-hidden="true" /> Back to dashboard
        </Link>
        <div className="mt-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="eyebrow mb-2">Authoritative commercial records</p>
            <h1 className="font-display text-3xl font-normal tracking-tight text-ink md:text-4xl">
              Quotation history
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-soft">
              Review approved and issued commercial quotations, trace costing revisions, and issue official customer PDF documents.
            </p>
          </div>
          <div className="text-sm text-ink-soft">
            <span className="font-medium text-ink">{rows.length}</span> visible record{rows.length === 1 ? '' : 's'}
          </div>
        </div>
      </header>

      {/* Status Filter Tabs */}
      <nav aria-label="Quotation status filter" className="mb-6 flex min-h-12 flex-wrap items-center gap-1 rounded-xl border border-line bg-paper p-1.5 shadow-sm">
        {filters.map(filter => (
          <button
            className={`min-h-10 rounded-lg px-4 text-sm font-medium transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-forge ${
              statusFilter === filter.value
                ? 'bg-forge text-paper shadow-sm'
                : 'text-ink-soft hover:bg-surface hover:text-ink'
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
        <div className="mb-6 flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-700">
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
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-forge/15 border border-line-strong text-forge">
                <FileText size={18} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-medium text-ink-soft truncate">Total records</p>
                <p className="mt-1 font-display text-2xl font-normal text-ink">{summary.total}</p>
              </div>
            </article>

            <article className="panel flex items-center gap-4 p-4 sm:p-5 min-w-0">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-700">
                <PackageCheck size={18} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-medium text-ink-soft truncate">Issued records</p>
                <p className="mt-1 font-display text-2xl font-normal text-ink">{summary.issued}</p>
              </div>
            </article>

            <article className="panel flex items-center gap-4 p-4 sm:p-5 min-w-0">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-700">
                <FileCheck2 size={18} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-medium text-ink-soft truncate">Approved records</p>
                <p className="mt-1 font-display text-2xl font-normal text-ink">{summary.approved}</p>
              </div>
            </article>

            <article className="panel flex items-center gap-4 p-4 sm:p-5 min-w-0">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-forge/15 border border-line-strong text-forge">
                <IndianRupee size={18} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-medium text-ink-soft truncate">Visible value</p>
                <p className="mt-1 font-display text-2xl font-normal text-forge truncate">{summary.value}</p>
              </div>
            </article>
          </section>

          {!rows.length ? (
            <section className="panel py-16 text-center min-w-0 w-full">
              <FileCheck2 className="mx-auto text-ink-muted" size={36} aria-hidden="true" />
              <h2 className="mt-4 font-display text-lg font-normal text-ink">No quotations found</h2>
              <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-ink-soft">
                There are no {statusFilter ? `"${statusFilter}"` : ''} records in this view yet.
              </p>
              {statusFilter && (
                <button
                  className="mt-5 min-h-11 text-sm font-medium text-forge hover:text-forge-hover underline underline-offset-4 focus:outline-none focus:ring-2 focus:ring-forge"
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
                  <thead className="bg-paper border-b border-line">
                    <tr className="text-xs text-ink-soft">
                      <th className="p-4 font-medium">Quotation</th>
                      <th className="p-4 font-medium">Part details</th>
                      <th className="whitespace-nowrap p-4 font-medium">Revision</th>
                      <th className="p-4 font-medium">Selling value</th>
                      <th className="p-4 font-medium">Status</th>
                      <th className="p-4 font-medium">Timestamp</th>
                      <th className="p-4 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {rows.map(row => {
                      const isRowDownloading = downloadingId === row.id;
                      const isApprovedOnly = row.status === 'approved';
                      const sellingPrice = row.calculations?.components?.sellingPrice;

                      return (
                        <tr
                          className="hover:bg-surface transition-colors"
                          key={row.id}
                        >
                          <td className="p-4">
                            <p className="font-medium text-ink">{row.quotation_number}</p>
                            <p className="mt-1 text-xs text-ink-muted">
                              {row.rfq_number} · {row.customer_name}
                            </p>
                          </td>
                          <td className="p-4">
                            <p className="font-medium text-ink">{row.part_name || '—'}</p>
                            {row.part_number && (
                              <p className="text-xs text-ink-muted">PN: {row.part_number}</p>
                            )}
                          </td>
                          <td className="p-4 text-ink-soft">v{row.revision ?? '1'}</td>
                          <td className="p-4 font-medium text-forge">
                            {sellingPrice
                              ? `₹${Number(sellingPrice).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
                              : '—'}
                          </td>
                          <td className="p-4">
                            <StatusBadge status={row.status} />
                          </td>
                          <td className="whitespace-nowrap p-4 text-xs text-ink-soft">
                            <div>
                              <span className="text-ink-muted">
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
                                className="inline-flex min-h-9 items-center gap-1.5 rounded-md bg-forge px-3 py-1.5 text-xs font-medium text-paper shadow-sm hover:bg-forge-hover disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-forge"
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
                                className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-line bg-paper px-3 py-1.5 text-xs font-medium text-ink hover:border-forge hover:text-forge disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-forge"
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
