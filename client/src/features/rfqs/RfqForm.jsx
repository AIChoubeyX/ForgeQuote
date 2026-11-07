import { useEffect, useState } from 'react';
import { AlertCircle, ArrowRight, FileText, Paperclip, UploadCloud } from 'lucide-react';
import { api } from '../../lib/api.js';

const initial = {
  rfqNumber: '',
  customerId: '',
  receivedDate: '',
  dueDate: '',
  assignedEstimatorId: '',
  sourceNotes: '',
  part: {
    name: '',
    description: '',
    material: '',
    grossWeight: '',
    annualVolume: ''
  }
};

export function RfqForm({ rfq, onSaved, onCancel }) {
  const [form, setForm] = useState(
    rfq
      ? {
          ...initial,
          rfqNumber: rfq.rfq_number,
          customerId: rfq.customer_id,
          receivedDate: rfq.received_date?.slice(0, 10) || '',
          dueDate: rfq.due_date?.slice(0, 10) || '',
          assignedEstimatorId: rfq.owner_id || '',
          status: rfq.status,
          sourceNotes: rfq.source_notes || '',
          part: {
            name: rfq.part_name || '',
            description: rfq.description || '',
            material: rfq.material || '',
            grossWeight: rfq.gross_weight ?? '',
            annualVolume: rfq.annual_volume ?? ''
          }
        }
      : initial
  );

  const [refs, setRefs] = useState({ customers: [], estimators: [] });
  const [documents, setDocuments] = useState([]);
  const [files, setFiles] = useState([]);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([api('/customers'), api('/users/estimators')])
      .then(([customers, estimators]) =>
        setRefs({ customers: customers.data || [], estimators: estimators.data || [] })
      )
      .catch(() => setError('Reference data could not be loaded.'));
  }, []);

  useEffect(() => {
    if (rfq?.id) {
      api(`/rfqs/${rfq.id}/documents`)
        .then(result => setDocuments(result.data || []))
        .catch(() => setError('Document list could not be loaded.'));
    }
  }, [rfq]);

  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }));
  const updatePart = (key, value) =>
    setForm(prev => ({ ...prev, part: { ...prev.part, [key]: value } }));

  async function submit(event) {
    event.preventDefault();
    setError('');

    const annualVolume = Number(form.part.annualVolume);
    if (!Number.isInteger(annualVolume) || annualVolume <= 0) {
      setError('Annual volume must be a positive whole number.');
      return;
    }

    const grossWeight = Number(form.part.grossWeight);
    if (Number.isNaN(grossWeight) || grossWeight <= 0) {
      setError('Gross weight must be a valid positive number.');
      return;
    }

    setIsSubmitting(true);
    try {
      const body = {
        ...form,
        part: {
          ...form.part,
          grossWeight,
          annualVolume
        }
      };

      const saved = await api(rfq ? `/rfqs/${rfq.id}` : '/rfqs', {
        method: rfq ? 'PUT' : 'POST',
        body: JSON.stringify(body)
      });

      if (files.length) {
        const upload = new FormData();
        files.forEach(file => upload.append('documents', file));
        await api(`/rfqs/${saved.data.id}/documents`, { method: 'POST', body: upload });
      }

      onSaved();
    } catch (err) {
      setError(err.message || 'Failed to save RFQ.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="panel mb-6 p-4 sm:p-6 md:p-8 min-w-0 w-full" onSubmit={submit}>
      <div className="mb-6 border-b border-line pb-4">
        <h2 className="font-display text-xl font-normal text-ink">
          {rfq ? 'Edit RFQ Record' : 'Register New RFQ'}
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          Capture customer requirements, part technical specifications, and attach engineering drawings.
        </p>
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-700">
          <AlertCircle size={18} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Section 1: Request Metadata */}
      <div className="mb-8">
        <h3 className="mb-4 text-xs font-medium text-forge">
          1. Request Metadata
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="block text-sm font-medium text-ink">
            <span className="mb-1.5 block">RFQ Number <span className="text-forge">*</span></span>
            <input
              className="field h-[42px] m-0 w-full"
              required
              placeholder="e.g. RFQ-2026-0042"
              value={form.rfqNumber}
              onChange={event => update('rfqNumber', event.target.value)}
            />
          </label>

          <label className="block text-sm font-medium text-ink">
            <span className="mb-1.5 block">Customer <span className="text-forge">*</span></span>
            <select
              className="field h-[42px] m-0 w-full bg-surface"
              required
              value={form.customerId}
              onChange={event => update('customerId', event.target.value)}
            >
              <option value="" className="bg-paper">Select customer</option>
              {refs.customers.map(item => (
                <option value={item.id} key={item.id} className="bg-paper">
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-medium text-ink">
            <span className="mb-1.5 block">Assigned Estimator <span className="text-forge">*</span></span>
            <select
              className="field h-[42px] m-0 w-full bg-surface"
              required
              value={form.assignedEstimatorId}
              onChange={event => update('assignedEstimatorId', event.target.value)}
            >
              <option value="" className="bg-paper">Select estimator</option>
              {refs.estimators.map(item => (
                <option value={item.id} key={item.id} className="bg-paper">
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-medium text-ink">
            <span className="mb-1.5 block">Received Date <span className="text-forge">*</span></span>
            <input
              className="field h-[42px] m-0 w-full"
              required
              type="date"
              value={form.receivedDate}
              onChange={event => update('receivedDate', event.target.value)}
            />
          </label>

          <label className="block text-sm font-medium text-ink">
            <span className="mb-1.5 block">Due Date <span className="text-forge">*</span></span>
            <input
              className="field h-[42px] m-0 w-full"
              required
              type="date"
              value={form.dueDate}
              onChange={event => update('dueDate', event.target.value)}
            />
          </label>
        </div>

        <label className="mt-4 block text-sm font-medium text-ink">
          <span className="mb-1.5 block">Commercial & Source Notes</span>
          <textarea
            rows={2}
            className="field m-0 w-full"
            placeholder="Commercial terms, customer contact background, or delivery prerequisites…"
            value={form.sourceNotes}
            onChange={event => update('sourceNotes', event.target.value)}
          />
        </label>
      </div>

      {/* Section 2: Part Specifications */}
      <div className="mb-8 border-t border-line pt-6">
        <h3 className="mb-4 text-xs font-medium text-forge">
          2. Part Technical Specifications
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block text-sm font-medium text-ink">
            <span className="mb-1.5 block">Part Name <span className="text-forge">*</span></span>
            <input
              className="field h-[42px] m-0 w-full"
              required
              placeholder="e.g. Flange Adapter"
              value={form.part.name}
              onChange={event => updatePart('name', event.target.value)}
            />
          </label>

          <label className="block text-sm font-medium text-ink">
            <span className="mb-1.5 block">Material <span className="text-forge">*</span></span>
            <input
              className="field h-[42px] m-0 w-full"
              required
              placeholder="e.g. SS316, EN8, Aluminium 6061"
              value={form.part.material}
              onChange={event => updatePart('material', event.target.value)}
            />
          </label>

          <label className="block text-sm font-medium text-ink">
            <span className="mb-1.5 block">Gross Weight (kg) <span className="text-forge">*</span></span>
            <input
              className="field h-[42px] m-0 w-full"
              required
              type="number"
              min="0.001"
              step="0.001"
              placeholder="0.000"
              value={form.part.grossWeight}
              onChange={event => updatePart('grossWeight', event.target.value)}
            />
          </label>

          <label className="block text-sm font-medium text-ink">
            <span className="mb-1.5 block">Annual Volume (units) <span className="text-forge">*</span></span>
            <input
              className="field h-[42px] m-0 w-full"
              required
              type="number"
              min="1"
              step="1"
              placeholder="e.g. 5000"
              value={form.part.annualVolume}
              onChange={event => updatePart('annualVolume', event.target.value)}
            />
          </label>
        </div>

        <label className="mt-4 block text-sm font-medium text-ink">
          <span className="mb-1.5 block">Engineering & Part Description</span>
          <textarea
            rows={2}
            className="field m-0 w-full"
            placeholder="Critical tolerances, heat treatment specs, surface finish requirements…"
            value={form.part.description}
            onChange={event => updatePart('description', event.target.value)}
          />
        </label>
      </div>

      {/* Section 3: Engineering Drawings & Documents */}
      <div className="mb-8 border-t border-line pt-6">
        <h3 className="mb-4 text-xs font-medium text-forge">
          3. Attached Engineering Documents
        </h3>
        <label className="block text-sm font-medium text-ink">
          <span className="mb-1.5 block">Drawing PDFs or Excel Part Lists</span>
          <input
            className="field h-[42px] m-0 w-full"
            type="file"
            multiple
            accept=".pdf,.xls,.xlsx,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={event => setFiles(Array.from(event.target.files || []))}
          />
          <span className="mt-1.5 block text-xs font-normal text-ink-muted">
            Encrypted file storage. Up to 10 MB per file. Revising uploads creates immutable versions.
          </span>
        </label>

        {rfq && (
          <div className="mt-4 rounded-lg bg-paper border border-line p-4 text-sm">
            <div className="flex items-center gap-2 mb-3">
              <Paperclip size={16} className="text-forge" />
              <strong className="text-ink">Attached Files ({documents.length})</strong>
            </div>
            {documents.length ? (
              <ul className="space-y-2">
                {documents.map(doc => (
                  <li
                    key={doc.id}
                    className="flex items-center justify-between rounded-md bg-surface border border-line px-3 py-2 text-xs text-ink-soft"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileText size={14} className="shrink-0 text-ink-muted" />
                      <span className="truncate font-medium text-ink">
                        {doc.original_filename}
                      </span>
                      <span className="text-ink-muted">· v{doc.version}</span>
                    </div>
                    <a
                      className="ml-3 shrink-0 font-medium text-forge hover:text-forge-hover transition-colors"
                      href={`${import.meta.env.VITE_API_URL || 'http://localhost:4000/api'}/documents/${doc.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Download
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-ink-muted">No source documents uploaded yet.</p>
            )}
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-line pt-6">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="button border border-line bg-surface text-ink-soft hover:text-ink hover:border-line-strong"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className="button button-primary"
        >
          {isSubmitting
            ? 'Saving…'
            : rfq
            ? 'Save changes'
            : 'Create RFQ'}
          <ArrowRight size={17} />
        </button>
      </div>
    </form>
  );
}
