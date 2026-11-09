import { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  ClipboardList,
  Clock,
  Download,
  FileCheck2,
  FileEdit,
  FileText,
  GitPullRequest,
  Loader2,
  PackageCheck,
  ShieldAlert,
  ShieldCheck
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { AdminLifecycleTable } from './AdminLifecycleTable.jsx';
import { StatusBadge } from '../../components/data-display/StatusBadge.jsx';
import { ErrorState, LoadingState } from '../../components/feedback/States.jsx';
import { api, downloadFile } from '../../lib/api.js';
import { formatCurrency } from '../../lib/formatters.js';

function formatDate(val) {
  if (!val) return '—';
  try {
    const d = new Date(val);
    return Number.isNaN(d.getTime())
      ? '—'
      : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return '—';
  }
}

export function DashboardPage({ user }) {
  const [data, setData] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const [downloadError, setDownloadError] = useState('');
  const [activeEstimatorTab, setActiveEstimatorTab] = useState('quotations');
  const navigate = useNavigate();

  const loadMetrics = () => {
    api('/dashboard')
      .then(result => setData(result.data))
      .catch(() => setData({ error: true }));
  };

  useEffect(() => {
    loadMetrics();
  }, []);

  async function handleDownloadPdf(quotation) {
    try {
      setDownloadingId(quotation.id);
      setDownloadError('');
      const filename = `${quotation.quotation_number || 'Quotation'}.pdf`;
      await downloadFile(`/quotations/${quotation.id}/pdf`, filename);
    } catch (err) {
      setDownloadError(`Failed to download quotation PDF: ${err.message}`);
    } finally {
      setDownloadingId(null);
    }
  }

  if (!data) return <Page><LoadingState label="Loading workspace…" /></Page>;
  if (data.error) return <Page><ErrorState /></Page>;

  const config = {
    estimator: {
      title: 'Estimator workspace',
      description: 'Authoritative operational overview of your assigned RFQs, active costing workload, and quotation pipeline.',
      metrics: [
        ['Total RFQs', data.total_rfqs ?? data.open ?? 0, ClipboardList, '/app/rfqs'],
        ['Action required', data.action_required ?? 0, AlertCircle, '/app/rfqs?workflow=action_required'],
        ['Draft RFQs', data.draft_rfqs ?? 0, FileEdit, '/app/rfqs?workflow=draft'],
        ['In progress', data.in_progress_rfqs ?? data.awaiting_costing ?? 0, BarChart3, '/app/rfqs?workflow=in_progress'],
        ['Pending plant review', data.pending_plant_review ?? data.awaiting_routing ?? 0, Clock, '/app/rfqs?workflow=pending_plant_review'],
        ['Returned for revision', data.returned_for_revision ?? data.returned_correction ?? 0, ShieldAlert, '/app/rfqs?workflow=returned_for_revision'],
        ['Pending sales approval', data.pending_sales_approval ?? data.awaiting_commercial ?? 0, GitPullRequest, '/app/rfqs?workflow=pending_sales_approval'],
        ['Ready for quote', data.ready_for_quote ?? 0, PackageCheck, '/app/rfqs?workflow=ready_for_quote'],
        ['Issued quotations', data.issued_quotations ?? 0, FileText, '/app/quotations?status=issued']
      ]
    },
    sales_head: {
      title: 'Sales approval workspace',
      description: 'Review plant-approved costing revisions before quotation approval.',
      metrics: [
        ['Pending approval', data.pending_approval, ClipboardList, '/app/commercial-reviews?status=pending'],
        ['High-value approvals', data.high_value, ShieldCheck, '/app/commercial-reviews?highValue=true'],
        ['Approved quotations', data.approved_quotations, ArrowRight, '/app/quotations?status=approved'],
        ['Issued quotations', data.issued_quotations, FileText, '/app/quotations?status=issued'],
        ['Returned quotations', data.returned_quotations, ShieldCheck, '/app/commercial-reviews?status=changes_requested']
      ]
    },
    plant_head: {
      title: 'Plant routing workspace',
      description: 'Review submitted manufacturing routes and return or approve them.',
      metrics: [
        ['Pending routing', data.pending_routing, ClipboardList, '/app/routing-reviews?status=pending_review'],
        ['Overdue reviews', data.overdue_routing, ShieldCheck, '/app/routing-reviews?status=overdue'],
        ['Approved routes', data.approved_routing, ArrowRight, '/app/routing-reviews?status=approved'],
        ['Returned routes', data.routing_issues, BarChart3, '/app/routing-reviews?status=changes_requested']
      ]
    },
    admin: {
      title: 'Administration workspace',
      description: 'System users, rate master schedules, and authoritative quotation activity.',
      metrics: [
        ['Total users', data.total_users, ClipboardList, '/app/users'],
        ['Issued quotations', data.issued_quotations, FileText, '/app/quotations?status=issued'],
        ['Approved quotations', data.approved_quotations, ArrowRight, '/app/quotations?status=approved'],
        ['Current rates', data.current_rates, BarChart3, '/app/rate-masters?effective=current'],
        ['Upcoming rates', data.upcoming_rates, ArrowRight, '/app/rate-masters?effective=upcoming']
      ]
    }
  }[data.role] || {
    title: 'Workspace',
    description: 'System dashboard',
    metrics: []
  };

  const recentQuotations = (data.recent_quotations || data.recent || []).slice(0, 5);
  const recentRfqs = (data.recent_rfqs || []).slice(0, 5);

  return (
    <Page>
      <div className="mb-9 flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <p className="eyebrow mb-2">{new Intl.DateTimeFormat(undefined, { dateStyle: 'long' }).format(new Date())}</p>
          <h1 className="page-title">{config.title}</h1>
          <p className="mt-2 text-sm text-ink-soft">{config.description}</p>
        </div>
        <Link
          className="button button-primary"
          to={
            data.role === 'admin'
              ? '/app/rate-masters'
              : data.role === 'sales_head'
              ? '/app/commercial-reviews'
              : data.role === 'plant_head'
              ? '/app/routing-reviews'
              : '/app/rfqs'
          }
        >
          {data.role === 'admin'
            ? 'Manage rates'
            : data.role === 'sales_head'
            ? 'Review quotations'
            : data.role === 'plant_head'
            ? 'Review routes'
            : 'Register RFQ'}{' '}
          <ArrowRight size={17} />
        </Link>
      </div>

      {downloadError && (
        <div className="mb-6 flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-700">
          <AlertCircle size={18} className="shrink-0" />
          <span>{downloadError}</span>
        </div>
      )}

      {/* Operational KPI Metric Cards */}
      <div className="mb-8 grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3 min-w-0 w-full">
        {config.metrics.map(([label, value, Icon, to]) => (
          <Link
            aria-label={`${label}: ${value ?? 0}`}
            className="panel flex flex-col justify-between p-4 sm:p-5 transition-colors duration-150 hover:border-forge focus-visible:border-forge min-w-0"
            to={to || '/app'}
            key={label}
          >
            <div className="min-w-0">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-medium text-ink-soft truncate">{label}</span>
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-forge/10 border border-line-strong/50 text-forge shrink-0">
                  <Icon size={16} />
                </span>
              </div>
              <strong className="block font-display text-2xl sm:text-3xl font-normal tracking-tight text-ink">
                {value ?? 0}
              </strong>
            </div>
            <span className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-forge">
              View records <ArrowRight size={12} />
            </span>
          </Link>
        ))}
      </div>

      {data.role === 'admin' && (
        <AdminLifecycleTable initialRecords={data.records || data.recent || []} />
      )}

      {/* Estimator Workspace: Recent Quotations & Recent RFQs */}
      {data.role === 'estimator' && (
        <section className="panel p-4 sm:p-6 min-w-0 w-full overflow-hidden">
          <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <button
                  type="button"
                  onClick={() => setActiveEstimatorTab('quotations')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    activeEstimatorTab === 'quotations'
                      ? 'bg-forge text-paper font-semibold shadow-xs'
                      : 'text-ink-soft hover:text-ink hover:bg-surface border border-line'
                  }`}
                >
                  Recent Quotations ({recentQuotations.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveEstimatorTab('rfqs')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    activeEstimatorTab === 'rfqs'
                      ? 'bg-forge text-paper font-semibold shadow-xs'
                      : 'text-ink-soft hover:text-ink hover:bg-surface border border-line'
                  }`}
                >
                  Recent RFQs ({recentRfqs.length})
                </button>
              </div>
              <p className="text-xs text-ink-soft">
                {activeEstimatorTab === 'quotations'
                  ? 'The five most recent commercial quotations generated and issued from your RFQ pipeline.'
                  : 'Your five most recently registered or updated RFQs across all workflow stages.'}
              </p>
            </div>
            <Link
              className="shrink-0 text-sm font-medium text-forge hover:text-forge-hover transition-colors inline-flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-forge"
              to={activeEstimatorTab === 'quotations' ? '/app/quotations' : '/app/rfqs'}
            >
              {activeEstimatorTab === 'quotations' ? 'View all quotations' : 'View RFQ register'}{' '}
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>

          {activeEstimatorTab === 'quotations' && (
            !recentQuotations.length ? (
              <div className="py-12 text-center text-ink-muted">
                <FileCheck2 className="mx-auto text-ink-muted mb-2" size={32} aria-hidden="true" />
                <p className="text-sm font-medium text-ink">No quotations generated yet</p>
                <p className="text-xs text-ink-soft mt-1">
                  Quotations will appear here once approved by the Sales Head and formally issued.
                </p>
              </div>
            ) : (
              <div className="table-scroll">
                <table className="w-full min-w-[780px] text-left text-sm">
                  <caption className="sr-only">Five most recent quotations</caption>
                  <thead className="bg-paper border-b border-line text-xs text-ink-soft">
                    <tr>
                      <th scope="col" className="p-3.5 font-medium">Quotation Number</th>
                      <th scope="col" className="p-3.5 font-medium">RFQ Number</th>
                      <th scope="col" className="p-3.5 font-medium">Customer</th>
                      <th scope="col" className="p-3.5 font-medium">Part Name</th>
                      <th scope="col" className="p-3.5 font-medium">Quotation Amount</th>
                      <th scope="col" className="p-3.5 font-medium">Issued Date</th>
                      <th scope="col" className="p-3.5 font-medium">Current Status</th>
                      <th scope="col" className="p-3.5 font-medium text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {recentQuotations.map(row => {
                      const isIssued = row.status === 'issued';
                      const isDownloading = downloadingId === row.id;
                      const amount = row.total_value || (row.unit_price && row.annual_volume ? Number(row.unit_price) * Number(row.annual_volume) : null) || row.selling_price;

                      return (
                        <tr className="hover:bg-surface transition-colors" key={row.id}>
                          <td className="p-3.5">
                            <Link
                              to="/app/quotations"
                              className="font-medium text-ink hover:text-forge transition-colors focus:outline-none focus:underline"
                              title="Open in Quotation History"
                            >
                              {row.quotation_number}
                            </Link>
                            {row.costing_revision && (
                              <span className="block text-xs text-ink-muted font-mono">
                                Rev v{row.costing_revision}
                              </span>
                            )}
                          </td>
                          <td className="p-3.5">
                            <Link
                              to={row.rfq_id ? `/app/rfqs/${row.rfq_id}/costing` : '/app/rfqs'}
                              className="text-xs text-forge hover:text-forge-hover underline transition-colors focus:outline-none focus:ring-1 focus:ring-forge"
                              title="View costing workspace"
                            >
                              {row.rfq_number}
                            </Link>
                          </td>
                          <td className="p-3.5 text-ink-soft text-xs">
                            {row.customer_name || '—'}
                          </td>
                          <td className="p-3.5 text-ink text-xs font-medium">
                            {row.part_name || '—'}
                          </td>
                          <td className="p-3.5 font-medium text-forge font-mono text-xs">
                            {amount ? formatCurrency(amount) : '—'}
                          </td>
                          <td className="p-3.5 text-xs text-ink-soft whitespace-nowrap">
                            {isIssued ? formatDate(row.issued_at) : 'Pending Issuance'}
                          </td>
                          <td className="p-3.5">
                            <StatusBadge status={row.status} />
                          </td>
                          <td className="p-3.5 text-right whitespace-nowrap">
                            {isIssued ? (
                              <button
                                disabled={isDownloading}
                                onClick={() => handleDownloadPdf(row)}
                                className="inline-flex min-h-8 items-center gap-1.5 rounded-md border border-line bg-paper px-2.5 py-1 text-xs font-medium text-ink hover:border-forge hover:text-forge disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-forge"
                                title="Download official quotation PDF"
                              >
                                {isDownloading ? (
                                  <>
                                    <Loader2 size={13} className="animate-spin" />
                                    <span>Downloading…</span>
                                  </>
                                ) : (
                                  <>
                                    <Download size={13} />
                                    <span>Download PDF</span>
                                  </>
                                )}
                              </button>
                            ) : (
                              <button
                                onClick={() => navigate('/app/quotations')}
                                className="inline-flex min-h-8 items-center gap-1 rounded-md bg-surface px-2.5 py-1 text-xs font-medium text-ink-soft hover:text-ink hover:bg-sunken transition-colors focus:outline-none focus:ring-2 focus:ring-forge"
                                title="View in quotation history"
                              >
                                <span>View details →</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          )}

          {activeEstimatorTab === 'rfqs' && (
            !recentRfqs.length ? (
              <div className="py-12 text-center text-ink-muted">
                <ClipboardList className="mx-auto text-ink-muted mb-2" size={32} aria-hidden="true" />
                <p className="text-sm font-medium text-ink">No RFQs registered yet</p>
                <p className="text-xs text-ink-soft mt-1">
                  Newly created or assigned RFQs will appear here immediately.
                </p>
              </div>
            ) : (
              <div className="table-scroll">
                <table className="w-full min-w-[780px] text-left text-sm">
                  <caption className="sr-only">Five most recent RFQs</caption>
                  <thead className="bg-paper border-b border-line text-xs text-ink-soft">
                    <tr>
                      <th scope="col" className="p-3.5 font-medium">RFQ Number</th>
                      <th scope="col" className="p-3.5 font-medium">Customer</th>
                      <th scope="col" className="p-3.5 font-medium">Part Name</th>
                      <th scope="col" className="p-3.5 font-medium">Created Date</th>
                      <th scope="col" className="p-3.5 font-medium">Due Date</th>
                      <th scope="col" className="p-3.5 font-medium">Current Status</th>
                      <th scope="col" className="p-3.5 font-medium text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {recentRfqs.map(rfq => (
                      <tr className="hover:bg-surface transition-colors" key={rfq.id}>
                        <td className="p-3.5 font-medium text-ink">
                          <Link
                            to={`/app/rfqs/${rfq.id}/costing`}
                            className="font-medium text-ink hover:text-forge transition-colors focus:outline-none focus:underline"
                            title="Open costing workspace"
                          >
                            {rfq.rfq_number}
                          </Link>
                        </td>
                        <td className="p-3.5 text-ink-soft text-xs">
                          {rfq.customer_name || '—'}
                        </td>
                        <td className="p-3.5 text-ink text-xs font-medium">
                          {rfq.part_name || '—'}
                        </td>
                        <td className="p-3.5 text-xs text-ink whitespace-nowrap font-medium">
                          {formatDate(rfq.created_at)}
                        </td>
                        <td className="p-3.5 text-xs text-ink-soft whitespace-nowrap">
                          {formatDate(rfq.due_date)}
                        </td>
                        <td className="p-3.5">
                          <StatusBadge status={rfq.status} />
                        </td>
                        <td className="p-3.5 text-right whitespace-nowrap">
                          <button
                            onClick={() => navigate(`/app/rfqs/${rfq.id}/costing`)}
                            className="inline-flex min-h-8 items-center gap-1 rounded-md bg-surface px-2.5 py-1 text-xs font-medium text-forge hover:text-forge-hover hover:bg-sunken transition-colors focus:outline-none focus:ring-2 focus:ring-forge"
                          >
                            <span>
                              {rfq.status === 'draft'
                                ? 'Start costing →'
                                : rfq.status === 'in_progress'
                                ? 'Continue costing →'
                                : rfq.status === 'pending_plant_review'
                                ? 'View submission →'
                                : rfq.status === 'returned_for_revision'
                                ? 'Revise costing →'
                                : 'View details →'}
                            </span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </section>
      )}
    </Page>
  );
}

function Page({ children }) {
  return <main className="mx-auto w-full max-w-7xl px-3.5 py-4 sm:p-6 md:p-8 lg:p-10 text-ink min-w-0">{children}</main>;
}
