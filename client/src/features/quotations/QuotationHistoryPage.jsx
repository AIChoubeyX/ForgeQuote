import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FileCheck2,
  FileText,
  Filter,
  IndianRupee,
  Info,
  Loader2,
  PackageCheck,
  Search,
  SlidersHorizontal,
  X
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { StatusBadge } from '../../components/data-display/StatusBadge.jsx';
import { ErrorState, LoadingState } from '../../components/feedback/States.jsx';
import { api, downloadFile } from '../../lib/api.js';
import { formatCurrency } from '../../lib/formatters.js';

const statusTabs = [
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

export function QuotationHistoryPage({ user }) {
  const [params, setParams] = useSearchParams();
  const statusFilter = params.get('status') || '';
  const [currentUser, setCurrentUser] = useState(user || null);

  const [data, setData] = useState(null);
  const [summary, setSummary] = useState({ total: 0, issued: 0, approved: 0, totalValueSum: 0 });
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10, totalPages: 1, total: 0 });

  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [sortBy, setSortBy] = useState('issued_at');
  const [sortOrder, setSortOrder] = useState('desc');

  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [downloadingId, setDownloadingId] = useState(null);
  const [selectedQuotation, setSelectedQuotation] = useState(null);

  // Fetch current user if not provided in props
  useEffect(() => {
    if (!currentUser) {
      api('/auth/me').then(res => setCurrentUser(res.user)).catch(() => {});
    }
  }, [currentUser]);

  // Load quotations from authoritative server API
  const fetchQuotations = async (page = pagination.page, pageSize = pagination.pageSize) => {
    setError('');
    setActionError('');
    try {
      const qParams = new URLSearchParams();
      if (statusFilter) qParams.set('status', statusFilter);
      if (search.trim()) qParams.set('search', search.trim());
      if (fromDate) qParams.set('fromDate', fromDate);
      if (toDate) qParams.set('toDate', toDate);
      qParams.set('sort', sortBy);
      qParams.set('order', sortOrder);
      qParams.set('page', String(page));
      qParams.set('pageSize', String(pageSize));

      const result = await api(`/quotations?${qParams.toString()}`);
      const rows = Array.isArray(result.data) ? result.data : [];
      setData(rows);
      setPagination({
        page: result.page || page,
        pageSize: result.pageSize || pageSize,
        totalPages: result.totalPages || 1,
        total: result.total ?? rows.length
      });
      if (result.summary) {
        setSummary(result.summary);
      } else {
        setSummary({
          total: result.total ?? rows.length,
          issued: rows.filter(r => r.status === 'issued').length,
          approved: rows.filter(r => r.status === 'approved').length,
          totalValueSum: rows.reduce((s, r) => s + Number(r.total_value || 0), 0)
        });
      }
    } catch (err) {
      setError(err.message || 'Failed to load quotation records');
    }
  };

  useEffect(() => {
    fetchQuotations(1, pagination.pageSize);
  }, [statusFilter, search, fromDate, toDate, sortBy, sortOrder]);

  const handlePageChange = newPage => {
    if (newPage < 1 || newPage > pagination.totalPages) return;
    fetchQuotations(newPage, pagination.pageSize);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePageSizeChange = newSize => {
    const size = Number(newSize);
    fetchQuotations(1, size);
  };

  async function handleDownload(quotation) {
    try {
      setDownloadingId(quotation.id);
      setActionError('');
      const filename = `${quotation.quotation_number || 'Quotation'}.pdf`;
      await downloadFile(`/quotations/${quotation.id}/pdf`, filename);
    } catch (err) {
      setActionError(`Failed to download quotation PDF: ${err.message}`);
    } finally {
      setDownloadingId(null);
    }
  }

  async function handleIssueAndDownload(quotation) {
    try {
      setDownloadingId(quotation.id);
      setActionError('');
      await api(`/quotations/${quotation.id}/issue`, { method: 'POST' });
      const filename = `${quotation.quotation_number || 'Quotation'}.pdf`;
      await downloadFile(`/quotations/${quotation.id}/pdf`, filename);
      await fetchQuotations(pagination.page, pagination.pageSize);
      if (selectedQuotation?.id === quotation.id) {
        setSelectedQuotation(prev => prev ? { ...prev, status: 'issued', issued_at: new Date().toISOString() } : null);
      }
    } catch (err) {
      setActionError(`Failed to issue quotation: ${err.message}`);
    } finally {
      setDownloadingId(null);
    }
  }

  const rows = data || [];
  const canIssue = currentUser?.role === 'sales_head' || currentUser?.role === 'admin';

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
              Complete, searchable repository of all commercial quotations generated, approved, and formally issued from your RFQ pipeline.
            </p>
          </div>
          <div className="text-sm text-ink-soft">
            <span className="font-medium text-ink">{pagination.total}</span> authoritative record{pagination.total === 1 ? '' : 's'}
          </div>
        </div>
      </header>

      {/* Workflow Navigation Banner */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-surface/60 p-3.5 sm:px-4 text-xs text-ink-soft">
        <div className="flex items-center gap-2.5 min-w-0">
          <Info size={16} className="text-forge shrink-0" />
          <span>
            <strong>Quotation Lifecycle Notice:</strong> This section displays commercial quotations once generated and approved by Sales Head. Active RFQs currently in early stages (Draft, In Progress, Pending Plant Review) are tracked in the <strong>RFQ Register</strong>.
          </span>
        </div>
        <Link
          to="/app/rfqs"
          className="inline-flex items-center gap-1 font-medium text-forge hover:text-forge-hover underline whitespace-nowrap shrink-0"
        >
          View RFQ Register <ArrowRight size={13} />
        </Link>
      </div>

      {/* KPI Summary Cards */}
      <section aria-label="Quotation summary" className="mb-8 grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 min-w-0 w-full">
        <article className="panel flex items-center gap-4 p-4 sm:p-5 min-w-0">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-forge/15 border border-line-strong text-forge">
            <FileText size={18} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-medium text-ink-soft truncate">Total quotations</p>
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
            <p className="text-xs font-medium text-ink-soft truncate">Approved (Unissued)</p>
            <p className="mt-1 font-display text-2xl font-normal text-ink">{summary.approved}</p>
          </div>
        </article>

        <article className="panel flex items-center gap-4 p-4 sm:p-5 min-w-0">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-forge/15 border border-line-strong text-forge">
            <IndianRupee size={18} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-medium text-ink-soft truncate">Total pipeline value</p>
            <p className="mt-1 font-display text-2xl font-normal text-forge truncate">
              {formatCurrency(summary.totalValueSum)}
            </p>
          </div>
        </article>
      </section>

      {/* Filter and Search Controls Toolbar */}
      <div className="panel p-4 mb-6 min-w-0 w-full space-y-4">
        {/* Row 1: Status Tabs and Text Search */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Status Tabs */}
          <nav aria-label="Quotation status filter" className="flex flex-wrap items-center gap-1.5">
            {statusTabs.map(tab => (
              <button
                key={tab.value || 'all'}
                onClick={() => setParams(tab.value ? { status: tab.value } : {})}
                className={`min-h-9 px-3.5 rounded-lg text-xs font-medium transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-forge ${
                  statusFilter === tab.value
                    ? 'bg-forge text-paper shadow-sm'
                    : 'text-ink-soft bg-surface hover:text-ink hover:bg-sunken border border-line/60'
                }`}
                aria-pressed={statusFilter === tab.value}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Search Bar */}
          <div className="relative min-w-[280px] sm:min-w-[340px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input
              type="text"
              placeholder="Search quotation #, RFQ #, customer, part..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full rounded-lg border border-line bg-paper py-2 pl-9 pr-8 text-xs text-ink placeholder-ink-muted outline-none transition-colors focus:border-forge focus:ring-1 focus:ring-forge"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink"
                title="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Date Range and Sorting */}
        <div className="pt-3 border-t border-line/60 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-ink-muted flex items-center gap-1 font-medium">
              <Calendar size={13} /> Date range:
            </span>
            <input
              type="date"
              value={fromDate}
              onChange={e => setFromDate(e.target.value)}
              className="rounded border border-line bg-paper px-2 py-1 text-xs text-ink outline-none focus:border-forge"
              title="From date"
            />
            <span className="text-ink-muted">to</span>
            <input
              type="date"
              value={toDate}
              onChange={e => setToDate(e.target.value)}
              className="rounded border border-line bg-paper px-2 py-1 text-xs text-ink outline-none focus:border-forge"
              title="To date"
            />
            {(fromDate || toDate) && (
              <button
                onClick={() => { setFromDate(''); setToDate(''); }}
                className="text-xs text-forge hover:underline ml-1"
              >
                Clear dates
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-ink-soft">
              <SlidersHorizontal size={13} />
              <span>Sort by:</span>
              <select
                value={`${sortBy}:${sortOrder}`}
                onChange={e => {
                  const [col, ord] = e.target.value.split(':');
                  setSortBy(col);
                  setSortOrder(ord);
                }}
                className="rounded border border-line bg-paper px-2 py-1 text-xs text-ink outline-none focus:border-forge"
              >
                <option value="issued_at:desc">Issuance date (Newest)</option>
                <option value="issued_at:asc">Issuance date (Oldest)</option>
                <option value="quotation_number:asc">Quotation number (A-Z)</option>
                <option value="total_value:desc">Total value (High to low)</option>
                <option value="unit_price:desc">Unit price (High to low)</option>
                <option value="customer:asc">Customer (A-Z)</option>
              </select>
            </label>

            <label className="flex items-center gap-1.5 text-ink-soft">
              <span>Per page:</span>
              <select
                value={pagination.pageSize}
                onChange={e => handlePageSizeChange(e.target.value)}
                className="rounded border border-line bg-paper px-2 py-1 text-xs text-ink outline-none focus:border-forge"
              >
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
              </select>
            </label>
          </div>
        </div>
      </div>

      {actionError && (
        <div className="mb-6 flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-700">
          <AlertCircle size={18} className="shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {error ? (
        <ErrorState message={error} />
      ) : !data ? (
        <LoadingState label="Loading quotation history…" />
      ) : !rows.length ? (
        <section className="panel py-16 text-center min-w-0 w-full">
          <FileCheck2 className="mx-auto text-ink-muted" size={40} aria-hidden="true" />
          <h2 className="mt-4 font-display text-lg font-normal text-ink">No quotations found</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-ink-soft">
            {search || fromDate || toDate || statusFilter
              ? 'No quotation records match your active filters. Try adjusting search terms or date ranges.'
              : 'There are no quotation records registered in the system yet.'}
          </p>
          {(search || fromDate || toDate || statusFilter) && (
            <button
              className="mt-5 min-h-10 text-xs font-medium text-forge hover:text-forge-hover underline underline-offset-4 focus:outline-none focus:ring-2 focus:ring-forge"
              onClick={() => {
                setParams({});
                setSearch('');
                setFromDate('');
                setToDate('');
              }}
            >
              Reset all filters
            </button>
          )}
        </section>
      ) : (
        <>
          {/* Main Authoritative Quotations Table */}
          <section className="panel overflow-hidden p-0 min-w-0 w-full mb-6">
            <div className="table-scroll">
              <table className="w-full min-w-[950px] text-left text-sm">
                <caption className="sr-only">Authoritative quotation history table</caption>
                <thead className="bg-paper border-b border-line text-xs text-ink-soft">
                  <tr>
                    <th scope="col" className="p-3.5 font-medium">Quotation Number</th>
                    <th scope="col" className="p-3.5 font-medium">RFQ Reference</th>
                    <th scope="col" className="p-3.5 font-medium">Customer</th>
                    <th scope="col" className="p-3.5 font-medium">Part / Product</th>
                    <th scope="col" className="p-3.5 font-medium">Approved Unit Price</th>
                    <th scope="col" className="p-3.5 font-medium">Total Quotation Value</th>
                    <th scope="col" className="p-3.5 font-medium">Currency</th>
                    <th scope="col" className="p-3.5 font-medium">Issued Date</th>
                    <th scope="col" className="p-3.5 font-medium">Valid Until</th>
                    <th scope="col" className="p-3.5 font-medium">Actual Status</th>
                    <th scope="col" className="p-3.5 font-medium text-right">Available Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {rows.map(row => {
                    const isIssued = row.status === 'issued';
                    const isRowDownloading = downloadingId === row.id;
                    const unitPrice = row.unit_price || row.calculations?.components?.sellingPrice;
                    const totalVal = row.total_value || (unitPrice && row.annual_volume ? Number(unitPrice) * Number(row.annual_volume) : null);
                    const validDate = isIssued ? row.valid_until : (row.approved_valid_until || row.valid_until);

                    return (
                      <tr className="hover:bg-surface transition-colors" key={row.id}>
                        {/* Quotation Number */}
                        <td className="p-3.5">
                          <button
                            onClick={() => setSelectedQuotation(row)}
                            className="font-medium text-ink hover:text-forge text-left transition-colors focus:outline-none focus:underline"
                            title="Click to view detailed quotation breakdown"
                          >
                            {row.quotation_number}
                          </button>
                          {row.revision && (
                            <span className="block text-xs text-ink-muted font-mono">
                              Rev v{row.revision}
                            </span>
                          )}
                        </td>

                        {/* RFQ Reference */}
                        <td className="p-3.5">
                          <Link
                            to={row.rfq_id ? `/app/rfqs/${row.rfq_id}/costing` : '/app/rfqs'}
                            className="text-xs text-forge hover:text-forge-hover underline transition-colors focus:outline-none focus:ring-1 focus:ring-forge"
                            title="View costing workspace"
                          >
                            {row.rfq_number || '—'}
                          </Link>
                        </td>

                        {/* Customer */}
                        <td className="p-3.5 text-ink-soft text-xs">
                          {row.customer_name || '—'}
                        </td>

                        {/* Part / Product */}
                        <td className="p-3.5 text-ink text-xs">
                          <p className="font-medium">{row.part_name || '—'}</p>
                          {row.material && (
                            <p className="text-ink-muted text-[11px]">{row.material} {row.gross_weight ? `· ${row.gross_weight} kg` : ''}</p>
                          )}
                        </td>

                        {/* Approved Unit Price */}
                        <td className="p-3.5 font-mono text-xs font-medium text-ink">
                          {unitPrice ? formatCurrency(unitPrice) : '—'}
                        </td>

                        {/* Total Quotation Value */}
                        <td className="p-3.5 font-mono text-xs font-medium text-forge">
                          {totalVal ? formatCurrency(totalVal) : '—'}
                        </td>

                        {/* Currency */}
                        <td className="p-3.5 text-xs text-ink-soft font-mono">
                          {row.currency || 'INR'}
                        </td>

                        {/* Issued Date */}
                        <td className="p-3.5 text-xs text-ink-soft whitespace-nowrap">
                          {isIssued ? formatDate(row.issued_at) : '—'}
                        </td>

                        {/* Valid Until */}
                        <td className="p-3.5 text-xs text-ink-soft whitespace-nowrap">
                          {validDate ? formatDate(validDate) : '—'}
                        </td>

                        {/* Actual Quotation Status */}
                        <td className="p-3.5">
                          <StatusBadge status={row.status} />
                        </td>

                        {/* Available Actions */}
                        <td className="p-3.5 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5 justify-end">
                            <button
                              onClick={() => setSelectedQuotation(row)}
                              className="inline-flex min-h-8 items-center gap-1 rounded border border-line bg-paper px-2 py-1 text-xs font-medium text-ink-soft hover:text-ink hover:border-forge transition-colors focus:outline-none focus:ring-1 focus:ring-forge"
                              title="View full commercial quotation details"
                            >
                              <Eye size={12} />
                              <span className="hidden sm:inline">Details</span>
                            </button>

                            {isIssued ? (
                              <button
                                disabled={isRowDownloading}
                                onClick={() => handleDownload(row)}
                                className="inline-flex min-h-8 items-center gap-1.5 rounded-md border border-line bg-paper px-2.5 py-1 text-xs font-medium text-ink hover:border-forge hover:text-forge disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-forge"
                                title="Download authoritative customer quotation PDF"
                              >
                                {isRowDownloading ? (
                                  <>
                                    <Loader2 size={12} className="animate-spin" />
                                    <span>Downloading…</span>
                                  </>
                                ) : (
                                  <>
                                    <Download size={12} />
                                    <span>Download PDF</span>
                                  </>
                                )}
                              </button>
                            ) : canIssue ? (
                              <button
                                disabled={isRowDownloading}
                                onClick={() => handleIssueAndDownload(row)}
                                className="inline-flex min-h-8 items-center gap-1.5 rounded-md bg-forge px-2.5 py-1 text-xs font-medium text-paper shadow-sm hover:bg-forge-hover disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-forge"
                                title="Issue this quotation and download the customer PDF"
                              >
                                {isRowDownloading ? (
                                  <>
                                    <Loader2 size={12} className="animate-spin" />
                                    <span>Issuing…</span>
                                  </>
                                ) : (
                                  <>
                                    <PackageCheck size={12} />
                                    <span>Issue & Download</span>
                                  </>
                                )}
                              </button>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 text-xs text-ink-muted bg-surface rounded border border-line/60">
                                Pending Sales
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-line bg-paper px-4 py-3 text-xs text-ink-soft">
              <div>
                Showing <strong className="text-ink">{rows.length ? (pagination.page - 1) * pagination.pageSize + 1 : 0}</strong> to{' '}
                <strong className="text-ink">
                  {Math.min(pagination.page * pagination.pageSize, pagination.total)}
                </strong>{' '}
                of <strong className="text-ink">{pagination.total}</strong> quotation records
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  disabled={pagination.page <= 1}
                  onClick={() => handlePageChange(pagination.page - 1)}
                  className="inline-flex min-h-8 items-center gap-1 rounded border border-line bg-paper px-2.5 py-1 text-xs font-medium text-ink hover:bg-surface disabled:opacity-40 transition-colors focus:outline-none focus:ring-1 focus:ring-forge"
                >
                  <ChevronLeft size={14} /> Previous
                </button>

                <span className="px-2 text-ink">
                  Page {pagination.page} of {pagination.totalPages}
                </span>

                <button
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => handlePageChange(pagination.page + 1)}
                  className="inline-flex min-h-8 items-center gap-1 rounded border border-line bg-paper px-2.5 py-1 text-xs font-medium text-ink hover:bg-surface disabled:opacity-40 transition-colors focus:outline-none focus:ring-1 focus:ring-forge"
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </section>
        </>
      )}

      {/* Quotation Specification Detail Modal */}
      {selectedQuotation && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="quotation-detail-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm overflow-y-auto"
        >
          <div className="panel max-h-[90vh] w-full max-w-2xl overflow-y-auto p-5 sm:p-7 shadow-2xl">
            <div className="flex items-start justify-between border-b border-line pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 id="quotation-detail-title" className="font-display text-xl font-normal text-ink">
                    {selectedQuotation.quotation_number}
                  </h2>
                  <StatusBadge status={selectedQuotation.status} />
                </div>
                <p className="mt-1 text-xs text-ink-soft">
                  RFQ: <strong className="text-ink">{selectedQuotation.rfq_number}</strong> · Customer:{' '}
                  <strong className="text-ink">{selectedQuotation.customer_name}</strong>
                </p>
              </div>
              <button
                onClick={() => setSelectedQuotation(null)}
                className="text-ink-muted hover:text-ink focus:outline-none focus:ring-2 focus:ring-forge rounded p-1"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-5 space-y-6 text-xs">
              {/* Part Overview */}
              <div>
                <h3 className="font-display text-xs font-medium text-forge uppercase tracking-wider mb-2">
                  1. Component Specifications
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-surface p-3 rounded border border-line/60">
                  <div>
                    <span className="text-ink-muted block text-[11px]">Part Name</span>
                    <strong className="text-ink font-medium">{selectedQuotation.part_name || '—'}</strong>
                  </div>
                  <div>
                    <span className="text-ink-muted block text-[11px]">Material</span>
                    <strong className="text-ink font-medium">{selectedQuotation.material || '—'}</strong>
                  </div>
                  <div>
                    <span className="text-ink-muted block text-[11px]">Gross Weight</span>
                    <strong className="text-ink font-medium">{selectedQuotation.gross_weight ? `${selectedQuotation.gross_weight} kg` : '—'}</strong>
                  </div>
                  <div>
                    <span className="text-ink-muted block text-[11px]">Annual Volume</span>
                    <strong className="text-ink font-medium">{selectedQuotation.annual_volume ? `${Number(selectedQuotation.annual_volume).toLocaleString()} pcs` : '—'}</strong>
                  </div>
                </div>
              </div>

              {/* Commercial Breakdown */}
              <div>
                <h3 className="font-display text-xs font-medium text-forge uppercase tracking-wider mb-2">
                  2. Commercial Cost Breakdown
                </h3>
                <div className="rounded border border-line bg-paper overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-surface border-b border-line text-ink-muted">
                      <tr>
                        <th className="p-2.5 font-medium">Component</th>
                        <th className="p-2.5 font-medium text-right">Value per Part</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line/60">
                      {selectedQuotation.calculations?.components ? (
                        Object.entries(selectedQuotation.calculations.components).map(([k, v]) => (
                          <tr key={k} className="hover:bg-sunken">
                            <td className="p-2.5 capitalize text-ink-soft">
                              {k.replace(/([A-Z])/g, ' $1')}
                            </td>
                            <td className="p-2.5 font-mono text-right font-medium text-ink">
                              {formatCurrency(v)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={2} className="p-4 text-center text-ink-muted">
                            Costing snapshot details recorded at approval.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Audit & Timing */}
              <div>
                <h3 className="font-display text-xs font-medium text-forge uppercase tracking-wider mb-2">
                  3. Validity & Audit Lifecycle
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-surface p-3 rounded border border-line/60">
                  <div>
                    <span className="text-ink-muted block text-[11px]">Approved Date</span>
                    <span className="text-ink font-medium">{formatDate(selectedQuotation.approved_at)}</span>
                  </div>
                  <div>
                    <span className="text-ink-muted block text-[11px]">Issued Date</span>
                    <span className="text-ink font-medium">{formatDate(selectedQuotation.issued_at)}</span>
                  </div>
                  <div>
                    <span className="text-ink-muted block text-[11px]">Valid Until</span>
                    <span className="text-ink font-medium">
                      {formatDate(selectedQuotation.valid_until || selectedQuotation.approved_valid_until)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 border-t border-line pt-4">
              <button
                onClick={() => setSelectedQuotation(null)}
                className="rounded border border-line bg-paper px-4 py-2 text-xs font-medium text-ink hover:bg-surface transition-colors focus:outline-none focus:ring-1 focus:ring-forge"
              >
                Close
              </button>
              {selectedQuotation.status === 'issued' ? (
                <button
                  disabled={downloadingId === selectedQuotation.id}
                  onClick={() => handleDownload(selectedQuotation)}
                  className="inline-flex items-center gap-1.5 rounded bg-forge px-4 py-2 text-xs font-medium text-paper hover:bg-forge-hover transition-colors focus:outline-none focus:ring-2 focus:ring-forge disabled:opacity-50"
                >
                  <Download size={14} />
                  <span>Download Quotation PDF</span>
                </button>
              ) : canIssue ? (
                <button
                  disabled={downloadingId === selectedQuotation.id}
                  onClick={() => handleIssueAndDownload(selectedQuotation)}
                  className="inline-flex items-center gap-1.5 rounded bg-forge px-4 py-2 text-xs font-medium text-paper hover:bg-forge-hover transition-colors focus:outline-none focus:ring-2 focus:ring-forge disabled:opacity-50"
                >
                  <PackageCheck size={14} />
                  <span>Issue & Download PDF</span>
                </button>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
