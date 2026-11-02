import { query } from '../../config/database.js';
export async function findByEmail(email) { const result = await query('SELECT id,name,email,password_hash,role FROM users WHERE email=$1', [email]); return result.rows[0]; }
export async function findPublicById(id) { const result = await query('SELECT id,name,email,role FROM users WHERE id=$1', [id]); return result.rows[0]; }
