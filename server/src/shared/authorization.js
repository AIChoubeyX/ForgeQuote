import { AppError } from './errors.js';

export const ROLES = ['estimator', 'sales_head', 'plant_head', 'admin'];

export const permissions = {
  estimator: ['dashboard:read', 'rfq:read', 'rfq:create', 'rfq:update:own', 'rfq:documents:read', 'rfq:documents:write', 'rate:read', 'costing:read', 'costing:write', 'quotation:read', 'ai:intake', 'ai:review'],
  sales_head: ['dashboard:read', 'rfq:read:commercial', 'rfq:documents:read', 'rate:read', 'costing:read', 'commercial:review', 'quotation:read', 'quotation:download', 'ai:review'],
  plant_head: ['dashboard:read', 'rfq:read:routing', 'rfq:documents:read', 'rate:read', 'costing:read', 'routing:review', 'routing:approve', 'ai:review'],
  admin: ['dashboard:read', 'users:read', 'users:update', 'rfq:documents:read', 'rate:read', 'rate:manage', 'audit:read', 'quotation:read', 'quotation:download', 'costing:read', 'ai:review']
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
