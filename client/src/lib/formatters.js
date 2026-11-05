export function formatCurrency(amount) {
  if (amount === null || amount === undefined || amount === '') return '₹0.00';
  const num = Number(amount);
  if (isNaN(num)) return String(amount);
  const isNegative = num < 0;
  const abs = Math.abs(num);
  const formatted = abs.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  return isNegative ? `-₹${formatted}` : `₹${formatted}`;
}

export function formatNumber(val, decimals = 2) {
  if (val === null || val === undefined || val === '') return '0';
  const num = Number(val);
  if (isNaN(num)) return String(val);
  return num.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals
  });
}

export function formatCategory(code) {
  if (!code || typeof code !== 'string') return 'Advisory Check';
  const clean = code.replace(/_AI$/, '');
  return clean
    .split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

export function formatFieldName(field) {
  if (!field || typeof field !== 'string') return '';
  const clean = field
    .replace(/^calculations\.components\./, '')
    .replace(/^inputs\./, '')
    .replace(/^context\./, '');

  return clean
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .trim()
    .replace(/^\w/, c => c.toUpperCase());
}

export function cleanEvidenceNumbers(text) {
  if (!text || typeof text !== 'string') return text || '';
  // Replace long floats like 79.999999 or 169.225609 with 2-decimal rounded equivalents
  return text.replace(/\b\d+\.\d{3,}\b/g, match => {
    const num = Number(match);
    return isNaN(num) ? match : num.toFixed(2);
  });
}

export function formatEvidence(text) {
  if (!text) return '';
  if (typeof text === 'object') {
    try {
      return Object.entries(text)
        .map(([k, v]) => `${formatFieldName(k)}: ${typeof v === 'number' ? formatNumber(v) : v}`)
        .join(' · ');
    } catch {
      return JSON.stringify(text);
    }
  }
  if (typeof text !== 'string') return String(text);
  const cleaned = cleanEvidenceNumbers(text);
  return cleaned.replace(/,\s*/g, '  ·  ');
}
