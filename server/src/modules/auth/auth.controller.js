import { env } from '../../config/env.js';
import { loginSchema } from './auth.validation.js';
import * as service from './auth.service.js';
export async function login(req, res) { const { user, token } = await service.authenticate(loginSchema.parse(req.body)); res.cookie('forgequote_token', token, { httpOnly: true, secure: env.cookieSecure, sameSite: env.cookieSecure ? 'none' : 'lax', maxAge: 8 * 60 * 60 * 1000 }); res.json({ user }); }
export function logout(_req, res) { res.clearCookie('forgequote_token'); res.status(204).end(); }
export async function me(req, res) { res.json({ user: await service.currentUser(req.user.id) }); }
