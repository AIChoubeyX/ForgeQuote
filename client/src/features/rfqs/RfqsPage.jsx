import { useEffect, useState } from 'react';
import { Plus, Search, X } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { RfqTable } from '../../components/data-display/RfqTable.jsx';
import { EmptyState, ErrorState, LoadingState } from '../../components/feedback/States.jsx';
import { api } from '../../lib/api.js';
import { RfqForm } from './RfqForm.jsx';

export function RfqsPage({ user, canCreate = false }) {
  const [params, setParams] = useSearchParams();
  const workflow = params.get('workflow') || '';
  const [data, setData] = useState(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(params.get('status') || '');
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const navigate = useNavigate();

  const load = () =>
    api(`/rfqs?search=${encodeURIComponent(search)}&status=${status}&workflow=${workflow}`)
      .then(setData)
      .catch(() => setData({ error: true }));

  useEffect(() => {
    setStatus(params.get('status') || '');
    setData(null);
    load();
  }, [search, status, workflow]);

  async function edit(id) {
    try {
      const result = await api(`/rfqs/${id}`);
      setSelected(result.data);
      setShowForm(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      // Error handling
    }
  }

  const workflowLabels = {
    open: 'Open RFQs active across estimation, routing, commercial approval, or quotation issuance',
    draft: 'Draft RFQs registered and awaiting initial costing inputs',
    costing: 'Costings currently in preparation by estimating engineering',
    in_progress: 'Costings currently in preparation by estimating engineering',
    plant_review: 'Pending manufacturing feasibility & route verification by Plant Head',
    pending_plant_review: 'Pending manufacturing feasibility & route verification by Plant Head',
    returned: 'Returned for engineering revision or commercial corrections',
    returned_for_revision: 'Returned for engineering revision or commercial corrections',
    commercial: 'Plant-approved costing awaiting final commercial sign-off by Sales Head',
    pending_sales_approval: 'Plant-approved costing awaiting final commercial sign-off by Sales Head',
    ready_for_quote: 'Fully approved quotations locked and ready for formal customer issuance',
    issued: 'Authoritative customer quotations formally issued',
    quoted: 'Authoritative customer quotations formally issued'
  };

  return (
    <main className="mx-auto w-full max-w-7xl px-3.5 py-4 sm:p-6 md:p-8 lg:p-10 text-ink min-w-0">
      <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <p className="eyebrow mb-2">Manufacturing Operations</p>
          <h1 className="page-title">RFQ register</h1>
          <p className="mt-2 text-sm text-ink-soft">
            {workflowLabels[workflow] || 'Search, track, cost, and govern customer quotation requests.'}
          </p>
        </div>
        {canCreate && (
          <button
            className="button button-primary"
            onClick={() => {
              setSelected(null);
              setShowForm(!showForm);
            }}
          >
            {showForm ? (
              <>
                <X size={17} /> Close form
              </>
            ) : (
              <>
                <Plus size={17} /> Register RFQ
              </>
            )}
          </button>
        )}
      </div>

      {(workflow || status) && (
        <div className="mb-5 flex items-center gap-2">
          <span className="text-xs text-ink-muted">Active filter:</span>
          <span className="inline-flex items-center gap-1.5 bg-surface border border-line px-3 py-1 text-xs font-medium text-ink">
            {workflow ? `Workflow: ${workflow}` : `Status: ${status}`}
            <button
              onClick={() => setParams({})}
              className="ml-1 text-ink-muted hover:text-forge"
              title="Clear filter"
            >
              ×
            </button>
          </span>
          <button
            className="text-xs font-medium text-forge hover:text-forge-hover underline transition-colors"
            onClick={() => setParams({})}
          >
            Clear all
          </button>
        </div>
      )}

      {showForm && canCreate && (
        <div className="mb-8">
          <RfqForm
            rfq={selected}
            onCancel={() => {
              setShowForm(false);
              setSelected(null);
            }}
            onSaved={() => {
              setShowForm(false);
              setSelected(null);
              load();
            }}
          />
        </div>
      )}

      {/* Search and Filters Bar */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center min-w-0 w-full">
        <div className="relative flex-1 max-w-md min-w-0">
          <Search
            size={16}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted"
          />
          <input
            className="field m-0 pl-10 h-11 w-full"
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Search RFQ #, customer, or part name…"
          />
        </div>
        <select
          className="field m-0 h-11 sm:w-60 bg-surface"
          value={status}
          onChange={event => {
            setStatus(event.target.value);
            setParams(event.target.value ? { status: event.target.value } : {});
          }}
        >
          <option value="" className="bg-paper text-ink">All statuses</option>
          <option value="draft" className="bg-paper text-ink">Draft</option>
          <option value="in_progress" className="bg-paper text-ink">In progress</option>
          <option value="pending_plant_review" className="bg-paper text-ink">Pending plant review</option>
          <option value="returned_for_revision" className="bg-paper text-ink">Returned for revision</option>
          <option value="pending_sales_approval" className="bg-paper text-ink">Pending sales approval</option>
          <option value="ready_for_quote" className="bg-paper text-ink">Ready for quote</option>
          <option value="quoted" className="bg-paper text-ink">Quoted</option>
        </select>
      </div>

      {/* Main RFQ Table Panel */}
      <section className="panel p-0 overflow-hidden min-w-0 w-full">
        {!data ? (
          <div className="p-8">
            <LoadingState label="Loading RFQs…" />
          </div>
        ) : data.error ? (
          <div className="p-8">
            <ErrorState />
          </div>
        ) : data.data.length ? (
          <RfqTable
            rows={data.data}
            user={user}
            onSelect={canCreate ? edit : undefined}
            onCosting={canCreate ? id => navigate(`/app/rfqs/${id}/costing`) : undefined}
          />
        ) : (
          <div className="p-8">
            <EmptyState
              title="No RFQs found"
              message="No quotation requests match your active search or filters. Try adjusting your query or create a new RFQ."
            />
          </div>
        )}
      </section>
    </main>
  );
}
