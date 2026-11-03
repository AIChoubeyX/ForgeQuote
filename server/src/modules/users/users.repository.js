import { query } from '../../config/database.js';
export async function listEstimators() { const result = await query(`SELECT id,name,email FROM users WHERE role='estimator' ORDER BY name`); return result.rows; }
export async function listUsers() { const result = await query('SELECT id,name,email,role,created_at FROM users ORDER BY name'); return result.rows; }
