import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { AppError } from '../errors.js';

export function authenticate(req, _res, next) {
  try {
    const token = req.cookies.forgequote_token;
    if (!token) throw new AppError(401, 'Authentication required');
    req.user = jwt.verify(token, env.jwtSecret);
    next();
  } catch (error) {
    next(error instanceof AppError ? error : new AppError(401, 'Authentication required'));
  }
}
