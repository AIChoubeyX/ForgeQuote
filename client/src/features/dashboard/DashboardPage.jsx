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
  const metrics = [['Open RFQs', data.open, ClipboardList], ['Due in 7 days', data.due_soon, ShieldCheck], ['Ready to quote', data.pending_approval, BarChart3], ['Quotes sent', data.quoted, ArrowRight]];
  return <Page><div className="mb-9 flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="mb-2 text-xs font-bold uppercase tracking-[.14em] text-forge">Monday, 02 November 2026</p><h1 className="font-display text-4xl font-semibold text-navy">Good morning.</h1><p className="mt-2 text-sm text-slate-500">Here is the pulse of your quotation workspace.</p></div><Link className="button button-primary" to="/app/rfqs">View RFQ register <ArrowRight size={17} /></Link></div><div className="mb-7 grid grid-cols-2 gap-4 lg:grid-cols-4">{metrics.map(([label, value, Icon]) => <div className="panel" key={label}><Icon className="mb-5 text-forge" size={18} /><strong className="block font-display text-3xl text-navy">{value}</strong><span className="text-sm text-slate-500">{label}</span></div>)}</div><section className="panel"><div className="mb-5 flex items-start justify-between"><div><h2 className="font-display text-lg font-semibold text-navy">Recent RFQs</h2><p className="mt-1 text-sm text-slate-500">Latest work across your team</p></div><Link className="text-sm font-semibold text-forge" to="/app/rfqs">View all →</Link></div><RfqTable rows={data.recent} /></section></Page>;
}
function Page({ children }) { return <main className="mx-auto max-w-6xl p-5 md:p-10">{children}</main>; }
