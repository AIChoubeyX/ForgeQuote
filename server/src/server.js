import http from 'node:http';
import { execSync } from 'node:child_process';
import { app } from './app.js';
import { env } from './config/env.js';

const PORT = env.port || 4000;
let retryCount = 0;
const MAX_RETRIES = 5;

function freePort(port) {
  try {
    if (process.platform === 'win32') {
      const netstat = execSync('netstat -ano -p tcp', { encoding: 'utf8' });
      const lines = netstat
        .split(/\r?\n/)
        .filter(line => line.includes(`:${port}`) && line.includes('LISTENING'));
      const pids = new Set();
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        const pid = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(pid) && pid > 0 && pid !== process.pid) {
          pids.add(pid);
        }
      }
      for (const pid of pids) {
        try {
          execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
          console.log(`[ForgeQuote] Cleared stale process PID ${pid} holding port ${port}`);
        } catch {}
      }
    } else {
      try {
        execSync(`fuser -k ${port}/tcp`, { stdio: 'ignore' });
      } catch {}
    }
  } catch {}
}

const server = http.createServer(app);

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    retryCount++;
    console.warn(`[ForgeQuote] Port ${PORT} is in use. Resolving conflict (attempt ${retryCount}/${MAX_RETRIES})...`);
    freePort(PORT);
    if (retryCount <= MAX_RETRIES) {
      setTimeout(() => {
        try {
          server.close();
        } catch {}
        start();
      }, 1000);
    } else {
      console.error(`[ForgeQuote] Could not bind to port ${PORT} after ${MAX_RETRIES} attempts.`);
      process.exit(1);
    }
  } else {
    console.error('[ForgeQuote] Server error:', err);
    process.exit(1);
  }
});

function start() {
  server.listen(PORT, '0.0.0.0', () => {
    retryCount = 0;
    console.log(`ForgeQuote API listening on http://0.0.0.0:${PORT}`);
  });
}

function shutdown(signal) {
  if (server.listening) {
    server.close(() => {
      process.exit(0);
    });
    setTimeout(() => process.exit(0), 1000).unref();
  } else {
    process.exit(0);
  }
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGUSR2', () => shutdown('SIGUSR2'));

start();
