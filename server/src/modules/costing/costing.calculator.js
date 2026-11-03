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

export function calculateCost({ materialRate, scrapRate, overheadRate, packingRate, freightRate, marginRate, materialWeight, annualVolume, operations }) {
  const weight = parse(materialWeight);
  const material = multiply(weight, parse(materialRate));
  const scrap = percent(material, scrapRate);
  const manufacturing = operations.reduce((total, operation) => total + multiply(divide(parse(operation.cycleTimeMinutes), parse('60')), parse(operation.rateValue)), 0n);
  const overhead = percent(material + manufacturing, overheadRate);
  const packing = parse(packingRate);
  const freight = parse(freightRate);
  const cost = material + scrap + manufacturing + overhead + packing + freight;
  const margin = parse(marginRate);
  if (margin >= parse('100')) throw new Error('Margin must be below 100%');
  const selling = divide(cost, SCALE - margin / 100n);
  const volume = BigInt(annualVolume);
  return {
    components: { material: format(material), scrap: format(scrap), manufacturing: format(manufacturing), overhead: format(overhead), packing: format(packing), freight: format(freight), totalCost: format(cost), margin: format(selling - cost), sellingPrice: format(selling) },
    scenarios: [volume / 2n > 0n ? volume / 2n : 1n, volume, volume * 2n].map(scenarioVolume => ({
      annualVolume: scenarioVolume.toString(),
      annualCost: format(cost * scenarioVolume),
      annualSellingValue: format(selling * scenarioVolume),
      contribution: format((selling - cost) * scenarioVolume)
    }))
  };
}

export const decimal = { parse, format };
