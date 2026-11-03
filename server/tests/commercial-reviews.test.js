import { describe, expect, it } from 'vitest';
import { decisionSchema } from '../src/modules/commercialReviews/commercialReviews.validation.js';

describe('commercial review validation', () => {
  it('requires a decision comment and optimistic version', () => {
    expect(decisionSchema.parse({ decision: 'approved', comment: 'Approved', rowVersion: 1 }).decision).toBe('approved');
    expect(() => decisionSchema.parse({ decision: 'approved', comment: '', rowVersion: 1 })).toThrow();
    expect(() => decisionSchema.parse({ decision: 'approved', comment: 'Approved', rowVersion: 0 })).toThrow();
  });
});
