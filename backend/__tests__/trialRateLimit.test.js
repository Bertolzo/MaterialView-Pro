// backend/__tests__/trialRateLimit.test.js
// Testes para os rate limiters de /v1/auth/trial e /v1/auth
// Usa app Express mínimo com rate limiters configurados identicamente ao server.js

import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import rateLimit from 'express-rate-limit';

/**
 * Cria um app Express mínimo com os mesmos rate limiters do server.js (produção).
 * Usa store em memória com windowMs configurável para facilitar testes.
 */
function buildTestApp({ trialWindowMs = 60 * 60 * 1000, authWindowMs = 15 * 60 * 1000 } = {}) {
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json());

  // Simula o trialLimiter do server.js
  const trialLimiter = rateLimit({
    windowMs: trialWindowMs,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    // Usa store em memória padrão (MemoryStore) — reseta entre instâncias de app
    handler: (req, res) => {
      const resetTime = req.rateLimit?.resetTime
        ? Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000)
        : 3600;
      res.status(429).json({ error: 'Too Many Requests', retryAfter: Math.max(0, resetTime) });
    },
  });

  // Simula o authLimiter do server.js
  const authLimiter = rateLimit({
    windowMs: authWindowMs,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      const resetTime = req.rateLimit?.resetTime
        ? Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000)
        : 900;
      res.status(429).json({ error: 'Too Many Requests', retryAfter: Math.max(0, resetTime) });
    },
  });

  app.post('/v1/auth/trial', trialLimiter, (req, res) => res.json({ ok: true }));
  app.use('/v1/auth', authLimiter, (req, res) => res.json({ ok: true }));

  return app;
}

describe('Rate limiter — /v1/auth/trial', () => {
  let app;

  beforeEach(() => {
    // Nova instância a cada teste — store em memória é resetado
    app = buildTestApp();
  });

  // 2.2 — primeiras 5 requisições passam
  it('permite as primeiras 5 requisições do mesmo IP', async () => {
    for (let i = 0; i < 5; i++) {
      const res = await request(app)
        .post('/v1/auth/trial')
        .set('X-Forwarded-For', '1.2.3.4');
      expect(res.status).not.toBe(429);
    }
  });

  // 2.3 — 6ª requisição retorna 429 com retryAfter
  it('bloqueia a 6ª requisição do mesmo IP com 429', async () => {
    for (let i = 0; i < 5; i++) {
      await request(app)
        .post('/v1/auth/trial')
        .set('X-Forwarded-For', '1.2.3.4');
    }
    const res = await request(app)
      .post('/v1/auth/trial')
      .set('X-Forwarded-For', '1.2.3.4');
    expect(res.status).toBe(429);
    expect(res.body.error).toBe('Too Many Requests');
    expect(typeof res.body.retryAfter).toBe('number');
    expect(res.body.retryAfter).toBeGreaterThanOrEqual(0);
  });

  // 2.5 — isolamento por IP
  it('não bloqueia IP diferente quando outro IP esgotou o limite', async () => {
    // Esgota o limite para IP 1
    for (let i = 0; i < 6; i++) {
      await request(app)
        .post('/v1/auth/trial')
        .set('X-Forwarded-For', '1.2.3.4');
    }
    // IP 2 ainda deve passar
    const res = await request(app)
      .post('/v1/auth/trial')
      .set('X-Forwarded-For', '5.6.7.8');
    expect(res.status).not.toBe(429);
  });
});

describe('Rate limiter — /v1/auth (geral)', () => {
  let app;

  beforeEach(() => {
    app = buildTestApp();
  });

  // 2.6 — /v1/auth usa limite de 20 requisições
  it('permite até 20 requisições para /v1/auth do mesmo IP', async () => {
    for (let i = 0; i < 20; i++) {
      const res = await request(app)
        .get('/v1/auth')
        .set('X-Forwarded-For', '1.2.3.4');
      expect(res.status).not.toBe(429);
    }
  });

  it('bloqueia a 21ª requisição para /v1/auth do mesmo IP', async () => {
    for (let i = 0; i < 20; i++) {
      await request(app)
        .get('/v1/auth')
        .set('X-Forwarded-For', '1.2.3.4');
    }
    const res = await request(app)
      .get('/v1/auth')
      .set('X-Forwarded-For', '1.2.3.4');
    expect(res.status).toBe(429);
    expect(res.body.error).toBe('Too Many Requests');
  });
});
