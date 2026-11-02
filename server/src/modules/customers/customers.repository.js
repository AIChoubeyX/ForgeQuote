import { query } from '../../config/database.js';
export async function list() { const result = await query('SELECT id,name,code FROM customers ORDER BY name'); return result.rows; }
