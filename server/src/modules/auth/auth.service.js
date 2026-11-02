import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { AppError } from '../../shared/errors.js';
import * as repository from './auth.repository.js';
export async function authenticate(credentials) { const user = await repository.findByEmail(credentials.email.toLowerCase()); if (!user || !(await bcrypt.compare(credentials.password, user.password_hash))) throw new AppError(401, 'Invalid email or password'); return { user: { id: user.id, name: user.name, email: user.email, role: user.role }, token: jwt.sign({ sub: user.id, name: user.name, email: user.email, role: user.role }, env.jwtSecret, { expiresIn: '8h' }) }; }
export async function currentUser(id) { const user = await repository.findPublicById(id); if (!user) throw new AppError(401, 'Authentication required'); return user; }
