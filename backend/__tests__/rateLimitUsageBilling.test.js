// backend/__tests__/rateLimitUsageBilling.test.js
// Testes para os rate limiters de /v1/usage e /v1/billing

import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import rateLimit from 'express-rate-limit';

function buildTestApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json());

  const usageLimiter = rateLimit({
    windowMs: 60_000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      const retryAfter = req.rateLimit?.resetTime
        ? Math.max(0, Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000))
        : 60;
      res.status(429).json({ error: 'Too Many Requests', retryAfter });
    },
  });

  const billingWebhookLimiter = rateLimit({
    windowMs: 60_000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      const retryAfter = req.rateLimit?.resetTime
        ? Math.max(0, Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000))
        : 60;
      res.status(429).json({ error: 'Too Many Requests', retryAfter });
    },
  });

  const billingLimiter = rateLimit({
    windowMs: 60_000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      const retryAfter = req.rateLimit?.resetTime
        ? Math.max(0, Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000))
        : 60;
      res.status(429).json({ error: 'Too Many Requests', retryAfter });
    },
  });

  app.use('/v1/usage', usageLimiter, (req, res) => res.json({ ok: true }));
  app.use('/v1/billing/webhook', billingWebhookLimiter, (req, res) => res.json({ ok: true }));
  app.use('/v1/billing', billingLimiter, (req, res) => res.json({ ok: true }));

  return app;
}

describe('Rate limiter — /v1/usage (30 req/min)', () => {
  let app;
  beforeEach(() => { app = buildTestApp(); });

  // Property 3 — dentro do limite passa
  it('permite as primeiras 30 requisições do mesmo IP', async () => {
    for (let i = 0; i < 30; i++) {
      const res = await request(app).get('/v1/usage').set('X-Forwarded-For', '1.2.3.4');
      expect(res.status).not.toBe(429);
    }
  });

  // Property 1 — 31ª retorna 429
  it('bloqueia a 31ª requisição do mesmo IP com 429', async () => {
    for (let i = 0; i < 30; i++) {
      await request(app).get('/v1/usage').set('X-Forwarded-For', '1.2.3.4');
    }
    const res = await request(app).get('/v1/usage').set('X-Forwarded-For', '1.2.3.4');
    expect(res.status).toBe(429);
    expect(res.body.error).toBe('Too Many Requests');
    expect(typeof res.body.retryAfter).toBe('number');
  });

  // Property 4 — isolamento por IP
  it('não bloqueia IP diferente quando outro IP esgotou o limite', async () => {
    for (let i = 0; i < 31; i++) {
      await request(app).get('/v1/usage').set('X-Forwarded-For', '1.2.3.4');
    }
    const res = await request(app).get('/v1/usage').set('X-Forwarded-For', '9.9.9.9');
    expect(res.status).not.toBe(429);
  });
});

describe('Rate limiter — /v1/billing/webhook (60 req/min)', () => {
  let app;
  beforeEach(() => { app = buildTestApp(); });

  // Property 2 — 61ª retorna 429
  it('bloqueia a 61ª requisição para /v1/billing/webhook com 429', async () => {
    for (let i = 0; i < 60; i++) {
      await request(app).post('/v1/billing/webhook').set('X-Forwarded-For', '1.2.3.4');
    }
    const res = await request(app).post('/v1/billing/webhook').set('X-Forwarded-For', '1.2.3.4');
    expect(res.status).toBe(429);
    expect(res.body.error).toBe('Too Many Requests');
  });

  it('permite as primeiras 60 requisições para /v1/billing/webhook', async () => {
    for (let i = 0; i < 60; i++) {
      const res = await request(app).post('/v1/billing/webhook').set('X-Forwarded-For', '1.2.3.4');
      expect(res.status).not.toBe(429);
    }
  });
});

describe('Rate limiter — /v1/billing geral (20 req/min)', () => {
  let app;
  beforeEach(() => { app = buildTestApp(); });

  it('bloqueia a 21ª requisição para /v1/billing com 429', async () => {
    for (let i = 0; i < 20; i++) {
      await request(app).get('/v1/billing').set('X-Forwarded-For', '1.2.3.4');
    }
    const res = await request(app).get('/v1/billing').set('X-Forwarded-For', '1.2.3.4');
    expect(res.status).toBe(429);
    expect(res.body.error).toBe('Too Many Requests');
  });

  it('permite as primeiras 20 requisições para /v1/billing', async () => {
    for (let i = 0; i < 20; i++) {
      const res = await request(app).get('/v1/billing').set('X-Forwarded-For', '1.2.3.4');
      expect(res.status).not.toBe(429);
    }
  });
});
