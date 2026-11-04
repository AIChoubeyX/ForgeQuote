import { useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Clock,
  Download,
  FileCheck2,
  FileEdit,
  FileText,
  GitPullRequest,
  Loader2,
  PackageCheck,
  Search,
  ShieldCheck,
  X
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { downloadFile } from '../../lib/api.js';

function formatDate(val) {
  if (!val) return '—';
  const d = new Date(val);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatPrice(val) {
  const num = Number(val);
  if (!Number.isFinite(num) || num <= 0) return '—';
  return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function AdminLifecycleTable({ initialRecords = [] }) {
  const [records, setRecords] = useState(initialRecords);
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [downloadingId, setDownloadingId] = useState(null);
  const [actionError, setActionError] = useState('');

  // Keep internal records in sync if parent initialRecords updates
  useMemo(() => {
    setRecords(initialRecords);
  }, [initialRecords]);

  // Compute counts for tabs
  const counts = useMemo(() => {
    let issued = 0;
    let approved = 0;
    let inProgress = 0;
    let draft = 0;

    for (const r of records) {
      if (r.quotation_status === 'issued') {
        issued++;
      } else if (r.quotation_status === 'approved') {
        approved++;
      } else if (r.revision_id || r.commercial_status || r.routing_status) {
        inProgress++;
      } else {
        draft++;
      }
    }

    return {
      all: records.length,
      issued,
      approved,
      in_progress: inProgress,
      draft
    };
  }, [records]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return records.filter(row => {
      // Tab filter
      if (activeTab === 'issued' && row.quotation_status !== 'issued') return false;
      if (activeTab === 'approved' && row.quotation_status !== 'approved') return false;
      if (activeTab === 'in_progress') {
        const isQuotedOrApproved = row.quotation_status === 'issued' || row.quotation_status === 'approved';
        const hasWork = row.revision_id || row.commercial_status || row.routing_status;
        if (isQuotedOrApproved || !hasWork) return false;
      }
      if (activeTab === 'draft') {
        const hasWork = row.revision_id || row.commercial_status || row.routing_status || row.quotation_status;
        if (hasWork) return false;
      }

      // Text search
      if (!q) return true;
      return (
        (row.rfq_number && row.rfq_number.toLowerCase().includes(q)) ||
        (row.customer_name && row.customer_name.toLowerCase().includes(q)) ||
        (row.part_name && row.part_name.toLowerCase().includes(q)) ||
        (row.material && row.material.toLowerCase().includes(q)) ||
        (row.estimator_name && row.estimator_name.toLowerCase().includes(q)) ||
        (row.quotation_number && row.quotation_number.toLowerCase().includes(q))
      );
    });
  }, [records, activeTab, search]);

  async function handleDownloadOrIssue(row) {
    if (!row.quotation_id) return;
    try {
      setDownloadingId(row.quotation_id);
      setActionError('');
      const filename = `${row.quotation_number || 'Quotation'}_v${row.revision ?? 1}.pdf`;
      await downloadFile(`/quotations/${row.quotation_id}/pdf`, filename);

      // Instantly reflect issued status in local table state
      setRecords(prev =>
        prev.map(item =>
          item.quotation_id === row.quotation_id
            ? {
                ...item,
                quotation_status: 'issued',
                issued_at: item.issued_at || new Date().toISOString(),
                stage: {
                  key: 'issued',
                  label: 'Quotation Issued',
                  badgeColor: 'emerald',
                  isIssued: true,
                  isApproved: true
                }
              }
            : item
        )
      );
    } catch (err) {
      setActionError(`Action failed: ${err.message}`);
    } finally {
      setDownloadingId(null);
    }
  }

  const tabs = [
    { key: 'all', label: 'All records', count: counts.all },
    { key: 'issued', label: 'Quotation Issued', count: counts.issued },
    { key: 'approved', label: 'Approved (Unissued)', count: counts.approved },
    { key: 'in_progress', label: 'In Review / Costing', count: counts.in_progress },
    { key: 'draft', label: 'Draft RFQs', count: counts.draft }
  ];

  return (
    <section className="panel p-4 sm:p-6 min-w-0 w-full overflow-hidden">
      {/* Header */}
      <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-center min-w-0 w-full">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded bg-[#FF5A1F]/15 border border-[#66301C] text-forge shrink-0">
              <FileCheck2 size={16} />
            </span>
            <h2 className="font-display text-lg sm:text-xl font-bold tracking-tight text-[#F5F5F5] break-words">
              Enterprise RFQ & Quotation Lifecycle
            </h2>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-[#A3A3A3] break-words">
            Authoritative visibility across all customer inquiries, engineering stages, costing revisions, and issued commercial quotations.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/app/quotations"
            className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-[#292D34] bg-[#181818] px-3.5 py-2 text-xs font-semibold text-[#D4D4D4] hover:border-forge hover:text-[#F5F5F5] transition-colors"
          >
            Quotation history <ArrowRight size={13} />
          </Link>
          <Link
            to="/app/rfqs"
            className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-[#292D34] bg-[#181818] px-3.5 py-2 text-xs font-semibold text-[#D4D4D4] hover:border-forge hover:text-[#F5F5F5] transition-colors"
          >
            RFQ register <ArrowRight size={13} />
          </Link>
        </div>
      </div>

      {actionError && (
        <div className="mb-5 flex items-center justify-between gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-400">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError('')} className="text-red-400 hover:text-red-300">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Filter Tabs & Search Bar */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Stage Filter Tabs */}
        <nav aria-label="Lifecycle stages" className="flex flex-wrap items-center gap-1.5">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`inline-flex min-h-9 items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-forge ${
                activeTab === tab.key
                  ? 'bg-forge text-white shadow-sm'
                  : 'bg-[#181818] text-[#A3A3A3] border border-[#292D34] hover:bg-[#202020] hover:text-[#F5F5F5]'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                  activeTab === tab.key ? 'bg-black/30 text-white' : 'bg-[#292D34] text-[#A3A3A3]'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </nav>

        {/* Search input */}
        <div className="relative w-full sm:w-auto sm:min-w-[260px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#737373]" />
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search RFQ, customer, part..."
            className="w-full rounded-lg border border-[#292D34] bg-[#111111] py-2 pl-9 pr-8 text-xs text-[#F5F5F5] placeholder-[#737373] outline-none transition-colors focus:border-forge focus:ring-1 focus:ring-forge"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#737373] hover:text-[#F5F5F5]"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="table-scroll">
        <table className="w-full text-left text-sm min-w-[760px]">
          <thead className="border-b border-[#292D34] text-xs font-semibold uppercase tracking-wider text-[#737373]">
            <tr>
              <th scope="col" className="px-4 py-3">RFQ & Customer</th>
              <th scope="col" className="px-4 py-3">Part Specifications</th>
              <th scope="col" className="px-4 py-3">Assigned Estimator</th>
              <th scope="col" className="px-4 py-3">Working Stage</th>
              <th scope="col" className="px-4 py-3">Quotation & Value</th>
              <th scope="col" className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#202020]">
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-[#737373]">
                  <p className="text-sm">No records match the current filter or search criteria.</p>
                  {(activeTab !== 'all' || search) && (
                    <button
                      onClick={() => {
                        setActiveTab('all');
                        setSearch('');
                      }}
                      className="mt-3 text-xs font-semibold text-forge hover:text-[#E94B13]"
                    >
                      Clear filters
                    </button>
                  )}
                </td>
              </tr>
            ) : (
              filteredRows.map(row => {
                const stage = row.stage || { label: 'RFQ Registered', key: 'draft', badgeColor: 'zinc' };
                const isIssued = row.quotation_status === 'issued';
                const isApproved = row.quotation_status === 'approved';
                const isDownloading = downloadingId === row.quotation_id;

                return (
                  <tr
                    key={row.rfq_id || row.rfq_number}
                    className="hover:bg-[#181818]/60 transition-colors duration-150"
                  >
                    {/* RFQ & Customer */}
                    <td className="px-4 py-4 align-top">
                      <div className="font-semibold text-[#F5F5F5]">{row.rfq_number}</div>
                      <div className="mt-0.5 text-xs text-[#A3A3A3]">{row.customer_name}</div>
                      <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-[#737373]">
                        <span>Due: {formatDate(row.due_date)}</span>
                      </div>
                    </td>

                    {/* Part Specifications */}
                    <td className="px-4 py-4 align-top">
                      <div className="font-medium text-[#F5F5F5]">{row.part_name || '—'}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        {row.material && (
                          <span className="inline-block rounded bg-[#202020] border border-[#292D34] px-1.5 py-0.5 text-[10px] font-medium text-[#D4D4D4]">
                            {row.material}
                          </span>
                        )}
                        {row.gross_weight && (
                          <span className="text-[11px] text-[#737373]">{row.gross_weight} kg</span>
                        )}
                        {row.annual_volume && (
                          <span className="text-[11px] text-[#737373]">
                            · {Number(row.annual_volume).toLocaleString('en-IN')} pcs/yr
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Assigned Estimator */}
                    <td className="px-4 py-4 align-top">
                      <div className="flex items-center gap-2">
                        <span className="grid h-6 w-6 place-items-center rounded-full bg-[#FF5A1F]/15 border border-[#66301C]/60 text-[11px] font-bold text-forge">
                          {(row.estimator_name || 'U')[0]}
                        </span>
                        <span className="text-xs text-[#D4D4D4]">{row.estimator_name || 'Unassigned'}</span>
                      </div>
                    </td>

                    {/* Working Stage */}
                    <td className="px-4 py-4 align-top">
                      <StageBadge stage={stage} quotationStatus={row.quotation_status} />
                      <div className="mt-1 text-[11px] text-[#737373]">
                        {isIssued ? (
                          <span className="text-emerald-400">
                            Issued: {formatDate(row.issued_at)}
                          </span>
                        ) : isApproved ? (
                          <span className="text-amber-400">
                            Approved: {formatDate(row.approved_at)} · Ready to issue
                          </span>
                        ) : row.commercial_status === 'pending' ? (
                          <span>Awaiting sales commercial sign-off</span>
                        ) : row.routing_status === 'pending_review' ? (
                          <span>Awaiting plant feasibility sign-off</span>
                        ) : row.revision_id ? (
                          <span>Costing v{row.revision || 1} in draft</span>
                        ) : (
                          <span>Initial RFQ logged</span>
                        )}
                      </div>
                    </td>

                    {/* Quotation & Value */}
                    <td className="px-4 py-4 align-top">
                      {row.quotation_number ? (
                        <div className="font-medium text-[#F5F5F5]">{row.quotation_number}</div>
                      ) : (
                        <div className="text-xs text-[#737373]">No quote generated</div>
                      )}
                      <div className="mt-0.5 text-xs font-semibold text-forge">
                        {formatPrice(row.selling_price)}
                        {row.selling_price && <span className="text-[10px] font-normal text-[#737373]"> / pc</span>}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-4 align-top text-right">
                      <div className="flex flex-col items-end gap-1.5">
                        {isIssued && (
                          <button
                            onClick={() => handleDownloadOrIssue(row)}
                            disabled={isDownloading}
                            className="inline-flex min-h-8 items-center gap-1.5 rounded-md border border-[#292D34] bg-[#181818] px-2.5 py-1 text-xs font-semibold text-[#F5F5F5] hover:border-emerald-500/50 hover:text-emerald-400 transition-colors disabled:opacity-50"
                          >
                            {isDownloading ? (
                              <Loader2 size={13} className="animate-spin text-forge" />
                            ) : (
                              <Download size={13} />
                            )}
                            Download PDF
                          </button>
                        )}

                        {isApproved && (
                          <button
                            onClick={() => handleDownloadOrIssue(row)}
                            disabled={isDownloading}
                            className="inline-flex min-h-8 items-center gap-1.5 rounded-md bg-forge px-2.5 py-1 text-xs font-semibold text-white shadow-sm hover:bg-[#E94B13] transition-colors disabled:opacity-50"
                          >
                            {isDownloading ? (
                              <Loader2 size={13} className="animate-spin text-white" />
                            ) : (
                              <PackageCheck size={13} />
                            )}
                            Issue & Download
                          </button>
                        )}

                        <Link
                          to={`/app/rfqs/${row.rfq_id}/costing`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-forge hover:text-[#E94B13] transition-colors"
                        >
                          Open costing <ArrowRight size={11} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function StageBadge({ stage, quotationStatus }) {
  if (quotationStatus === 'issued' || stage.key === 'issued') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-400">
        <CheckCircle2 size={12} className="shrink-0" />
        Quotation Issued
      </span>
    );
  }

  if (quotationStatus === 'approved' || stage.key === 'approved') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/15 px-2.5 py-1 text-xs font-semibold text-amber-400">
        <Clock size={12} className="shrink-0" />
        Approved (Unissued)
      </span>
    );
  }

  if (stage.key === 'commercial') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/30 bg-purple-500/15 px-2.5 py-1 text-xs font-semibold text-purple-400">
        <BadgeCheck size={12} className="shrink-0" />
        Pending Sales Review
      </span>
    );
  }

  if (stage.key === 'sales_changes' || (stage.key === 'returned' && stage.badgeColor === 'red')) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/15 px-2.5 py-1 text-xs font-semibold text-red-400">
        <AlertCircle size={12} className="shrink-0" />
        Sales Revision Requested
      </span>
    );
  }

  if (stage.key === 'plant_review') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/30 bg-sky-500/15 px-2.5 py-1 text-xs font-semibold text-sky-400">
        <GitPullRequest size={12} className="shrink-0" />
        Pending Plant Review
      </span>
    );
  }

  if (stage.key === 'plant_returned' || (stage.key === 'returned' && stage.badgeColor === 'amber')) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/15 px-2.5 py-1 text-xs font-semibold text-amber-400">
        <AlertCircle size={12} className="shrink-0" />
        Plant Route Returned
      </span>
    );
  }

  if (stage.key === 'costing') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-[#333333] bg-[#202020] px-2.5 py-1 text-xs font-semibold text-[#D4D4D4]">
        <FileEdit size={12} className="shrink-0 text-forge" />
        {stage.label || 'Costing in Progress'}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#292D34] bg-[#181818] px-2.5 py-1 text-xs font-semibold text-[#A3A3A3]">
      <span className="h-1.5 w-1.5 rounded-full bg-[#737373]" />
      RFQ Registered (Draft)
    </span>
  );
}

