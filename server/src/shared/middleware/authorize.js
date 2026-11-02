import { AppError } from '../errors.js';
export const authorize = (...roles) => (req, _res, next) => roles.includes(req.user?.role) ? next() : next(new AppError(403, 'You do not have permission for this action'));
