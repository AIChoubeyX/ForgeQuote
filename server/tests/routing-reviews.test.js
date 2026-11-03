import { describe, expect, it } from 'vitest';
import { decisionSchema } from '../src/modules/routingReviews/routingReviews.validation.js';
import { can } from '../src/shared/authorization.js';

describe('routing review decisions', () => {
  it('requires a decision explanation and optimistic version', () => {
    expect(decisionSchema.parse({ decision: 'approved', comment: 'Route is manufacturable', rowVersion: 1 }).rowVersion).toBe(1);
    expect(() => decisionSchema.parse({ decision: 'approved', comment: '', rowVersion: 1 })).toThrow();
    expect(() => decisionSchema.parse({ decision: 'approved', comment: 'Approved', rowVersion: 0 })).toThrow();
  });

  it('limits routing decisions to plant heads', () => {
    expect(can({ role: 'plant_head' }, 'routing:approve')).toBe(true);
    expect(can({ role: 'estimator' }, 'routing:approve')).toBe(false);
    expect(can({ role: 'sales_head' }, 'routing:approve')).toBe(false);
    expect(can({ role: 'admin' }, 'routing:approve')).toBe(false);
  });
});
