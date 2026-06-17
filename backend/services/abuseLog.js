import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_FILE = path.join(__dirname, '../data/abuse-log.ndjson');

/**
 * Registra evento de segurança/abuso em NDJSON append-only.
 * @param {'trial_created'|'trial_blocked'|'rate_limited'|'disposable_blocked'} event
 * @param {object} data
 */
export function logAbuse(event, data = {}) {
  try {
    const entry = JSON.stringify({
      timestamp: new Date().toISOString(),
      event,
      ...data,
    });
    const dir = path.dirname(LOG_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(LOG_FILE, entry + '\n');
  } catch (err) {
    console.error('[abuseLog] Falha ao registrar:', err.message);
  }
}
