import { describe, expect, it } from 'vitest';
import { rateSchema } from '../src/modules/rateMasters/rateMasters.validation.js';

describe('rate master validation', () => {
  const valid = { code: 'MACHINE-1', name: 'Machine 1', category: 'machine_hour', unit: 'INR/hour', value: 850, effectiveFrom: '2026-01-01' };
  it('accepts a valid effective-dated rate', () => {
    expect(rateSchema.parse(valid).value).toBe(850);
  });
  it('rejects negative values and invalid percentage ranges', () => {
    expect(() => rateSchema.parse({ ...valid, value: -1 })).toThrow();
    expect(() => rateSchema.parse({ ...valid, category: 'margin_percent', value: 101 })).toThrow();
  });
  it('rejects a reversed effective period', () => {
    expect(() => rateSchema.parse({ ...valid, effectiveFrom: '2026-02-01', effectiveTo: '2026-01-01' })).toThrow();
  });
});
