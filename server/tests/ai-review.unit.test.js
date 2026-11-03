import { describe, expect, it } from 'vitest';
import {
  validateCosting,
  validateRouting,
  validateCommercial
} from '../src/modules/aiReview/aiReview.deterministic.js';
import { canonicalReviewType } from '../src/modules/aiReview/aiReview.validation.js';

describe('AI Review Deterministic Costing Validation', () => {
  it('flags COSTING_DRAFT_NOT_SAVED when revision is missing', () => {
    const findings = validateCosting({ rfq: { id: 'rfq-1', rfqNumber: 'RFQ-001' }, revision: null });
    expect(findings.some(f => f.code === 'COSTING_DRAFT_NOT_SAVED')).toBe(true);
    expect(findings[0].severity).toBe('critical');
    expect(findings[0].source).toBe('deterministic');
  });

  it('flags missing mandatory costing inputs', () => {
    const context = {
      rfq: { id: 'rfq-1' },
      part: { grossWeight: 5, annualVolume: 1000 },
      revision: {
        inputs: {
          costingDate: '2026-11-01',
          materialRateCode: 'MAT-1'
          // missing scrapRateCode, overheadRateCode, etc.
        },
        operations: []
      }
    };
    const findings = validateCosting(context);
    expect(findings.some(f => f.code === 'COSTING_MISSING_SCRAPRATECODE')).toBe(true);
    expect(findings.some(f => f.code === 'COSTING_MISSING_OVERHEADRATECODE')).toBe(true);
    expect(findings.some(f => f.code === 'COSTING_NO_OPERATIONS')).toBe(true);
  });

  it('flags invalid operations (empty name, missing machine code, non-positive cycle time)', () => {
    const context = {
      rfq: { id: 'rfq-1' },
      part: { grossWeight: 5, annualVolume: 1000 },
      revision: {
        costingDate: '2026-11-01',
        inputs: {
          costingDate: '2026-11-01',
          materialRateCode: 'MAT-1',
          scrapRateCode: 'SCRAP-1',
          overheadRateCode: 'OH-1',
          packingRateCode: 'PACK-1',
          freightRateCode: 'FRT-1',
          marginRateCode: 'MAR-1',
          materialWeight: 5
        },
        operations: [
          { sequence: 1, operationName: '', machineCode: 'M-1', cycleTimeMinutes: 10, rateValue: 500 },
          { sequence: 2, operationName: 'Milling', machineCode: '', cycleTimeMinutes: 0, rateValue: 0 }
        ]
      }
    };
    const findings = validateCosting(context);
    expect(findings.some(f => f.code === 'COSTING_EMPTY_OPERATION_NAME')).toBe(true);
    expect(findings.some(f => f.code === 'COSTING_MISSING_MACHINE_CODE')).toBe(true);
    expect(findings.some(f => f.code === 'COSTING_INVALID_CYCLE_TIME')).toBe(true);
    expect(findings.some(f => f.code === 'COSTING_UNRESOLVED_RATE')).toBe(true);
  });
});

describe('AI Review Deterministic Routing Validation', () => {
  it('flags ROUTING_NO_OPERATIONS when route has no operations', () => {
    const findings = validateRouting({ revision: { operations: [] } });
    expect(findings.some(f => f.code === 'ROUTING_NO_OPERATIONS')).toBe(true);
    expect(findings[0].severity).toBe('critical');
  });

  it('flags duplicate sequence numbers', () => {
    const context = {
      revision: {
        operations: [
          { id: '1', sequence: 1, operationName: 'Facing', machineCode: 'LATHE-1', cycleTimeMinutes: 12, rateValue: 600, rateUnit: 'INR/hour' },
          { id: '2', sequence: 1, operationName: 'Centering', machineCode: 'DRILL-1', cycleTimeMinutes: 5, rateValue: 400, rateUnit: 'INR/hour' }
        ]
      }
    };
    const findings = validateRouting(context);
    expect(findings.some(f => f.code === 'ROUTING_DUPLICATE_SEQUENCE')).toBe(true);
    expect(findings.find(f => f.code === 'ROUTING_DUPLICATE_SEQUENCE').severity).toBe('critical');
  });

  it('flags true duplicate operations with identical signature', () => {
    const context = {
      revision: {
        operations: [
          { id: '1', sequence: 1, operationName: 'Rough Turning', machineCode: 'LATHE-CNC', cycleTimeMinutes: 15, rateValue: 800, rateUnit: 'INR/hour' },
          { id: '2', sequence: 2, operationName: 'Rough Turning', machineCode: 'LATHE-CNC', cycleTimeMinutes: 15, rateValue: 800, rateUnit: 'INR/hour' }
        ]
      }
    };
    const findings = validateRouting(context);
    expect(findings.some(f => f.code === 'ROUTING_DUPLICATE_OPERATION')).toBe(true);
  });

  it('does NOT flag operations as duplicate merely because names match if machines or cycle times differ', () => {
    const context = {
      revision: {
        operations: [
          { id: '1', sequence: 1, operationName: 'Inspection', machineCode: 'BENCH-1', cycleTimeMinutes: 5, rateValue: 300, rateUnit: 'INR/hour' },
          { id: '2', sequence: 2, operationName: 'Turning', machineCode: 'LATHE-CNC', cycleTimeMinutes: 15, rateValue: 800, rateUnit: 'INR/hour' },
          { id: '3', sequence: 3, operationName: 'Inspection', machineCode: 'CMM-1', cycleTimeMinutes: 20, rateValue: 1200, rateUnit: 'INR/hour' }
        ]
      }
    };
    const findings = validateRouting(context);
    expect(findings.some(f => f.code === 'ROUTING_DUPLICATE_OPERATION')).toBe(false);
  });

  it('flags missing machine rate but does NOT demand a separate labor rate', () => {
    const context = {
      revision: {
        operations: [
          { id: '1', sequence: 1, operationName: 'Boring', machineCode: 'BORING-1', cycleTimeMinutes: 10, rateValue: 0, rateUnit: 'INR/hour' }
        ]
      }
    };
    const findings = validateRouting(context);
    expect(findings.some(f => f.code === 'ROUTING_MISSING_MACHINE_RATE')).toBe(true);
    // Verified: No finding flags missing labor rate
    expect(findings.some(f => f.code.includes('LABOR'))).toBe(false);
  });
});

describe('AI Review Deterministic Commercial Validation', () => {
  it('flags COMMERCIAL_PLANT_NOT_APPROVED when costing revision is not approved by plant head', () => {
    const context = {
      costingRevision: { status: 'pending_review', calculations: { components: { sellingPrice: 500, totalManufacturingCost: 400, margin: 100 } } },
      commercialReview: { status: 'pending' },
      commercialConfig: { highValueThreshold: 100000 }
    };
    const findings = validateCommercial(context);
    expect(findings.some(f => f.code === 'COMMERCIAL_PLANT_NOT_APPROVED')).toBe(true);
    expect(findings.find(f => f.code === 'COMMERCIAL_PLANT_NOT_APPROVED').severity).toBe('critical');
  });

  it('flags COMMERCIAL_SELLING_BELOW_COST when selling price is less than total manufacturing cost', () => {
    const context = {
      costingRevision: { status: 'approved', calculations: { components: { sellingPrice: 350, totalManufacturingCost: 400, margin: -50 } } },
      commercialReview: { status: 'pending' },
      commercialConfig: { highValueThreshold: 100000 }
    };
    const findings = validateCommercial(context);
    expect(findings.some(f => f.code === 'COMMERCIAL_SELLING_BELOW_COST')).toBe(true);
  });

  it('flags COMMERCIAL_LOW_MARGIN when margin percentage is below 10%', () => {
    const context = {
      costingRevision: { status: 'approved', calculations: { components: { sellingPrice: 1050, totalManufacturingCost: 1000, margin: 50 } } },
      commercialReview: { status: 'pending' },
      commercialConfig: { highValueThreshold: 100000 }
    };
    const findings = validateCommercial(context);
    expect(findings.some(f => f.code === 'COMMERCIAL_LOW_MARGIN')).toBe(true);
    expect(findings.find(f => f.code === 'COMMERCIAL_LOW_MARGIN').severity).toBe('warning');
  });

  it('flags COMMERCIAL_HIGH_VALUE_THRESHOLD when unit selling price meets or exceeds threshold', () => {
    const context = {
      costingRevision: { status: 'approved', calculations: { components: { sellingPrice: 150000, totalManufacturingCost: 120000, margin: 30000 } } },
      commercialReview: { status: 'pending' },
      commercialConfig: { highValueThreshold: 100000 }
    };
    const findings = validateCommercial(context);
    expect(findings.some(f => f.code === 'COMMERCIAL_HIGH_VALUE_THRESHOLD')).toBe(true);
    expect(findings.find(f => f.code === 'COMMERCIAL_HIGH_VALUE_THRESHOLD').severity).toBe('info');
  });
});

describe('AI Review Canonical Type Mapping', () => {
  it('maps aliases correctly to canonical review types', () => {
    expect(canonicalReviewType('costing')).toBe('costing_review');
    expect(canonicalReviewType('routing')).toBe('routing_review');
    expect(canonicalReviewType('commercial')).toBe('commercial_review');
    expect(canonicalReviewType('costing_review')).toBe('costing_review');
  });
});

