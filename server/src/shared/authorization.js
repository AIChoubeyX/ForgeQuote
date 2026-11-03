import { AppError } from './errors.js';

export const ROLES = ['estimator', 'sales_head', 'plant_head', 'admin'];

export const permissions = {
  estimator: ['dashboard:read', 'rfq:read', 'rfq:create', 'rfq:update:own', 'rate:read', 'costing:read', 'costing:write'],
  sales_head: ['dashboard:read', 'rfq:read:commercial', 'rate:read', 'costing:read'],
  plant_head: ['dashboard:read', 'rfq:read:routing', 'rate:read', 'costing:read', 'routing:review', 'routing:approve'],
  admin: ['dashboard:read', 'users:read', 'users:update', 'rate:read', 'rate:manage', 'audit:read', 'costing:read']
};

export function can(user, permission) {
  return Boolean(user?.role && permissions[user.role]?.includes(permission));
}

export function requirePermission(permission) {
  return (req, _res, next) => {
    if (!can(req.user, permission)) return next(new AppError(403, 'You do not have permission to perform this action'));
    next();
  };
}

export function assertRole(role) {
  if (!ROLES.includes(role)) throw new AppError(400, 'Invalid role');
}
