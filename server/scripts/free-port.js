import { execSync } from 'node:child_process';

const PORT = process.env.PORT || 4000;

try {
  if (process.platform === 'win32') {
    const netstat = execSync('netstat -ano -p tcp', { encoding: 'utf8' });
    const lines = netstat
      .split(/\r?\n/)
      .filter(line => line.includes(`:${PORT}`) && line.includes('LISTENING'));
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
        console.log(`[free-port] Cleared stale process PID ${pid} holding port ${PORT}`);
      } catch {}
    }
  } else {
    try {
      execSync(`fuser -k ${PORT}/tcp`, { stdio: 'ignore' });
    } catch {}
  }
} catch {}

