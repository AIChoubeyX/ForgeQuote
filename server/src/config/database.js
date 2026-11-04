import pg from 'pg';
import { env } from './env.js';

const { Pool } = pg;

const useSsl = env.databaseUrl.includes('supabase.co') || env.databaseUrl.includes('pooler.supabase.com');

export const pool = new Pool({
  connectionString: env.databaseUrl,
  ssl: useSsl ? { rejectUnauthorized: false } : undefined
});

export const query = (text, params) => pool.query(text, params);
