import { useEffect, useState } from 'react';
import { ClipboardList } from 'lucide-react';
import { RfqTable } from '../../components/data-display/RfqTable.jsx';
import { EmptyState, ErrorState, LoadingState } from '../../components/feedback/States.jsx';
import { api } from '../../lib/api.js';
import { RfqForm } from './RfqForm.jsx';
import { useNavigate } from 'react-router-dom';

export function RfqsPage() {
  const [data, setData] = useState(null); const [search, setSearch] = useState(''); const [status, setStatus] = useState(''); const [selected, setSelected] = useState(null); const [showForm, setShowForm] = useState(false); const navigate = useNavigate();
  const load = () => api(`/rfqs?search=${encodeURIComponent(search)}&status=${status}`).then(setData).catch(() => setData({ error: true }));
  useEffect(() => { load(); }, [search, status]);
  async function edit(id) { const result = await api(`/rfqs/${id}`); setSelected(result.data); setShowForm(true); }
  return <main className="mx-auto max-w-6xl p-5 md:p-10"><div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="mb-2 text-xs font-bold uppercase tracking-[.14em] text-forge">Operations</p><h1 className="font-display text-4xl font-semibold text-navy">RFQ register</h1><p className="mt-2 text-sm text-slate-500">Search and track every customer request.</p></div><button className="button button-primary" onClick={() => { setSelected(null); setShowForm(!showForm); }}>{showForm ? 'Close form' : '+ New RFQ'}</button></div>{showForm && <RfqForm rfq={selected} onCancel={() => setShowForm(false)} onSaved={() => { setShowForm(false); setSelected(null); load(); }} />}<div className="mb-5 flex gap-3"><input className="field m-0 max-w-sm" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search RFQ, customer, or part…" /><select className="field m-0 max-w-48" value={status} onChange={event => setStatus(event.target.value)}><option value="">All statuses</option><option value="draft">Draft</option><option value="in_progress">In progress</option><option value="ready_for_quote">Ready to quote</option><option value="quoted">Quoted</option></select></div><section className="panel">{!data ? <LoadingState label="Loading RFQs…" /> : data.error ? <ErrorState /> : data.data.length ? <RfqTable rows={data.data} onSelect={edit} onCosting={id => navigate(`/app/rfqs/${id}/costing`)} /> : <EmptyState title="No RFQs found" message="Try a different search or create your first request." />}</section></main>;
}
