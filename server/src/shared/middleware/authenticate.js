import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { AppError } from '../errors.js';
import { query } from '../../config/database.js';

export async function authenticate(req, _res, next) {
  try {
    const token = req.cookies.forgequote_token;
    if (!token) throw new AppError(401, 'Authentication required');
    const claims = jwt.verify(token, env.jwtSecret);
    const result = await query('SELECT id,name,email,role FROM users WHERE id=$1', [claims.sub]);
    if (!result.rows[0]) throw new AppError(401, 'Authentication required');
    req.user = result.rows[0];
    next();
  } catch (error) {
    next(error instanceof AppError ? error : new AppError(401, 'Authentication required'));
  }
}
