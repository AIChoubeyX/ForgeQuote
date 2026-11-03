import { useEffect, useState } from 'react';
import { ArrowRight, BarChart3, ClipboardList, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { RfqTable } from '../../components/data-display/RfqTable.jsx';
import { ErrorState, LoadingState } from '../../components/feedback/States.jsx';
import { api } from '../../lib/api.js';

export function DashboardPage() {
  const [data, setData] = useState(null);
  useEffect(() => { api('/dashboard').then(result => setData(result.data)).catch(() => setData({ error: true })); }, []);
  if (!data) return <Page><LoadingState label="Loading workspace…" /></Page>;
  if (data.error) return <Page><ErrorState /></Page>;
  const config = {
    estimator: { title: 'Estimator workspace', description: 'Your assigned RFQs and costing workload.', metrics: [['My open RFQs', data.open, ClipboardList], ['Overdue', data.overdue, ShieldCheck], ['Awaiting costing', data.awaiting_costing, BarChart3], ['Awaiting routing', data.awaiting_routing, ArrowRight]] },
    sales_head: { title: 'Sales approval workspace', description: data.state === 'quotation_workflow_pending' ? 'Quotation approval records are not implemented in this phase.' : 'Commercial review queue.', metrics: [['Pending approval', data.pending_approval, ClipboardList], ['High-value approvals', data.high_value, ShieldCheck], ['Approved and sent', data.approved_sent, ArrowRight]] },
    plant_head: { title: 'Plant routing workspace', description: 'Routing review will appear here when the routing workflow is enabled.', metrics: [['Pending routing', data.pending_routing, ClipboardList], ['Overdue reviews', data.overdue_routing, ShieldCheck], ['Routing issues', data.routing_issues, BarChart3]] },
    admin: { title: 'Administration workspace', description: 'System users and reference data administration.', metrics: [['Total users', data.total_users, ClipboardList], ['Active users', data.active_users, ShieldCheck], ['Current rates', data.current_rates, BarChart3], ['Upcoming rates', data.upcoming_rates, ArrowRight]] }
  }[data.role];
  return <Page><div className="mb-9 flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="mb-2 text-xs font-bold uppercase tracking-[.14em] text-forge">Monday, 02 November 2026</p><h1 className="font-display text-4xl font-semibold text-navy">{config.title}</h1><p className="mt-2 text-sm text-slate-500">{config.description}</p></div><Link className="button button-primary" to={data.role === 'admin' ? '/app/rate-masters' : '/app/rfqs'}>{data.role === 'admin' ? 'Manage rates' : 'View RFQ register'} <ArrowRight size={17} /></Link></div><div className="mb-7 grid grid-cols-2 gap-4 lg:grid-cols-4">{config.metrics.map(([label, value, Icon]) => <div className="panel" key={label}><Icon className="mb-5 text-forge" size={18} /><strong className="block font-display text-3xl text-navy">{value ?? 0}</strong><span className="text-sm text-slate-500">{label}</span></div>)}</div>{data.state !== 'ready' && <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">This dashboard shows only data currently supported by the implemented schema and workflow.</div>}{data.role === 'estimator' && <section className="panel"><div className="mb-5 flex items-start justify-between"><div><h2 className="font-display text-lg font-semibold text-navy">Recent assigned RFQs</h2><p className="mt-1 text-sm text-slate-500">Latest work assigned to you.</p></div><Link className="text-sm font-semibold text-forge" to="/app/rfqs">View all →</Link></div><RfqTable rows={data.recent} /></section>}</Page>;
}
function Page({ children }) { return <main className="mx-auto max-w-6xl p-5 md:p-10">{children}</main>; }
