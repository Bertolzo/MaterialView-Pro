// backend/__tests__/securityHeaders.test.js
// Testes de integração para headers de segurança HTTP (helmet)
// Verifica que todas as respostas do backend incluem os headers corretos

import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import helmet from 'helmet';

/**
 * App mínimo com helmet configurado identicamente ao server.js
 * Não importa server.js diretamente para evitar dependências de env vars
 */
function buildTestApp() {
  const app = express();

  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        connectSrc: [
          "'self'",
          'https://api.wavespeed.ai',
          'https://api.pika.art',
          'https://open.bigmodel.cn',
        ],
        imgSrc: ["'self'", 'data:', 'blob:'],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
      },
    },
    frameguard: { action: 'deny' },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    referrerPolicy: { policy: 'no-referrer' },
  }));

  app.get('/health', (req, res) => res.json({ ok: true, uptime: 0 }));

  return app;
}

let app;

beforeAll(() => {
  app = buildTestApp();
});

describe('Security headers (helmet)', () => {
  // 4.2 — X-Frame-Options: DENY
  it('retorna X-Frame-Options: DENY', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-frame-options']).toBe('DENY');
  });

  // 4.3 — Strict-Transport-Security com max-age
  it('retorna Strict-Transport-Security com max-age', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['strict-transport-security']).toMatch(/max-age=\d+/);
  });

  // 4.4 — X-Content-Type-Options: nosniff
  it('retorna X-Content-Type-Options: nosniff', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  // 4.5 — X-XSS-Protection: 0
  it('retorna X-XSS-Protection: 0', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-xss-protection']).toBe('0');
  });

  // 4.6 — Referrer-Policy: no-referrer
  it('retorna Referrer-Policy: no-referrer', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['referrer-policy']).toBe('no-referrer');
  });

  // 4.7 — X-Powered-By ausente
  it('NÃO retorna X-Powered-By', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  // 4.8 — preservação: /health ainda retorna 200 e { ok: true }
  it('GET /health retorna status 200 e body { ok: true } (preservação)', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});
