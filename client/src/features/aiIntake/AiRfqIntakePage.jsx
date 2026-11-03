import { useEffect, useState } from 'react';
import { ArrowRight, UploadCloud } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { ErrorState, LoadingState } from '../../components/feedback/States.jsx';
import { api } from '../../lib/api.js';

const empty = {
  rfqNumber: '', customerId: '', receivedDate: '', dueDate: '', sourceNotes: '',
  part: { name: '', description: '', material: '', grossWeight: '', annualVolume: '' }
};
const fieldMap = {
  customerRfqReference: ['rfqNumber'],
  receivedDate: ['receivedDate'],
  partName: ['part', 'name'],
  description: ['part', 'description'],
  material: ['part', 'material'],
  grossWeight: ['part', 'grossWeight'],
  annualVolume: ['part', 'annualVolume'],
  dueDate: ['dueDate']
};

function normalize(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function normalizeDate(value) {
  const text = String(value || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const named = text.match(/^(\d{1,2})[-\s/]([A-Za-z]+)[-\s/](\d{4})$/);
  if (named) {
    const month = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'].indexOf(named[2].toLowerCase());
    if (month >= 0) return `${named[3]}-${String(month + 1).padStart(2, '0')}-${String(named[1]).padStart(2, '0')}`;
  }
  const slash = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slash && Number(slash[1]) > 12) return `${slash[3]}-${slash[2].padStart(2, '0')}-${slash[1].padStart(2, '0')}`;
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
  const [form, setForm] = useState(empty);
  const [customerName, setCustomerName] = useState('');
  const [customerMatch, setCustomerMatch] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (!extraction) return;
    const extractedCustomerName = String(extraction.result.fields.customerName?.value || '').trim();
    setCustomersLoading(true);
    api('/customers')
      .then(result => {
        setCustomers(result.data);
        const exactMatches = result.data.filter(customer => normalize(customer.name) === normalize(extractedCustomerName));
        if (exactMatches.length === 1) {
          setValue(['customerId'], exactMatches[0].id);
          setCustomerMatch({ type: 'matched', name: exactMatches[0].name });
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setCustomersLoading(false));
  }, [extraction]);

  function setValue(path, value) {
    setForm(current => path.length === 1
      ? { ...current, [path[0]]: value }
      : { ...current, [path[0]]: { ...current[path[0]], [path[1]]: value } });
  }

  function applyExtracted(result) {
    const fields = result.fields;
    for (const [name, path] of Object.entries(fieldMap)) {
      const value = fields[name]?.value;
      if (value !== null && value !== undefined && value !== '') {
        const normalized = name.toLowerCase().includes('date')
          ? normalizeDate(value)
          : ['grossWeight', 'annualVolume'].includes(name) ? normalizeNumber(value) : String(value);
        setValue(path, normalized);
      }
    }
    const extractedName = String(fields.customerName?.value || '').trim();
    setCustomerName(extractedName);
    if (extractedName) setCustomerMatch({ type: 'document', name: extractedName });
  }

  const validation = {
    rfqNumber: Boolean(form.rfqNumber.trim()),
    customer: Boolean(form.customerId),
    receivedDate: Boolean(form.receivedDate),
    dueDate: Boolean(form.dueDate) && form.dueDate >= form.receivedDate,
    partName: Boolean(form.part.name.trim()),
    material: Boolean(form.part.material.trim()),
    grossWeight: Number.isFinite(Number(form.part.grossWeight)) && Number(form.part.grossWeight) > 0,
    annualVolume: Number.isInteger(Number(form.part.annualVolume)) && Number(form.part.annualVolume) > 0
  };
  const canConfirm = Object.values(validation).every(Boolean) && !busy && !customersLoading;
  const validationMessages = [
    !validation.rfqNumber && 'RFQ number',
    !validation.customer && 'customer selection',
    !validation.receivedDate && 'received date',
    !validation.dueDate && 'due date (must be on or after the received date)',
    !validation.partName && 'part name',
    !validation.material && 'material',
    !validation.grossWeight && 'gross weight',
    !validation.annualVolume && 'annual volume'
  ].filter(Boolean);

  async function extract(event) {
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
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function confirm(event) {
    event.preventDefault();
    setError('');
    if (validationMessages.length) {
      setError(`Complete these fields before confirming: ${validationMessages.join(', ')}.`);
      return;
    }
    setBusy(true);
    try {
      const result = await api('/ai-intake/confirm', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          extractionId: extraction.id,
          customerName,
          part: { ...form.part, grossWeight: Number(form.part.grossWeight), annualVolume: Number(form.part.annualVolume) }
        })
      });
      navigate(`/app/rfqs?search=${encodeURIComponent(result.data.rfq_number)}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function suggestRouting() {
    setError('');
    setBusy(true);
    try {
      const result = await api('/ai-intake/routing-suggestions', {
        method: 'POST',
        body: JSON.stringify({ name: form.part.name, material: form.part.material, grossWeight: Number(form.part.grossWeight) })
      });
      setRouting(result.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-6xl p-5 md:p-10">
      <div className="mb-8">
        <Link className="text-sm font-semibold text-forge" to="/app">← Dashboard</Link>
        <p className="mb-2 mt-6 text-xs font-bold uppercase tracking-[.14em] text-forge">Estimator tools</p>
        <h1 className="font-display text-4xl font-semibold text-navy">AI-assisted RFQ intake</h1>
        <p className="mt-2 text-sm text-slate-500">Extract a proposal, then review every value before creating an RFQ.</p>
      </div>
      {error && <div className="mb-5"><ErrorState message={error} /></div>}
      {!extraction ? (
        <form className="panel max-w-3xl" onSubmit={extract}>
          <label className="block text-sm font-semibold">RFQ document
            <input className="field" type="file" accept=".pdf,.xls,.xlsx" onChange={event => setFile(event.target.files?.[0] || null)} />
            <span className="mt-1 block text-xs font-normal text-slate-500">PDF, XLS, or XLSX; maximum 10 MB. Scanned PDFs require OCR first.</span>
          </label>
          <div className="my-5 text-center text-xs font-semibold uppercase tracking-wide text-slate-400">or paste email text</div>
          <textarea className="field min-h-40" maxLength="50000" placeholder="Paste the RFQ email content here…" value={emailText} onChange={event => setEmailText(event.target.value)} />
          <button className="button button-primary mt-4" disabled={busy || (!file && !emailText.trim())}>{busy ? 'Extracting…' : <><UploadCloud size={17} />Extract for review</>}</button>
        </form>
      ) : (
        <form onSubmit={confirm} noValidate>
          <section className="panel mb-5">
            <h2 className="font-display text-lg font-semibold text-navy">Review extraction</h2>
            <p className="mt-1 text-sm text-slate-500">AI values are proposals. Confirm only values supported by the source or your review.</p>
            {customerMatch?.type === 'document' && <p className="mt-3 rounded bg-blue-50 p-3 text-sm text-blue-800">Customer from document: <strong>{customerMatch.name}</strong>. Select the matching database customer below. No similar customer is assigned automatically.</p>}
            {customerMatch?.type === 'matched' && <p className="mt-3 rounded bg-green-50 p-3 text-sm text-green-700">Matched customer record: <strong>{customerMatch.name}</strong>. Verify the selection before confirming.</p>}
            {extraction.result.warnings.concat(extraction.result.conflicts).map((item, index) => <p className="mt-3 rounded bg-amber-50 p-2 text-sm text-amber-800" key={`${item}-${index}`}>{item}</p>)}
            {extraction.result.missingFields.length > 0 && <p className="mt-3 rounded bg-red-50 p-2 text-sm text-red-700">Missing from document: {extraction.result.missingFields.join(', ')}. Enter any required values manually.</p>}
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {[
                ['RFQ number', 'rfqNumber'],
                ['Received date', 'receivedDate'],
                ['Due date', 'dueDate']
              ].map(([label, key]) => <label className="text-sm font-semibold" key={key}>{label}<input className="field" required type={key.includes('Date') ? 'date' : 'text'} value={form[key]} onChange={event => setValue([key], event.target.value)} /></label>)}
              <label className="text-sm font-semibold">Confirm customer record
                <span className="mb-2 block text-xs font-normal text-slate-500">
                  Proposed from document: <strong className="text-slate-700">{customerName || 'Not extracted'}</strong>
                </span>
                <select className="field" required value={form.customerId} disabled={customersLoading} onChange={event => setValue(['customerId'], event.target.value)}>
                  <option value="">{customersLoading ? 'Loading customer directory…' : 'Select matching customer'}</option>
                  {customers.map(customer => <option value={customer.id} key={customer.id}>{customer.name}{normalize(customer.name) === normalize(customerName) ? ' · exact name match' : ''}</option>)}
                </select>
              </label>
              <label className="text-sm font-semibold">Part name<input className="field" required value={form.part.name} onChange={event => setValue(['part', 'name'], event.target.value)} /></label>
              <label className="text-sm font-semibold">Material<input className="field" required value={form.part.material} onChange={event => setValue(['part', 'material'], event.target.value)} /></label>
              <label className="text-sm font-semibold">Gross weight<input className="field" required type="number" min="0.001" step="0.001" value={form.part.grossWeight} onChange={event => setValue(['part', 'grossWeight'], event.target.value)} /></label>
              <label className="text-sm font-semibold">Annual volume<input className="field" required type="number" min="1" step="1" value={form.part.annualVolume} onChange={event => setValue(['part', 'annualVolume'], event.target.value)} /></label>
            </div>
            <label className="mt-4 block text-sm font-semibold">Description<textarea className="field" value={form.part.description} onChange={event => setValue(['part', 'description'], event.target.value)} /></label>
            <div className="mt-6 border-t border-slate-100 pt-4">
              <h3 className="text-sm font-semibold text-navy">Source evidence</h3>
              {Object.entries(extraction.result.fields).filter(([, field]) => field.evidence.length).map(([name, field]) => <details className="mt-2 rounded border border-slate-200 p-2 text-sm" key={name}><summary className="cursor-pointer font-semibold">{name} · {field.status}</summary>{field.evidence.map(item => <p className="mt-2 text-xs text-slate-600" key={`${item.source}-${item.quote}`}>{item.source}: “{item.quote}”</p>)}</details>)}
            </div>
            {routing && <div className="mt-6 rounded-lg bg-slate-50 p-4"><h3 className="font-semibold text-navy">Routing suggestions</h3><p className="mt-1 text-xs text-slate-500">Historical references only; plant-head approval is still required.</p>{routing.status === 'insufficient_evidence' ? <p className="mt-3 text-sm text-amber-700">{routing.warnings.join(' ')}</p> : routing.suggestions.map(item => <div className="mt-3 border-t border-slate-200 pt-3 text-sm" key={`${item.sequence}-${item.operationName}`}><strong>{item.sequence}. {item.operationName} · {item.machineCode}</strong><p className="text-slate-600">{item.rationale}</p></div>)}</div>}
          </section>
          <div className="flex flex-wrap gap-3">
            <button className="button border border-slate-200 text-slate-600" type="button" disabled={busy || !form.part.name || !form.part.material} onClick={suggestRouting}>Suggest from historical parts</button>
            {!canConfirm && <p className="w-full text-sm text-amber-700">{customersLoading ? 'Loading the customer directory…' : 'Click confirm to see the exact fields that still need attention.'}</p>}
            <button className="button button-primary" disabled={busy || customersLoading}>{busy ? 'Creating RFQ…' : <>Confirm and create RFQ <ArrowRight size={17} /></>}</button>
          </div>
        </form>
      )}
      {busy && extraction && <LoadingState label="Working…" />}
    </main>
  );
}
