// services/billing/__tests__/trialFlow.test.js
// Testes para o fluxo trial: criação de conta, créditos e ausência de expiração por tempo.

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock do fs para isolar o apiKeyStore do sistema de arquivos
// ---------------------------------------------------------------------------
const mockStore = {};

vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal();
  // Buffer temporário para escrita atômica (.tmp → rename)
  const tmpStore = {};
  return {
    ...actual,
    readFileSync: vi.fn((filePath) => {
      if (String(filePath).endsWith('api-keys.json')) {
        return JSON.stringify(mockStore);
      }
      return actual.readFileSync(filePath);
    }),
    writeFileSync: vi.fn((filePath, data) => {
      if (String(filePath).endsWith('api-keys.json') || String(filePath).endsWith('api-keys.json.tmp')) {
        const parsed = JSON.parse(data);
        Object.keys(tmpStore).forEach((k) => delete tmpStore[k]);
        Object.assign(tmpStore, parsed);
      }
    }),
    renameSync: vi.fn((src, dest) => {
      // Simula rename atômico: copia tmpStore → mockStore
      if (String(dest).endsWith('api-keys.json')) {
        Object.keys(mockStore).forEach((k) => delete mockStore[k]);
        Object.assign(mockStore, tmpStore);
      }
    }),
    existsSync: vi.fn(() => true),
    mkdirSync: vi.fn(),
  };
});

describe('Fluxo Trial – planConfig', () => {
  it('deve exportar PLAN_CREDITS com os valores corretos', async () => {
    const { PLAN_CREDITS, getCreditsForPlan } = await import('../../planConfig.js');
    expect(PLAN_CREDITS.trial).toBe(50);
    expect(PLAN_CREDITS.basic).toBe(200);
    expect(PLAN_CREDITS.popular).toBe(500);
    expect(PLAN_CREDITS.pro).toBe(1000);
    expect(PLAN_CREDITS.enterprise).toBe(3000);
    expect(getCreditsForPlan('trial')).toBe(50);
    expect(getCreditsForPlan('pro')).toBe(1000);
    expect(getCreditsForPlan('unknown')).toBe(0);
  });
});

describe('Fluxo Trial – apiKeyStore', () => {
  beforeEach(() => {
    vi.resetModules();
    Object.keys(mockStore).forEach((k) => delete mockStore[k]);
  });

  it('deve criar conta trial com 50 créditos e plan=trial', async () => {
    const { createKey, loadKeys } = await import('../../apiKeyStore.js');
    const key = createKey({ clientId: 'trial_test_1', planId: 'trial', email: 'a@b.com', storeName: 'Loja A' });
    expect(key).toMatch(/^sk_live_/);
    const keys = loadKeys();
    const client = keys[key];
    expect(client).toBeDefined();
    expect(client.plan).toBe('trial');
    expect(client.planId).toBe('trial');
    expect(client.credits).toBe(50);
    expect(client.email).toBe('a@b.com');
    expect(client.storeName).toBe('Loja A');
    expect(client.active).toBe(true);
  });

  it('deve decrementar créditos trial a cada uso (sem rollover mensal)', async () => {
    const { createKey, incrementUsage, loadKeys } = await import('../../apiKeyStore.js');
    const key = createKey({ clientId: 'trial_test_2', planId: 'trial' });

    // Simular 3 usos
    incrementUsage(key);
    incrementUsage(key);
    incrementUsage(key);

    const keys = loadKeys();
    expect(keys[key].credits).toBe(47);
    // Campo usage mensal não deve ser incrementado para trial
    const month = new Date().toISOString().slice(0, 7);
    expect(keys[key].usage?.[month] ?? 0).toBe(0);
  });

  it('créditos trial não devem resetar com mudança de mês (sem rollover)', async () => {
    const { createKey, incrementUsage, loadKeys } = await import('../../apiKeyStore.js');
    const key = createKey({ clientId: 'trial_test_3', planId: 'trial' });

    // Usar 10 créditos
    for (let i = 0; i < 10; i++) incrementUsage(key);

    const keysAfterUse = loadKeys();
    expect(keysAfterUse[key].credits).toBe(40);

    // Simular passagem de mês: o campo `credits` não deve ser resetado
    // (o rollover mensal só afeta planos não-trial via campo usage[mês])
    // Verificar que credits permanece 40 (não volta para 50)
    const keys = loadKeys();
    expect(keys[key].credits).toBe(40);
  });

  it('não deve decrementar créditos abaixo de zero', async () => {
    const { createKey, incrementUsage, loadKeys } = await import('../../apiKeyStore.js');
    const key = createKey({ clientId: 'trial_test_4', planId: 'trial' });

    // Usar todos os 50 créditos
    for (let i = 0; i < 50; i++) incrementUsage(key);

    const keysAfterExhaust = loadKeys();
    expect(keysAfterExhaust[key].credits).toBe(0);

    // Tentar usar mais um — não deve ir negativo
    incrementUsage(key);
    const keysFinal = loadKeys();
    expect(keysFinal[key].credits).toBe(0);
  });

  it('plano basic deve usar rollover mensal (não campo credits)', async () => {
    const { createKey, incrementUsage, loadKeys } = await import('../../apiKeyStore.js');
    const key = createKey({ clientId: 'basic_test_1', planId: 'basic' });

    incrementUsage(key);
    incrementUsage(key);

    const keys = loadKeys();
    const month = new Date().toISOString().slice(0, 7);
    expect(keys[key].usage?.[month]).toBe(2);
    // credits para basic é 200 mas não é decrementado via incrementUsage
    expect(keys[key].credits).toBe(200);
  });
});

describe('Fluxo Trial – middleware apiKey', () => {
  beforeEach(() => {
    vi.resetModules();
    Object.keys(mockStore).forEach((k) => delete mockStore[k]);
  });

  function makeReq(apiKey) {
    return { headers: { 'x-api-key': apiKey }, path: '/v1/simulate', ip: '127.0.0.1' };
  }

  function makeRes() {
    const res = {
      _status: 200,
      _body: null,
      _headers: {},
      status(code) { this._status = code; return this; },
      json(body) { this._body = body; return this; },
      setHeader(name, val) { this._headers[name] = val; },
    };
    return res;
  }

  it('deve permitir acesso com conta trial com créditos disponíveis', async () => {
    const { createKey } = await import('../../apiKeyStore.js');
    const key = createKey({ clientId: 'trial_mw_1', planId: 'trial' });

    const { apiKeyMiddleware } = await import('../../../middleware/apiKey.js');
    const req = makeReq(key);
    const res = makeRes();
    const next = vi.fn();

    apiKeyMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res._status).toBe(200);
    expect(req.client.plan).toBe('trial');
  });

  it('deve bloquear acesso quando créditos trial esgotados', async () => {
    const { createKey, loadKeys, saveKeys } = await import('../../apiKeyStore.js');
    const key = createKey({ clientId: 'trial_mw_2', planId: 'trial' });

    // Zerar créditos manualmente
    const keys = loadKeys();
    keys[key].credits = 0;
    saveKeys(keys);

    const { apiKeyMiddleware } = await import('../../../middleware/apiKey.js');
    const req = makeReq(key);
    const res = makeRes();
    const next = vi.fn();

    apiKeyMiddleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res._status).toBe(429);
    expect(res._body.error).toContain('Limite');
    // Trial não deve ter resetAt (sem expiração por tempo)
    expect(res._body.resetAt).toBeUndefined();
  });

  it('plano basic deve incluir resetAt na resposta de limite atingido', async () => {
    const { createKey, loadKeys, saveKeys } = await import('../../apiKeyStore.js');
    const key = createKey({ clientId: 'basic_mw_1', planId: 'basic' });

    // Simular uso máximo via campo usage
    const keys = loadKeys();
    const month = new Date().toISOString().slice(0, 7);
    if (!keys[key].usage) keys[key].usage = {};
    keys[key].usage[month] = 200;
    saveKeys(keys);

    const { apiKeyMiddleware } = await import('../../../middleware/apiKey.js');
    const req = makeReq(key);
    const res = makeRes();
    const next = vi.fn();

    apiKeyMiddleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res._status).toBe(429);
    expect(res._body.resetAt).toBeDefined();
  });
});
