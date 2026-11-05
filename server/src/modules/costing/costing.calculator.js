const SCALE = 1000000n;

function parse(value) {
  const text = String(value ?? '').trim();
  if (!/^\d+(\.\d+)?$/.test(text)) throw new Error(`Invalid decimal value: ${text}`);
  const [whole, fraction = ''] = text.split('.');
  return BigInt(whole) * SCALE + BigInt((fraction + '000000').slice(0, 6));
}

function format(value) {
  const sign = value < 0n ? '-' : '';
  const absolute = value < 0n ? -value : value;
  const whole = absolute / SCALE;
  const fraction = (absolute % SCALE).toString().padStart(6, '0').replace(/0+$/, '');
  return `${sign}${whole}${fraction ? `.${fraction}` : ''}`;
}

function multiply(a, b) { return (a * b) / SCALE; }
function divide(a, b) { if (b === 0n) throw new Error('Division by zero'); return (a * SCALE) / b; }
function percent(amount, percentage) { return multiply(amount, parse(percentage)) / 100n; }

export function calculateCost({ materialRate, scrapRate, overheadRate, packingRate, freightRate, marginRate, materialWeight, annualVolume, operations = [] }) {
  const weight = parse(materialWeight);
  if (weight <= 0n) throw new Error('Material weight must be greater than zero');

  const volume = BigInt(annualVolume ?? 0);
  if (volume <= 0n) throw new Error('Annual volume must be greater than zero');

  const margin = parse(marginRate);
  if (margin < 0n || margin >= parse('100')) {
    throw new Error('Margin must be between 0% and 99.9999%');
  }

  const scrapPct = parse(scrapRate);
  if (scrapPct < 0n || scrapPct > parse('100')) {
    throw new Error('Scrap rate percentage must be between 0% and 100%');
  }

  const material = multiply(weight, parse(materialRate));
  const scrap = percent(material, scrapRate);
  if (scrap > material) {
    throw new Error('Scrap recovery credit cannot exceed material cost');
  }

  const manufacturing = (operations || []).reduce((total, operation) => {
    const cycle = parse(operation.cycleTimeMinutes);
    if (cycle <= 0n) throw new Error('Cycle time must be greater than zero');
    const rate = parse(operation.rateValue);
    if (rate < 0n) throw new Error('Machine rate cannot be negative');
    // Multiply cycle time by hourly rate first, then divide by 60 to prevent premature truncation
    return total + (multiply(cycle, rate) / 60n);
  }, 0n);

  const overhead = percent(material + manufacturing, overheadRate);
  const packing = parse(packingRate);
  const freight = parse(freightRate);

  // Scrap metal recovery is a credit deducted from the direct cost of material
  const cost = material - scrap + manufacturing + overhead + packing + freight;
  if (cost <= 0n) throw new Error('Total manufacturing cost must be positive');

  // Gross Margin pricing: Selling Price = Total Cost / (1 - Margin Rate)
  const selling = divide(cost, SCALE - margin / 100n);

  return {
    components: {
      material: format(material),
      scrap: format(scrap),
      manufacturing: format(manufacturing),
      overhead: format(overhead),
      packing: format(packing),
      freight: format(freight),
      totalCost: format(cost),
      margin: format(selling - cost),
      sellingPrice: format(selling)
    },
    scenarios: [volume / 2n > 0n ? volume / 2n : 1n, volume, volume * 2n].map(scenarioVolume => ({
      annualVolume: scenarioVolume.toString(),
      annualCost: format(cost * scenarioVolume),
      annualSellingValue: format(selling * scenarioVolume),
      contribution: format((selling - cost) * scenarioVolume)
    }))
  };
}

function formatCurrency(value) {
  const amount = typeof value === 'bigint' ? value : parse(value);
  const sign = amount < 0n ? '-' : '';
  const absolute = amount < 0n ? -amount : amount;
  const roundedCents = (absolute * 100n + SCALE / 2n) / SCALE;
  const whole = roundedCents / 100n;
  const cents = (roundedCents % 100n).toString().padStart(2, '0');
  return `${sign}${whole}.${cents}`;
}

export const decimal = { parse, format, percent, formatCurrency };
