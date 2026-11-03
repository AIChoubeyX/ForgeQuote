import { describe, expect, it } from 'vitest';
import { calculateCost, decimal } from '../src/modules/costing/costing.calculator.js';

const input = {
  materialRate: '420', scrapRate: '3', overheadRate: '12', packingRate: '25',
  freightRate: '15', marginRate: '18', materialWeight: '4.25', annualVolume: 1200,
  operations: [{ cycleTimeMinutes: '30', rateValue: '850' }, { cycleTimeMinutes: '15', rateValue: '950' }]
};
describe('cost calculator', () => {
  it('calculates material and multiple operations deterministically', () => {
    const result = calculateCost(input);
    expect(result.components.material).toBe('1785');
    expect(result.components.manufacturing).toBe('662.5');
    expect(result.scenarios).toHaveLength(3);
    expect(result.scenarios[1].annualVolume).toBe('1200');
  });
  it('uses margin as a percentage of selling price', () => {
    const result = calculateCost(input);
    expect(result.components.sellingPrice).toBe('3457.012195');
  });
  it('calculates and formats tax in rupees from fixed-point values', () => {
    const taxable = decimal.parse('3185.041502');
    const tax = decimal.percent(taxable, '18');
    expect(decimal.formatCurrency(tax)).toBe('573.31');
    expect(decimal.formatCurrency(taxable + tax)).toBe('3758.35');
  });
});
