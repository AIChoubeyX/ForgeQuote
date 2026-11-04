import { useEffect, useState } from 'react';
import { ArrowRight, BarChart3, ClipboardList, FileText, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { RfqTable } from '../../components/data-display/RfqTable.jsx';
import { AdminLifecycleTable } from './AdminLifecycleTable.jsx';
import { ErrorState, LoadingState } from '../../components/feedback/States.jsx';
import { api } from '../../lib/api.js';

export function DashboardPage() {
  const [data, setData] = useState(null);
  useEffect(() => {
    api('/dashboard')
      .then(result => setData(result.data))
      .catch(() => setData({ error: true }));
  }, []);

  if (!data) return <Page><LoadingState label="Loading workspace…" /></Page>;
  if (data.error) return <Page><ErrorState /></Page>;

  const config = {
    estimator: {
      title: 'Estimator workspace',
      description: 'Your assigned RFQs, costing workload, and quotation pipeline.',
      metrics: [
        ['Open RFQs', data.open, ClipboardList, '/app/rfqs?workflow=open'],
        ['Costings in progress', data.awaiting_costing, BarChart3, '/app/rfqs?workflow=costing'],
        ['Pending plant review', data.awaiting_routing, ArrowRight, '/app/rfqs?workflow=plant_review'],
        ['Returned for correction', data.returned_correction, ShieldCheck, '/app/rfqs?workflow=returned'],
        ['Pending sales review', data.awaiting_commercial, BarChart3, '/app/rfqs?workflow=commercial'],
        ['Issued quotations', data.issued_quotations, FileText, '/app/quotations?status=issued']
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

  return (
    <Page>
      <div className="mb-9 flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <p className="eyebrow mb-2">{new Intl.DateTimeFormat(undefined, { dateStyle: 'long' }).format(new Date())}</p>
          <h1 className="page-title">{config.title}</h1>
          <p className="mt-2 text-sm text-[#A3A3A3]">{config.description}</p>
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

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {config.metrics.map(([label, value, Icon, to]) => (
          <Link
            aria-label={`${label}: ${value ?? 0}`}
            className="panel flex flex-col justify-between p-5 transition-colors duration-150 hover:border-forge focus-visible:border-forge"
            to={to || '/app'}
            key={label}
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#A3A3A3]">{label}</span>
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#FF5A1F]/10 border border-[#66301C]/50 text-forge">
                  <Icon size={16} />
                </span>
              </div>
              <strong className="block font-display text-3xl font-bold tracking-tight text-[#F5F5F5]">
                {value ?? 0}
              </strong>
            </div>
            <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-forge">
              View records <ArrowRight size={12} />
            </span>
          </Link>
        ))}
      </div>

      {data.role === 'admin' && (
        <AdminLifecycleTable initialRecords={data.records || data.recent || []} />
      )}

      {data.role === 'estimator' && (
        <section className="panel p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="font-display text-lg font-semibold text-[#F5F5F5]">Recent assigned RFQs</h2>
              <p className="mt-1 text-sm text-[#A3A3A3]">Latest RFQ files and costing revisions assigned to you.</p>
            </div>
            <Link className="shrink-0 text-sm font-semibold text-forge hover:text-[#E94B13] transition-colors" to="/app/rfqs">
              View all →
            </Link>
          </div>
          <RfqTable rows={data.recent} />
        </section>
      )}
    </Page>
  );
}

function Page({ children }) {
  return <main className="mx-auto max-w-7xl p-5 md:p-8 lg:p-10 text-[#F5F5F5]">{children}</main>;
}
