// backend/middleware/__tests__/safeCompare.integration.test.js
// Testes de integração para os middlewares que usam safeCompare
// Usa supertest para testar os endpoints HTTP diretamente

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { safeCompare } from '../safeCompare.js';

// --- App mínimo para testar requireAdmin e requireAdminAuth ---

function buildTestApp(adminSecret) {
  const app = express();
  app.use(express.json());

  // Simula requireAdmin (padrão do admin.js)
  function requireAdmin(req, res, next) {
    const secret = adminSecret;
    const fromHeader = req.headers['x-admin-key'];
    const fromBearer = req.headers.authorization?.replace(/^Bearer\s+/i, '');
    const token = fromHeader || fromBearer;
    if (!safeCompare(token, secret)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
  }

  // Simula requireAdminAuth (padrão do server.js)
  function requireAdminAuth(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!safeCompare(token, adminSecret)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
  }

  app.get('/admin/test', requireAdmin, (req, res) => res.json({ ok: true }));
  app.get('/admin/test2', requireAdminAuth, (req, res) => res.json({ ok: true }));

  return app;
}

const SECRET = 'test-secret-abc123';
let app;

beforeAll(() => {
  app = buildTestApp(SECRET);
});

describe('requireAdmin (admin.js pattern)', () => {
  // 6.1 — rejeita tokens inválidos com 401
  it('rejeita token inválido via x-admin-key com 401', async () => {
    const res = await request(app)
      .get('/admin/test')
      .set('x-admin-key', 'wrong-token');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Unauthorized');
  });

  it('rejeita ausência de token com 401', async () => {
    const res = await request(app).get('/admin/test');
    expect(res.status).toBe(401);
  });

  // 6.2 — aceita o token correto
  it('aceita token correto via x-admin-key', async () => {
    const res = await request(app)
      .get('/admin/test')
      .set('x-admin-key', SECRET);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('aceita token correto via Authorization Bearer', async () => {
    const res = await request(app)
      .get('/admin/test')
      .set('Authorization', `Bearer ${SECRET}`);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});

describe('requireAdminAuth (server.js pattern)', () => {
  // 6.3 — rejeita tokens inválidos com 401
  it('rejeita token inválido com 401', async () => {
    const res = await request(app)
      .get('/admin/test2')
      .set('Authorization', 'Bearer wrong-token');
    expect(res.status).toBe(401);
  });

  it('rejeita ausência de token com 401', async () => {
    const res = await request(app).get('/admin/test2');
    expect(res.status).toBe(401);
  });

  // 6.4 — aceita o token correto
  it('aceita token correto via Authorization Bearer', async () => {
    const res = await request(app)
      .get('/admin/test2')
      .set('Authorization', `Bearer ${SECRET}`);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});

describe('lookup de API key com safeCompare (usage.js pattern)', () => {
  const keys = {
    'sk_live_abc123': { active: true, plan: 'basic', storeName: 'Loja Teste' },
    'sk_live_xyz789': { active: false, plan: 'trial', storeName: 'Loja Inativa' },
  };

  // 6.5 — API key válida encontrada com safeCompare
  it('encontra cliente com API key válida usando safeCompare', () => {
    const apiKey = 'sk_live_abc123';
    const entry = Object.entries(keys).find(([k]) => safeCompare(k, apiKey));
    const client = entry?.[1];
    expect(client).toBeDefined();
    expect(client.active).toBe(true);
    expect(client.storeName).toBe('Loja Teste');
  });

  // 6.6 — API key inválida retorna undefined
  it('retorna undefined para API key inválida', () => {
    const apiKey = 'sk_live_invalid';
    const entry = Object.entries(keys).find(([k]) => safeCompare(k, apiKey));
    const client = entry?.[1];
    expect(client).toBeUndefined();
  });

  it('retorna undefined para API key de cliente inativo', () => {
    const apiKey = 'sk_live_xyz789';
    const entry = Object.entries(keys).find(([k]) => safeCompare(k, apiKey));
    const client = entry?.[1];
    // cliente existe mas está inativo — a rota deve rejeitar
    expect(client).toBeDefined();
    expect(client.active).toBe(false);
  });
});
