import { useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Edit3,
  FileText,
  Loader2,
  Sparkles,
  UploadCloud
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { ErrorState, LoadingState } from '../../components/feedback/States.jsx';
import { api } from '../../lib/api.js';

const emptyForm = {
  rfqNumber: '',
  customerName: '',
  receivedDate: new Date().toISOString().slice(0, 10),
  dueDate: '',
  sourceNotes: '',
  part: {
    name: '',
    description: '',
    material: '',
    grossWeight: '',
    annualVolume: ''
  }
};

const fieldMap = {
  customerRfqReference: ['rfqNumber'],
  customerName: ['customerName'],
  receivedDate: ['receivedDate'],
  dueDate: ['dueDate'],
  partName: ['part', 'name'],
  description: ['part', 'description'],
  material: ['part', 'material'],
  grossWeight: ['part', 'grossWeight'],
  annualVolume: ['part', 'annualVolume']
};

function normalizeDate(value) {
  const text = String(value || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const named = text.match(/^(\d{1,2})[-\s/]([A-Za-z]+)[-\s/](\d{4})$/);
  if (named) {
    const month = [
      'january',
      'february',
      'march',
      'april',
      'may',
      'june',
      'july',
      'august',
      'september',
      'october',
      'november',
      'december'
    ].indexOf(named[2].toLowerCase());
    if (month >= 0) {
      return `${named[3]}-${String(month + 1).padStart(2, '0')}-${String(named[1]).padStart(2, '0')}`;
    }
  }
  const slash = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slash && Number(slash[1]) > 12) {
    return `${slash[3]}-${slash[2].padStart(2, '0')}-${slash[1].padStart(2, '0')}`;
  }
  return '';
}

function normalizeNumber(value) {
  const text = String(value ?? '').replace(/,/g, '').trim();
  return text && Number.isFinite(Number(text)) ? String(Number(text)) : '';
}

export function AiRfqIntakePage() {
  const [file, setFile] = useState(null);
  const [emailText, setEmailText] = useState('');
  const [extraction, setExtraction] = useState(null);
  const [routing, setRouting] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [routingBusy, setRoutingBusy] = useState(false);
  const navigate = useNavigate();

  function setValue(path, value) {
    setForm(current => {
      if (path.length === 1) {
        return { ...current, [path[0]]: value };
      }
      return {
        ...current,
        [path[0]]: {
          ...current[path[0]],
          [path[1]]: value
        }
      };
    });
  }

  function applyExtracted(result) {
    const fields = result.fields || {};
    const newForm = {
      ...emptyForm,
      part: { ...emptyForm.part }
    };

    for (const [name, path] of Object.entries(fieldMap)) {
      const rawVal = fields[name]?.value;
      if (rawVal !== null && rawVal !== undefined && rawVal !== '') {
        const normalized = name.toLowerCase().includes('date')
          ? normalizeDate(rawVal)
          : ['grossWeight', 'annualVolume'].includes(name)
          ? normalizeNumber(rawVal)
          : String(rawVal);

        if (path.length === 1) {
          newForm[path[0]] = normalized;
        } else {
          newForm[path[0]][path[1]] = normalized;
        }
      }
    }

    // Default received date if empty
    if (!newForm.receivedDate) {
      newForm.receivedDate = new Date().toISOString().slice(0, 10);
    }

    setForm(newForm);
  }

  async function handleExtract(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const body = new FormData();
      if (file) body.append('document', file);
      if (emailText.trim()) body.append('emailText', emailText);
      const result = await api('/ai-intake/extract', { method: 'POST', body });
      setExtraction(result.data);
      applyExtracted(result.data.result);
    } catch (err) {
      setError(err.message || 'AI extraction failed. You can proceed with manual entry.');
    } finally {
      setBusy(false);
    }
  }

  function startManualEntry() {
    setError('');
    setExtraction({
      id: crypto.randomUUID ? crypto.randomUUID() : 'manual-' + Date.now(),
      isManual: true,
      result: {
        fields: {},
        warnings: [],
        conflicts: [],
        missingFields: []
      }
    });
    setForm({
      ...emptyForm,
      rfqNumber: `RFQ-${Date.now().toString().slice(-6)}`,
      receivedDate: new Date().toISOString().slice(0, 10)
    });
  }

  // Active validation based on current form values
  const validation = {
    rfqNumber: Boolean(form.rfqNumber.trim()),
    customerName: Boolean(form.customerName.trim()),
    receivedDate: Boolean(form.receivedDate),
    dueDate: Boolean(form.dueDate) && form.dueDate >= form.receivedDate,
    partName: Boolean(form.part.name.trim()),
    material: Boolean(form.part.material.trim()),
    grossWeight: Number.isFinite(Number(form.part.grossWeight)) && Number(form.part.grossWeight) > 0,
    annualVolume: Number.isInteger(Number(form.part.annualVolume)) && Number(form.part.annualVolume) > 0
  };

  const validationErrors = [
    !validation.rfqNumber && 'RFQ number is required',
    !validation.customerName && 'Customer name is required',
    !validation.receivedDate && 'Received date is required',
    !form.dueDate && 'Due date is required',
    form.dueDate && form.dueDate < form.receivedDate && 'Due date cannot be before received date',
    !validation.partName && 'Part name is required',
    !validation.material && 'Material grade is required',
    !validation.grossWeight && 'Gross weight must be a positive number',
    !validation.annualVolume && 'Annual volume must be a positive integer'
  ].filter(Boolean);

  const canConfirm = Object.values(validation).every(Boolean) && !isSubmitting;

  // List of fields that were missing from document AND still empty in the user's form
  const missingFromDocument = extraction?.result?.missingFields || [];
  const genuinelyUnfilledMissing = missingFromDocument.filter(fieldName => {
    if (fieldName === 'customerName') return !form.customerName.trim();
    if (fieldName === 'customerRfqReference') return !form.rfqNumber.trim();
    if (fieldName === 'receivedDate') return !form.receivedDate;
    if (fieldName === 'dueDate') return !form.dueDate;
    if (fieldName === 'partName') return !form.part.name.trim();
    if (fieldName === 'description') return !form.part.description.trim();
    if (fieldName === 'material') return !form.part.material.trim();
    if (fieldName === 'grossWeight') return !form.part.grossWeight;
    if (fieldName === 'annualVolume') return !form.part.annualVolume;
    return false;
  });

  async function handleConfirm(event) {
    event.preventDefault();
    setError('');

    if (validationErrors.length) {
      setError(`Please resolve the following before confirming: ${validationErrors.join(', ')}.`);
      return;
    }

    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const payload = {
        extractionId: extraction.id,
        rfqNumber: form.rfqNumber.trim(),
        customerName: form.customerName.trim(),
        receivedDate: form.receivedDate,
        dueDate: form.dueDate,
        sourceNotes: form.sourceNotes.trim(),
        part: {
          name: form.part.name.trim(),
          description: form.part.description.trim(),
          material: form.part.material.trim(),
          grossWeight: Number(form.part.grossWeight),
          annualVolume: Number(form.part.annualVolume)
        }
      };

      const result = await api('/ai-intake/confirm', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      navigate(`/app/rfqs?search=${encodeURIComponent(result.data.rfq_number)}`);
    } catch (err) {
      setError(err.message || 'Failed to create RFQ.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function suggestRouting() {
    setError('');
    setRoutingBusy(true);
    try {
      const result = await api('/ai-intake/routing-suggestions', {
        method: 'POST',
        body: JSON.stringify({
          name: form.part.name,
          material: form.part.material,
          grossWeight: Number(form.part.grossWeight)
        })
      });
      setRouting(result.data);
    } catch (err) {
      setError(err.message || 'Failed to retrieve routing suggestions.');
    } finally {
      setRoutingBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-7xl p-5 md:p-8 lg:p-10 text-[#F5F5F5]">
      <div className="mb-8">
        <Link
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-forge hover:text-[#E94B13] transition-colors"
          to="/app"
        >
          <ArrowLeft size={16} /> Back to dashboard
        </Link>
        <p className="eyebrow mb-2 mt-5">AI-Powered RFQ Ingestion</p>
        <h1 className="page-title">AI RFQ Intake</h1>
        <p className="mt-2 text-sm text-[#A3A3A3]">
          Upload customer RFQ documents or paste inquiry text to extract structured part specifications and commercial details.
        </p>
      </div>

      {error && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">{error}</p>
            {!extraction && (
              <button
                type="button"
                onClick={startManualEntry}
                className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-forge hover:underline"
              >
                <Edit3 size={13} /> Enter RFQ details manually instead
              </button>
            )}
          </div>
        </div>
      )}

      {!extraction ? (
        <form className="panel max-w-3xl p-6 md:p-8" onSubmit={handleExtract}>
          <div className="mb-6">
            <h2 className="font-display text-lg font-bold text-[#F5F5F5]">Source RFQ Material</h2>
            <p className="mt-1 text-sm text-[#A3A3A3]">
              Upload a drawing sheet (PDF), Excel part schedule (XLS/XLSX), or paste the email inquiry below.
            </p>
          </div>

          <label className="block text-sm font-semibold text-[#F5F5F5]">
            <span className="mb-2 block">Upload RFQ document</span>
            <input
              className="field h-[42px] m-0 w-full"
              type="file"
              accept=".pdf,.xls,.xlsx,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={event => setFile(event.target.files?.[0] || null)}
            />
            <span className="mt-1.5 block text-xs text-[#737373]">
              Supported: PDF, XLS, or XLSX up to 10 MB. Scanned image-only PDFs require OCR before extraction.
            </span>
          </label>

          <div className="my-6 flex items-center gap-3">
            <div className="flex-1 border-t border-[#292D34]" />
            <span className="text-xs font-bold uppercase tracking-wider text-[#737373]">
              or paste email inquiry text
            </span>
            <div className="flex-1 border-t border-[#292D34]" />
          </div>

          <label className="block text-sm font-semibold text-[#F5F5F5]">
            <span className="mb-2 block">RFQ email content</span>
            <textarea
              className="field m-0 w-full min-h-36"
              maxLength={50000}
              placeholder="Paste the customer's RFQ email text, technical notes, or tender requirements here…"
              value={emailText}
              onChange={event => setEmailText(event.target.value)}
            />
          </label>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-[#292D34] pt-6">
            <button
              type="button"
              onClick={startManualEntry}
              className="button border border-[#292D34] bg-[#181818] text-[#A3A3A3] hover:text-[#F5F5F5] hover:border-[#737373]"
            >
              <Edit3 size={16} /> Enter manually
            </button>

            <button
              className="button button-primary"
              type="submit"
              disabled={busy || (!file && !emailText.trim())}
            >
              {busy ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Extracting with AI…
                </>
              ) : (
                <>
                  <UploadCloud size={16} /> Extract for review
                </>
              )}
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleConfirm} noValidate>
          <section className="panel mb-6 p-6 md:p-8">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start border-b border-[#292D34] pb-5">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles size={18} className="text-forge" />
                  <h2 className="font-display text-xl font-bold text-[#F5F5F5]">Review & Verify Extraction</h2>
                </div>
                <p className="mt-1 text-sm text-[#A3A3A3]">
                  Values extracted by AI are advisory proposals. Inspect, edit, and verify each field before creating the RFQ.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setExtraction(null);
                  setRouting(null);
                  setError('');
                }}
                className="button border border-[#292D34] bg-[#181818] text-xs text-[#A3A3A3] hover:text-[#F5F5F5]"
              >
                Upload different document
              </button>
            </div>

            {/* Warnings and anomalies */}
            {extraction.result.warnings?.length > 0 && (
              <div className="mt-4 space-y-2">
                {extraction.result.warnings.map((warn, i) => (
                  <div
                    key={`warn-${i}`}
                    className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300"
                  >
                    <AlertCircle size={15} className="shrink-0" />
                    <span>{warn}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Missing from document notice (only if still empty in form) */}
            {genuinelyUnfilledMissing.length > 0 && (
              <div className="mt-4 rounded-lg border border-[#66301C] bg-[#FF5A1F]/10 p-3 text-xs text-[#F5F5F5]">
                <strong className="text-forge">Missing from document: </strong>
                {genuinelyUnfilledMissing.join(', ')}. Please provide these required values manually before confirming.
              </div>
            )}

            {/* Section 1: Request Metadata */}
            <div className="mt-6">
              <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-forge">
                1. Request Metadata
              </h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <label className="block text-sm font-medium text-[#F5F5F5]">
                  <span className="mb-1.5 block">RFQ Number <span className="text-forge">*</span></span>
                  <input
                    className="field h-[42px] m-0 w-full"
                    required
                    placeholder="e.g. RFQ-2026-0042"
                    value={form.rfqNumber}
                    onChange={event => setValue(['rfqNumber'], event.target.value)}
                  />
                </label>

                <label className="block text-sm font-medium text-[#F5F5F5]">
                  <span className="mb-1.5 block">Customer Name <span className="text-forge">*</span></span>
                  <input
                    className="field h-[42px] m-0 w-full"
                    required
                    placeholder="e.g. Apex Automotive"
                    value={form.customerName}
                    onChange={event => setValue(['customerName'], event.target.value)}
                  />
                  {!form.customerName.trim() && (
                    <span className="mt-1 block text-xs text-[#A3A3A3]">
                      Customer name could not be extracted. Please enter it manually.
                    </span>
                  )}
                </label>

                <label className="block text-sm font-medium text-[#F5F5F5]">
                  <span className="mb-1.5 block">Received Date <span className="text-forge">*</span></span>
                  <input
                    className="field h-[42px] m-0 w-full"
                    required
                    type="date"
                    value={form.receivedDate}
                    onChange={event => setValue(['receivedDate'], event.target.value)}
                  />
                </label>

                <label className="block text-sm font-medium text-[#F5F5F5]">
                  <span className="mb-1.5 block">Due Date <span className="text-forge">*</span></span>
                  <input
                    className="field h-[42px] m-0 w-full"
                    required
                    type="date"
                    value={form.dueDate}
                    onChange={event => setValue(['dueDate'], event.target.value)}
                  />
                </label>
              </div>

              <label className="mt-4 block text-sm font-medium text-[#F5F5F5]">
                <span className="mb-1.5 block">Commercial & Intake Notes</span>
                <textarea
                  rows={2}
                  className="field m-0 w-full"
                  placeholder="Additional commercial background, buyer contact details, delivery requirements…"
                  value={form.sourceNotes}
                  onChange={event => setValue(['sourceNotes'], event.target.value)}
                />
              </label>
            </div>

            {/* Section 2: Part Technical Specifications */}
            <div className="mt-8 border-t border-[#292D34] pt-6">
              <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-forge">
                2. Part Technical Specifications
              </h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <label className="block text-sm font-medium text-[#F5F5F5]">
                  <span className="mb-1.5 block">Part Name <span className="text-forge">*</span></span>
                  <input
                    className="field h-[42px] m-0 w-full"
                    required
                    placeholder="e.g. Hydraulic Flange"
                    value={form.part.name}
                    onChange={event => setValue(['part', 'name'], event.target.value)}
                  />
                </label>

                <label className="block text-sm font-medium text-[#F5F5F5]">
                  <span className="mb-1.5 block">Material Grade <span className="text-forge">*</span></span>
                  <input
                    className="field h-[42px] m-0 w-full"
                    required
                    placeholder="e.g. SS316, Aluminium 6061, EN8"
                    value={form.part.material}
                    onChange={event => setValue(['part', 'material'], event.target.value)}
                  />
                </label>

                <label className="block text-sm font-medium text-[#F5F5F5]">
                  <span className="mb-1.5 block">Gross Weight (kg) <span className="text-forge">*</span></span>
                  <input
                    className="field h-[42px] m-0 w-full"
                    required
                    type="number"
                    min="0.001"
                    step="0.001"
                    placeholder="0.000"
                    value={form.part.grossWeight}
                    onChange={event => setValue(['part', 'grossWeight'], event.target.value)}
                  />
                </label>

                <label className="block text-sm font-medium text-[#F5F5F5]">
                  <span className="mb-1.5 block">Annual Volume (units) <span className="text-forge">*</span></span>
                  <input
                    className="field h-[42px] m-0 w-full"
                    required
                    type="number"
                    min="1"
                    step="1"
                    placeholder="e.g. 5000"
                    value={form.part.annualVolume}
                    onChange={event => setValue(['part', 'annualVolume'], event.target.value)}
                  />
                </label>
              </div>

              <label className="mt-4 block text-sm font-medium text-[#F5F5F5]">
                <span className="mb-1.5 block">Part Description & Technical Specifications</span>
                <textarea
                  rows={3}
                  className="field m-0 w-full"
                  placeholder="Technical description, geometry, heat treatment, tolerances, finish requirements…"
                  value={form.part.description}
                  onChange={event => setValue(['part', 'description'], event.target.value)}
                />
                {!form.part.description.trim() && (
                  <span className="mt-1 block text-xs text-[#A3A3A3]">
                    Description could not be extracted from document. Please enter technical specifications manually if needed.
                  </span>
                )}
              </label>
            </div>

            {/* Section 3: Traceable Evidence */}
            {extraction.result.fields && Object.keys(extraction.result.fields).length > 0 && (
              <div className="mt-8 border-t border-[#292D34] pt-6">
                <h3 className="text-xs font-bold uppercase tracking-wider text-forge mb-3">
                  3. Source Evidence & Traceability
                </h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  {Object.entries(extraction.result.fields)
                    .filter(([, field]) => field.evidence && field.evidence.length > 0)
                    .map(([name, field]) => (
                      <details
                        className="rounded-lg border border-[#292D34] bg-[#111111] p-3 text-xs"
                        key={name}
                      >
                        <summary className="cursor-pointer font-semibold text-[#F5F5F5] hover:text-forge transition-colors">
                          {name} · <span className="text-[#A3A3A3] font-normal">{field.status}</span>
                        </summary>
                        <div className="mt-2 space-y-1.5 border-t border-[#292D34] pt-2">
                          {field.evidence.map((item, idx) => (
                            <blockquote
                              key={idx}
                              className="italic text-[#A3A3A3] border-l-2 border-forge pl-2"
                            >
                              “{item.quote}”
                            </blockquote>
                          ))}
                        </div>
                      </details>
                    ))}
                </div>
              </div>
            )}

            {/* Routing suggestions from historical parts */}
            {routing && (
              <div className="mt-8 rounded-lg bg-[#111111] border border-[#292D34] p-5">
                <h3 className="font-semibold text-[#F5F5F5] flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-400" />
                  Historical Manufacturing Route Suggestions
                </h3>
                <p className="mt-1 text-xs text-[#737373]">
                  Historical reference only. Plant Head review and approval is still strictly required.
                </p>
                {routing.status === 'insufficient_evidence' ? (
                  <p className="mt-3 text-sm text-amber-400">{routing.warnings.join(' ')}</p>
                ) : (
                  <div className="mt-4 space-y-3">
                    {routing.suggestions.map(item => (
                      <div
                        className="rounded-md bg-[#181818] border border-[#292D34] p-3 text-sm"
                        key={`${item.sequence}-${item.operationName}`}
                      >
                        <strong className="text-[#F5F5F5]">
                          {item.sequence}. {item.operationName} · <span className="text-forge">{item.machineCode}</span>
                        </strong>
                        <p className="mt-1 text-xs text-[#A3A3A3]">{item.rationale}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Action Footer */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <button
              className="button border border-[#292D34] bg-[#181818] text-[#A3A3A3] hover:text-[#F5F5F5] hover:border-[#737373]"
              type="button"
              disabled={routingBusy || !form.part.name || !form.part.material}
              onClick={suggestRouting}
            >
              {routingBusy ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Suggesting…
                </>
              ) : (
                'Suggest routing from historical parts'
              )}
            </button>

            <div className="flex items-center gap-3">
              {!canConfirm && validationErrors.length > 0 && (
                <span className="text-xs text-amber-400">
                  {validationErrors[0]}
                </span>
              )}
              <button
                className="button button-primary"
                type="submit"
                disabled={!canConfirm}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Creating RFQ…
                  </>
                ) : (
                  <>
                    Confirm and create RFQ <ArrowRight size={17} />
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      )}
    </main>
  );
}
