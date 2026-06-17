// backend/services/apiKeyStore.js
// Armazenamento de API keys em JSON.
// MVP: arquivo local. Migrar para banco/Redis quando necessário.
// Proteção contra race condition: mutex em memória serializa escritas no mesmo processo.
// Para múltiplas instâncias, migrar para Redis (ADR-005).

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomBytes } from 'crypto';
import { PLAN_CREDITS } from './planConfig.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const KEYS_FILE = path.join(__dirname, '../data/api-keys.json');
const KEYS_FILE_TMP = KEYS_FILE + '.tmp';

export const PLAN_LIMITS = {
  trial: 50,
  basic: 200,
  popular: 500,
  pro: 1000,
  enterprise: 3000,
  unlimited: Infinity,
  demo: 10,
};

// Mutex em memória: serializa escritas concorrentes no mesmo processo.
// Não protege contra múltiplas instâncias — para isso, usar Redis.
let _writeLock = Promise.resolve();

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

export function loadKeys() {
  try {
    const raw = fs.readFileSync(KEYS_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/**
 * Salva keys de forma atômica: escreve em .tmp e faz rename.
 * Isso evita corrupção do arquivo em caso de crash durante a escrita.
 */
export function saveKeys(keys) {
  try {
    const dir = path.dirname(KEYS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    // Escrita atômica: tmp → rename
    fs.writeFileSync(KEYS_FILE_TMP, JSON.stringify(keys, null, 2));
    fs.renameSync(KEYS_FILE_TMP, KEYS_FILE);
  } catch (err) {
    console.error('[apiKeyStore] Falha ao salvar keys:', err.message);
  }
}

/**
 * Executa uma operação de leitura-modificação-escrita de forma serializada.
 * Garante que duas chamadas concorrentes não sobrescrevam uma à outra.
 */
function withWriteLock(fn) {
  _writeLock = _writeLock.then(fn).catch((err) => {
    console.error('[apiKeyStore] Erro no write lock:', err.message);
  });
  return _writeLock;
}

export function getUsage(client) {
  const month = currentMonth();
  return client.usage?.[month] || 0;
}

export function incrementUsage(key) {
  return withWriteLock(() => {
    const keys = loadKeys();
    if (!keys[key]) return;
    const plan = keys[key].plan || keys[key].planId || 'basic';
    if (plan === 'trial' || plan === 'demo') {
      if (typeof keys[key].credits === 'number' && keys[key].credits > 0) {
        keys[key].credits -= 1;
      }
    } else {
      const month = currentMonth();
      if (!keys[key].usage) keys[key].usage = {};
      keys[key].usage[month] = (keys[key].usage[month] || 0) + 1;
    }
    saveKeys(keys);
  });
}

export function createKey({ clientId, planId = 'basic', email, storeName, referredBy } = {}) {
  const key = 'sk_live_' + randomBytes(16).toString('hex');
  withWriteLock(() => {
    const keys = loadKeys();
    const credits = PLAN_CREDITS[planId] ?? 0;
    keys[key] = {
      clientId,
      planId,
      plan: planId,
      active: true,
      createdAt: new Date().toISOString(),
      usage: {},
      credits,
      ...(email && { email }),
      ...(storeName && { storeName }),
      ...(referredBy && { referredBy }),
    };
    saveKeys(keys);
  });
  return key;
}

export function revokeKey(key) {
  let revoked = false;
  withWriteLock(() => {
    const keys = loadKeys();
    if (keys[key]) {
      keys[key].active = false;
      saveKeys(keys);
      revoked = true;
    }
  });
  // Lê estado atual para retorno síncrono (compatibilidade com callers existentes)
  const keys = loadKeys();
  return !!keys[key] && keys[key].active === false;
}

function todayUTC() {
  return new Date().toISOString().slice(0, 10);
}

export function ensureDemoClient() {
  const keys = loadKeys();
  const today = todayUTC();

  let demoKey = Object.keys(keys).find((k) => keys[k].clientId === 'demo-public');

  if (!demoKey) {
    demoKey = 'sk_demo_public';
    withWriteLock(() => {
      const k2 = loadKeys();
      k2[demoKey] = {
        clientId: 'demo-public',
        plan: 'demo',
        planId: 'demo',
        active: true,
        createdAt: new Date().toISOString(),
        usage: {},
        credits: 10,
        demoCreditsDate: today,
      };
      saveKeys(k2);
    });
    // Retorna estado otimista para não bloquear o request
    return {
      key: demoKey,
      client: {
        clientId: 'demo-public', plan: 'demo', planId: 'demo',
        active: true, credits: 10, demoCreditsDate: today,
      },
    };
  }

  const client = keys[demoKey];
  if (client.demoCreditsDate !== today) {
    withWriteLock(() => {
      const k2 = loadKeys();
      if (k2[demoKey]) {
        k2[demoKey].credits = 10;
        k2[demoKey].demoCreditsDate = today;
        saveKeys(k2);
      }
    });
    client.credits = 10;
    client.demoCreditsDate = today;
  }

  return { key: demoKey, client };
}
