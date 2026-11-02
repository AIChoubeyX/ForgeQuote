import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const configDirectory = path.dirname(fileURLToPath(import.meta.url));
const serverEnvPath = path.resolve(configDirectory, '../../.env');
const rootEnvPath = path.resolve(configDirectory, '../../../.env');
const envPath = fs.existsSync(serverEnvPath) ? serverEnvPath : rootEnvPath;
dotenv.config({ path: envPath });

const required = process.env.NODE_ENV === 'test' ? [] : ['DATABASE_URL', 'JWT_SECRET'];
for (const name of required) {
  if (!process.env[name]) throw new Error(`${name} is required`);
}

export const env = {
  databaseUrl: process.env.DATABASE_URL || 'postgresql://localhost/forgequote_test',
  jwtSecret: process.env.JWT_SECRET || 'test-only-secret',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  port: Number(process.env.PORT || 4000),
  cookieSecure: process.env.COOKIE_SECURE === 'true'
};
