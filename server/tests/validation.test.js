import { describe, expect, it } from 'vitest';
import { rfqSchema } from '../src/modules/rfqs/rfqs.validation.js';

const valid = {
  rfqNumber: 'RFQ-TEST-001',
  customerId: '00000000-0000-0000-0000-000000000001',
  receivedDate: '2026-11-01',
  dueDate: '2026-11-10',
  assignedEstimatorId: '00000000-0000-0000-0000-000000000002',
  part: { name: 'Housing', description: '', material: 'Steel', grossWeight: 2.5, annualVolume: 100 }
};

describe('RFQ validation', () => {
  it('accepts a valid RFQ payload', () => {
    expect(rfqSchema.parse(valid).rfqNumber).toBe('RFQ-TEST-001');
  });
  it('rejects invalid dates and non-positive quantities', () => {
    expect(() => rfqSchema.parse({ ...valid, dueDate: '2026-10-01' })).toThrow();
    expect(() => rfqSchema.parse({ ...valid, part: { ...valid.part, grossWeight: 0 } })).toThrow();
  });
});
