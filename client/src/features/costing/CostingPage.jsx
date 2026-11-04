import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, Clock, Plus, ShieldAlert, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api.js';
import { ErrorState, LoadingState } from '../../components/feedback/States.jsx';
import { AiReviewPanel } from '../../components/ai/AiReviewPanel.jsx';

const initialOperation = { sequence: 1, operationName: '', machineCode: 'MACHINE-REAR-SPINDLE', cycleTimeMinutes: '10' };
const initial = {
  costingDate: new Date().toISOString().slice(0, 10),
  materialRateCode: 'MATERIAL-AL6061',
  materialWeight: '',
  scrapRateCode: 'SCRAP-DEFAULT',
  overheadRateCode: 'OVERHEAD-DEFAULT',
  packingRateCode: 'PACKING-DEFAULT',
  freightRateCode: 'FREIGHT-DEFAULT',
  marginRateCode: 'MARGIN-DEFAULT',
  operations: [initialOperation]
};

export function CostingPage({ rfqId, canEdit = true }) {
  const [data, setData] = useState(null);
  const [form, setForm] = useState(initial);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = () =>
    api(`/costing/rfqs/${rfqId}`)
      .then(result => {
        setData(result.data);
        if (result.data.revision?.inputs) setForm(result.data.revision.inputs);
      })
      .catch(err => setError(err.message));

  useEffect(() => {
    load();
  }, [rfqId]);

  function update(key, value) {
    setForm(current => ({ ...current, [key]: value }));
  }

  function updateOperation(index, key, value) {
    setForm(current => ({
      ...current,
      operations: current.operations.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item
      )
    }));
  }

  async function save() {
    setError('');
    setMessage('');
    try {
      await api(`/costing/rfqs/${rfqId}/drafts`, {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          materialWeight: form.materialWeight || data.part.gross_weight
        })
      });
      setMessage('Draft costing saved with immutable rate snapshots.');
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function submit() {
    setError('');
    setMessage('');
    if (!data.revision) {
      setError('Save the costing draft before submitting for review.');
      return;
    }
    try {
      await api(`/costing/${data.revision.id}/submit`, { method: 'POST' });
      setMessage('Manufacturing route submitted for Plant Head review.');
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  if (!data && !error) {
    return (
      <main className="mx-auto w-full max-w-7xl px-3.5 py-4 sm:p-6 md:p-8 lg:p-10 min-w-0">
        <LoadingState label="Loading costing workspace…" />
      </main>
    );
  }

  if (error && !data) {
    return (
      <main className="mx-auto w-full max-w-7xl px-3.5 py-4 sm:p-6 md:p-8 lg:p-10 min-w-0">
        <ErrorState message={error} />
      </main>
    );
  }

  const calculations = data.revision?.calculations;
  const status = data.revision?.status;
  const isLocked = !canEdit || status === 'pending_review' || status === 'approved';
  const isReturned = status === 'changes_requested';

  return (
    <main className="mx-auto w-full max-w-7xl px-3.5 py-4 sm:p-6 md:p-8 lg:p-10 text-[#F5F5F5] min-w-0">
      {/* Top Navigation & Breadcrumb */}
      <div className="mb-6">
        <Link
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-forge hover:text-[#E94B13] transition-colors"
          to="/app/rfqs"
        >
          <ArrowLeft size={14} /> Back to RFQ register
        </Link>

        <div className="mt-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-end min-w-0">
          <div className="min-w-0 flex-1">
            <p className="eyebrow mb-1">Cost Estimation Workspace</p>
            <h1 className="font-display text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-[#F5F5F5] break-words">
              {data.part.rfq_number} · {data.part.name}
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-[#A3A3A3] leading-relaxed break-words">
              Customer: <strong className="text-[#F5F5F5]">{data.part.customer_name}</strong> · Material:{' '}
              <strong className="text-[#F5F5F5]">{data.part.material}</strong> · Gross:{' '}
              <strong className="text-[#F5F5F5]">{data.part.gross_weight} kg</strong> · Annual Volume:{' '}
              <strong className="text-[#F5F5F5]">{Number(data.part.annual_volume).toLocaleString()} pcs</strong>
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                status === 'approved'
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : status === 'pending_review'
                  ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30'
                  : status === 'changes_requested'
                  ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                  : 'bg-[#181818] text-[#A3A3A3] border border-[#292D34]'
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  status === 'approved'
                    ? 'bg-emerald-400'
                    : status === 'pending_review'
                    ? 'bg-orange-400'
                    : status === 'changes_requested'
                    ? 'bg-rose-400'
                    : 'bg-[#737373]'
                }`}
              />
              Revision {data.revision?.revision ? `v${data.revision.revision}` : 'Draft'} ·{' '}
              {status ? status.replace('_', ' ') : 'Draft'}
            </span>
          </div>
        </div>
      </div>

      {/* Notifications and Lifecycle Alerts */}
      {error && (
        <div className="mb-5 rounded-lg border border-[#EF4444]/30 bg-[#EF4444]/10 p-3.5 text-sm text-[#EF4444]">
          {error}
        </div>
      )}

      {message && (
        <div className="mb-5 flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-sm text-emerald-400">
          <CheckCircle2 size={16} className="shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {isReturned && (
        <div className="mb-5 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-xs sm:text-sm text-amber-300">
          <div className="flex items-start gap-2.5">
            <ShieldAlert size={18} className="text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="block text-[#F5F5F5] font-semibold mb-1">
                Plant Head Requested Revision
              </strong>
              {data.revision?.review_comment && (
                <p className="rounded bg-[#111111] p-2.5 my-1.5 text-amber-200 border border-amber-500/30 font-medium">
                  &ldquo;{data.revision.review_comment}&rdquo;
                </p>
              )}
              <span className="text-[#A3A3A3] block text-xs">
                Saving your changes will create a new immutable costing revision while preserving the full review history.
              </span>
            </div>
          </div>
        </div>
      )}

      {isLocked && !isReturned && (
        <div className="mb-5 rounded-lg border border-[#292D34] bg-[#111111] p-3.5 text-xs text-[#A3A3A3]">
          {!canEdit
            ? 'This costing is currently read-only for your user role.'
            : `This costing revision is currently ${status.replace('_', ' ')} and is locked against modifications to maintain rate auditability.`}
        </div>
      )}

      {/* Two-Column Responsive Layout */}
      <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr] lg:items-start min-w-0 w-full">
        
        {/* PRIMARY WORKSPACE: Inputs & Operations */}
        <div className="space-y-6 min-w-0 w-full">
          <section className="panel min-w-0 w-full">
            <div className="flex items-center justify-between pb-3 border-b border-[#292D34] mb-5">
              <div>
                <h2 className="font-display text-base sm:text-lg font-semibold text-[#F5F5F5]">
                  Costing Inputs & Rate Masters
                </h2>
                <p className="mt-0.5 text-xs text-[#737373]">
                  Rates resolve against the costing date and are permanently captured with the revision.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 min-w-0 w-full">
              {[
                ['Costing date', 'costingDate'],
                ['Material rate code', 'materialRateCode'],
                ['Material weight (kg)', 'materialWeight'],
                ['Scrap recovery code', 'scrapRateCode'],
                ['Overhead rate code', 'overheadRateCode'],
                ['Packing rate code', 'packingRateCode'],
                ['Freight rate code', 'freightRateCode'],
                ['Margin rate code', 'marginRateCode']
              ].map(([label, key]) => (
                <label className="block text-xs font-semibold text-[#F5F5F5]" key={key}>
                  {label}
                  <input
                    disabled={isLocked}
                    className="field mt-1"
                    type={key === 'costingDate' ? 'date' : key === 'materialWeight' ? 'number' : 'text'}
                    min={key === 'materialWeight' ? '0.001' : undefined}
                    step={key === 'materialWeight' ? '0.001' : undefined}
                    value={form[key]}
                    placeholder={key === 'materialWeight' ? String(data.part.gross_weight) : ''}
                    onChange={event => update(key, event.target.value)}
                  />
                </label>
              ))}
            </div>

            {/* Manufacturing Operations Section */}
            <div className="mt-8 pt-6 border-t border-[#292D34]">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <div>
                  <h3 className="font-display text-base font-semibold text-[#F5F5F5]">
                    Manufacturing Operations Route
                  </h3>
                  <p className="text-xs text-[#737373]">
                    Sequential machining, finishing, and quality operations inspected by the Plant Head.
                  </p>
                </div>
                {!isLocked && (
                  <button
                    className="button border border-[#292D34] bg-[#111111] text-[#F5F5F5] hover:border-forge hover:text-forge text-xs py-2 px-3 shrink-0"
                    type="button"
                    onClick={() =>
                      update('operations', [
                        ...form.operations,
                        { ...initialOperation, sequence: form.operations.length + 1 }
                      ])
                    }
                  >
                    <Plus size={14} className="text-forge" />
                    <span>Add operation</span>
                  </button>
                )}
              </div>

              {/* Operations Table Header on Desktop */}
              <div className="hidden md:grid md:grid-cols-[60px_1.5fr_1.5fr_110px_40px] gap-2 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#737373] bg-[#111111] rounded-t-lg border border-[#292D34] border-b-0">
                <span>Seq</span>
                <span>Operation Name</span>
                <span>Machine Code</span>
                <span>Cycle (Min)</span>
                <span className="text-right">Act</span>
              </div>

              {/* Operations List */}
              <div className="space-y-2">
                {form.operations.map((operation, index) => (
                  <div
                    className="rounded-lg border border-[#292D34] bg-[#111111] p-3 text-xs md:grid md:grid-cols-[60px_1.5fr_1.5fr_110px_40px] md:items-center md:gap-2"
                    key={index}
                  >
                    {/* Seq */}
                    <div className="mb-2 md:mb-0">
                      <span className="text-[10px] uppercase font-bold text-[#737373] md:hidden block">Seq</span>
                      <input
                        disabled={isLocked}
                        className="field m-0"
                        type="number"
                        min="1"
                        value={operation.sequence}
                        aria-label="Sequence"
                        onChange={event => updateOperation(index, 'sequence', Number(event.target.value))}
                      />
                    </div>

                    {/* Operation Name */}
                    <div className="mb-2 md:mb-0">
                      <span className="text-[10px] uppercase font-bold text-[#737373] md:hidden block">Operation Name</span>
                      <input
                        disabled={isLocked}
                        className="field m-0"
                        placeholder="Operation name"
                        aria-label="Operation name"
                        value={operation.operationName}
                        onChange={event => updateOperation(index, 'operationName', event.target.value)}
                      />
                    </div>

                    {/* Machine Code */}
                    <div className="mb-2 md:mb-0">
                      <span className="text-[10px] uppercase font-bold text-[#737373] md:hidden block">Machine Rate Code</span>
                      <input
                        disabled={isLocked}
                        className="field m-0"
                        placeholder="Machine rate code"
                        aria-label="Machine rate code"
                        value={operation.machineCode}
                        onChange={event => updateOperation(index, 'machineCode', event.target.value)}
                      />
                    </div>

                    {/* Cycle Time */}
                    <div className="mb-2 md:mb-0">
                      <span className="text-[10px] uppercase font-bold text-[#737373] md:hidden block">Minutes</span>
                      <input
                        disabled={isLocked}
                        className="field m-0"
                        type="number"
                        min="0.001"
                        step="0.001"
                        placeholder="Minutes"
                        aria-label="Cycle time minutes"
                        value={operation.cycleTimeMinutes}
                        onChange={event => updateOperation(index, 'cycleTimeMinutes', event.target.value)}
                      />
                    </div>

                    {/* Remove Action */}
                    <div className="flex justify-end pt-1 md:pt-0">
                      <button
                        disabled={isLocked || form.operations.length <= 1}
                        className="p-2 text-[#737373] hover:text-[#EF4444] disabled:opacity-30 transition-colors"
                        type="button"
                        aria-label={`Remove operation ${operation.sequence}`}
                        onClick={() =>
                          update(
                            'operations',
                            form.operations.filter((_, itemIndex) => itemIndex !== index)
                          )
                        }
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            {!isLocked && (
              <div className="mt-8 pt-5 border-t border-[#292D34] flex flex-wrap items-center gap-3">
                <button className="button button-primary" type="button" onClick={save}>
                  <span>Save costing draft</span>
                  <ArrowRight size={16} />
                </button>
                {status === 'draft' && (
                  <button
                    className="button border border-[#292D34] bg-[#111111] text-[#F5F5F5] hover:border-forge hover:text-forge"
                    type="button"
                    onClick={submit}
                  >
                    Submit route for review
                  </button>
                )}
              </div>
            )}
          </section>
        </div>

        {/* SUPPORTING COLUMN: AI Review, Cost Breakdown & Scenarios */}
        <aside className="space-y-6 min-w-0 w-full">
          {/* AI Review Assistance Panel */}
          <AiReviewPanel
            feature="costing"
            reviewType="costing_review"
            rfqId={rfqId}
            costingRevisionId={data.revision?.id}
            context={data.revision}
            contextEndpoint={data.revision ? `/costing/${data.revision.id}/ai-context` : null}
          />

          {/* Cost Breakdown Panel */}
          <section className="panel min-w-0 w-full">
            <div className="flex items-center justify-between pb-3 border-b border-[#292D34] mb-4">
              <h2 className="font-display text-base font-semibold text-[#F5F5F5]">
                Cost Breakdown
              </h2>
              {calculations && (
                <span className="text-xs font-mono font-bold text-forge">
                  {calculations.components?.sellingPrice ? `₹${calculations.components.sellingPrice}` : 'Calculated'}
                </span>
              )}
            </div>

            {calculations ? (
              <>
                <div className="space-y-2 text-xs">
                  {Object.entries(calculations.components).map(([key, value]) => {
                    const isSellingPrice = key === 'sellingPrice';
                    const isMargin = key.toLowerCase().includes('margin');
                    const isScrap = key.toLowerCase().includes('scrap');
                    return (
                      <div
                        className={`flex justify-between py-2 border-b border-[#292D34]/50 items-center ${
                          isSellingPrice ? 'pt-3 border-t-2 border-[#292D34] font-bold text-sm text-forge' : ''
                        }`}
                        key={key}
                      >
                        <span className={`capitalize ${isSellingPrice ? 'text-[#F5F5F5]' : 'text-[#A3A3A3]'}`}>
                          {key.replace(/([A-Z])/g, ' $1')}
                        </span>
                        <strong
                          className={`font-mono ${
                            isSellingPrice
                              ? 'text-base font-bold text-forge'
                              : isScrap
                              ? 'text-emerald-400'
                              : isMargin
                              ? 'text-forge'
                              : 'text-[#F5F5F5]'
                          }`}
                        >
                          {isScrap && Number(value) > 0 ? `-${value}` : value}
                        </strong>
                      </div>
                    );
                  })}
                </div>

                {/* Annual Scenarios Table */}
                <div className="mt-6 pt-5 border-t border-[#292D34]">
                  <h3 className="mb-2 font-display text-xs font-bold uppercase tracking-wider text-[#737373]">
                    Annual Volume Scenarios
                  </h3>
                  <div
                    className="table-scroll"
                    tabIndex={0}
                    role="region"
                    aria-label="Annual costing scenarios. Scroll horizontally for more columns."
                  >
                    <table className="w-full text-left text-xs min-w-[280px]">
                      <thead className="border-b border-[#292D34] text-[#737373] bg-[#111111]">
                        <tr>
                          <th className="py-2 px-2.5 font-semibold">Volume</th>
                          <th className="py-2 px-2.5 font-semibold">Annual Cost</th>
                          <th className="py-2 px-2.5 font-semibold text-right">Selling Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#292D34]/50">
                        {calculations.scenarios.map(row => (
                          <tr className="hover:bg-[#202020] transition-colors" key={row.annualVolume}>
                            <td className="py-2 px-2.5 font-mono text-[#A3A3A3]">
                              {Number(row.annualVolume).toLocaleString()} pcs
                            </td>
                            <td className="py-2 px-2.5 font-mono text-[#F5F5F5]">
                              {row.annualCost}
                            </td>
                            <td className="py-2 px-2.5 font-mono font-semibold text-forge text-right">
                              {row.annualSellingValue}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-xs text-[#737373] py-4 text-center">
                Save a complete draft to calculate and inspect the deterministic breakdown.
              </p>
            )}
          </section>

          {/* Plant Head Review Comment if present */}
          {data.revision?.review_comment && (
            <section className="panel min-w-0 w-full">
              <h3 className="mb-2 font-display text-xs font-bold uppercase tracking-wider text-[#737373]">
                Plant Head Review Feedback
              </h3>
              <p className="text-xs text-[#A3A3A3] leading-relaxed bg-[#111111] p-3 rounded border border-[#292D34]">
                {data.revision.review_comment}
              </p>
            </section>
          )}
        </aside>

      </div>
    </main>
  );
}
