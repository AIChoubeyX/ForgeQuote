import { useEffect, useState } from 'react';
import { ArrowRight, Plus, Trash2 } from 'lucide-react';
import { api } from '../../lib/api.js';
import { ErrorState, LoadingState } from '../../components/feedback/States.jsx';
import { AiReviewPanel } from '../../components/ai/AiReviewPanel.jsx';

const initialOperation = { sequence: 1, operationName: '', machineCode: 'MACHINE-REAR-SPINDLE', cycleTimeMinutes: '10' };
const initial = { costingDate: new Date().toISOString().slice(0, 10), materialRateCode: 'MATERIAL-AL6061', materialWeight: '', scrapRateCode: 'SCRAP-DEFAULT', overheadRateCode: 'OVERHEAD-DEFAULT', packingRateCode: 'PACKING-DEFAULT', freightRateCode: 'FREIGHT-DEFAULT', marginRateCode: 'MARGIN-DEFAULT', operations: [initialOperation] };

export function CostingPage({ rfqId, canEdit = true }) {
  const [data, setData] = useState(null);
  const [form, setForm] = useState(initial);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const load = () => api(`/costing/rfqs/${rfqId}`).then(result => {
    setData(result.data);
    if (result.data.revision?.inputs) setForm(result.data.revision.inputs);
  }).catch(err => setError(err.message));
  useEffect(() => { load(); }, [rfqId]);
  function update(key, value) { setForm({ ...form, [key]: value }); }
  function updateOperation(index, key, value) {
    update('operations', form.operations.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item));
  }
  async function save() {
    setError(''); setMessage('');
    try {
      await api(`/costing/rfqs/${rfqId}/drafts`, { method: 'POST', body: JSON.stringify({ ...form, materialWeight: form.materialWeight || data.part.gross_weight }) });
      setMessage('Draft costing saved with rate versions captured.');
      await load();
    } catch (err) { setError(err.message); }
  }
  async function submit() {
    setError(''); setMessage('');
    if (!data.revision) { setError('Save the costing draft before submitting.'); return; }
    try { await api(`/costing/${data.revision.id}/submit`, { method: 'POST' }); setMessage('Route submitted for plant-head review.'); await load(); }
    catch (err) { setError(err.message); }
  }
  if (!data && !error) return <main className="mx-auto max-w-6xl p-5 md:p-10"><LoadingState label="Loading costing workspace…" /></main>;
  if (error && !data) return <main className="mx-auto max-w-6xl p-5 md:p-10"><ErrorState message={error} /></main>;
  const calculations = data.revision?.calculations;
  const status = data.revision?.status;
  const isLocked = !canEdit || status === 'pending_review' || status === 'approved';
  const isReturned = status === 'changes_requested';
  return <main className="mx-auto max-w-6xl p-5 md:p-10 text-[#F5F5F5]">
    <div className="mb-8"><p className="mb-2 text-xs font-bold uppercase tracking-[.14em] text-forge">Estimator costing</p><h1 className="font-display text-4xl font-semibold text-[#F5F5F5]">{data.part.rfq_number} · {data.part.name}</h1><p className="mt-2 text-sm text-[#A3A3A3]">{data.part.customer_name} · {data.part.material} · {data.part.gross_weight} kg · annual volume {data.part.annual_volume}</p></div>
    {error && <div className="mb-4 rounded-lg border border-[#EF4444]/30 bg-[#EF4444]/10 p-3 text-sm text-[#EF4444]">{error}</div>}
    {message && <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-400">{message}</div>}
    {isLocked && <div className="mb-4 rounded-lg border border-[#292D34] bg-[#111111] p-3 text-sm text-[#A3A3A3]">{!canEdit ? 'This costing is read-only for your role.' : `This costing revision is ${status.replace('_', ' ')} and is read-only. A submitted revision cannot be overwritten.`}</div>}
    {isReturned && <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-300">This route was returned for revision. Saving creates a new costing revision and preserves the previous review.</div>}
    <div className="grid gap-6 lg:grid-cols-[1.4fr_.9fr]">
      <section className="panel">
        <div className="mb-5 flex items-center justify-between"><div><h2 className="font-display text-lg font-semibold text-[#F5F5F5]">Costing inputs</h2><p className="text-sm text-[#A3A3A3]">Rates are resolved on the costing date and stored by revision.</p></div><span className="rounded-full bg-[#111111] border border-[#292D34] px-3 py-1 text-xs capitalize text-[#A3A3A3]">{status || 'draft'}</span></div>
        <div className="grid gap-4 md:grid-cols-2">{[['Costing date','costingDate'],['Material rate code','materialRateCode'],['Material weight (kg)','materialWeight'],['Scrap rate code','scrapRateCode'],['Overhead rate code','overheadRateCode'],['Packing rate code','packingRateCode'],['Freight rate code','freightRateCode'],['Margin rate code','marginRateCode']].map(([label, key]) => <label className="text-sm font-semibold text-[#F5F5F5]" key={key}>{label}<input disabled={isLocked} className="field" type={key === 'costingDate' ? 'date' : key === 'materialWeight' ? 'number' : 'text'} min={key === 'materialWeight' ? '0.001' : undefined} step={key === 'materialWeight' ? '0.001' : undefined} value={form[key]} placeholder={key === 'materialWeight' ? String(data.part.gross_weight) : ''} onChange={event => update(key, event.target.value)} /></label>)}</div>
        <div className="mt-6"><div className="mb-3 flex items-center justify-between"><h3 className="font-display font-semibold text-[#F5F5F5]">Manufacturing operations</h3><button disabled={isLocked} className="button border border-[#292D34] bg-[#181818] text-[#A3A3A3] hover:text-forge hover:border-forge transition-colors" type="button" onClick={() => update('operations', [...form.operations, { ...initialOperation, sequence: form.operations.length + 1 }])}><Plus size={15} />Add operation</button></div>{form.operations.map((operation, index) => <div className="mb-3 grid gap-2 rounded-lg border border-[#292D34] bg-[#111111] p-3 md:grid-cols-[60px_1fr_1fr_120px_35px]" key={index}><input disabled={isLocked} className="field m-0" type="number" min="1" value={operation.sequence} aria-label="Sequence" onChange={event => updateOperation(index, 'sequence', Number(event.target.value))} /><input disabled={isLocked} className="field m-0" placeholder="Operation name" aria-label="Operation name" value={operation.operationName} onChange={event => updateOperation(index, 'operationName', event.target.value)} /><input disabled={isLocked} className="field m-0" placeholder="Machine rate code" aria-label="Machine rate code" value={operation.machineCode} onChange={event => updateOperation(index, 'machineCode', event.target.value)} /><input disabled={isLocked} className="field m-0" type="number" min="0.001" step="0.001" placeholder="Minutes" aria-label="Cycle time minutes" value={operation.cycleTimeMinutes} onChange={event => updateOperation(index, 'cycleTimeMinutes', event.target.value)} /><button disabled={isLocked} className="text-[#737373] hover:text-[#EF4444] transition-colors" type="button" aria-label="Remove operation" onClick={() => update('operations', form.operations.filter((_, itemIndex) => itemIndex !== index))}><Trash2 size={16} /></button></div>)}</div>
        <div className="mt-5 flex gap-3">{!isLocked && <button className="button button-primary" type="button" onClick={save}>Save draft <ArrowRight size={16} /></button>}{!isLocked && status === 'draft' && <button className="button border border-[#292D34] bg-[#181818] text-[#A3A3A3] hover:text-[#F5F5F5] hover:border-[#737373]" type="button" onClick={submit}>Submit route for review</button>}</div>
      </section>
      <aside className="space-y-6">
        <AiReviewPanel
          feature="costing"
          reviewType="costing_review"
          rfqId={rfqId}
          costingRevisionId={data.revision?.id}
          context={data.revision}
          contextEndpoint={data.revision ? `/costing/${data.revision.id}/ai-context` : null}
        />
        <section className="panel"><h2 className="mb-4 font-display text-lg font-semibold text-[#F5F5F5]">Cost breakdown</h2>{calculations ? <><div className="space-y-2 text-sm">{Object.entries(calculations.components).map(([key, value]) => <div className="flex justify-between border-b border-[#292D34] py-2" key={key}><span className="capitalize text-[#A3A3A3]">{key.replace(/([A-Z])/g, ' $1')}</span><strong className="text-[#F5F5F5]">{value}</strong></div>)}</div><h3 className="mb-3 mt-6 font-display font-semibold text-[#F5F5F5]">Annual scenarios</h3><div className="table-scroll" tabIndex={0} role="region" aria-label="Annual costing scenarios. Scroll horizontally for more columns."><table className="w-full text-left text-xs"><thead className="border-b border-[#292D34] text-[#737373]"><tr><th className="py-2">Volume</th><th className="py-2">Annual cost</th><th className="py-2">Selling value</th></tr></thead><tbody>{calculations.scenarios.map(row => <tr className="border-t border-[#292D34]" key={row.annualVolume}><td className="py-2 text-[#A3A3A3]">{row.annualVolume}</td><td className="py-2 text-[#F5F5F5]">{row.annualCost}</td><td className="py-2 text-forge font-semibold">{row.annualSellingValue}</td></tr>)}</tbody></table></div></> : <p className="text-sm text-[#737373]">Save a complete draft to calculate the breakdown.</p>}</section>{data.revision?.review_comment && <section className="panel"><h2 className="mb-2 font-display font-semibold text-[#F5F5F5]">Plant-head comment</h2><p className="text-sm text-[#A3A3A3]">{data.revision.review_comment}</p></section>}</aside>
    </div>
  </main>;
}
