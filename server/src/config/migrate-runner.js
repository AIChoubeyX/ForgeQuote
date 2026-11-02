import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './database.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../migrations');
await pool.query('CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())');
const files = (await fs.readdir(root)).filter(file => file.endsWith('.sql')).sort();
for (const file of files) {
  const already = await pool.query('SELECT 1 FROM schema_migrations WHERE version=$1', [file]);
  if (already.rowCount) continue;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(await fs.readFile(path.join(root, file), 'utf8'));
    await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [file]);
    await client.query('COMMIT');
    console.log(`Applied ${file}`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}
await pool.end();
console.log('Migrations complete');
