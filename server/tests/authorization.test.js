import { describe, expect, it } from 'vitest';
import { authorize } from '../src/shared/middleware/authorize.js';
import { can } from '../src/shared/authorization.js';

describe('authorization middleware', () => {
  it('allows an authorized role', () => {
    const next = () => {};
    expect(() => authorize('admin')({ user: { role: 'admin' } }, {}, next)).not.toThrow();
  });
  it('rejects a role outside the policy', () => {
    const next = (error) => { throw error; };
    expect(() => authorize('admin')({ user: { role: 'estimator' } }, {}, next)).toThrow('permission');
  });
  it('keeps rate mutations limited to administrators', () => {
    expect(can({ role: 'admin' }, 'rate:manage')).toBe(true);
    expect(can({ role: 'estimator' }, 'rate:manage')).toBe(false);
    expect(can({ role: 'estimator' }, 'rate:read')).toBe(true);
  });
});
