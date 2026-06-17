// backend/__tests__/asyncSimulate.test.js
// Testes de integração do fluxo completo de simulação assíncrona.
// Feature: async-simulation-job

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '../server.js';
import { jobManager } from '../services/core/JobManager.js';
import { clearSimulationCache } from '../services/core/simulationCache.js';

// Mock das dependências externas para testes de integração
vi.mock('../services/ai/roomAnalyzer.js', () => ({
  analyzeRoom: vi.fn().mockResolvedValue({
    geometry: 'rectangular',
    obstacles: 2,
    lighting: 'good',
    floorArea: 20,
  }),
}));

vi.mock('../services/ai/materialApplier.js', () => ({
  applyMaterial: vi.fn().mockResolvedValue({
    editedImageBase64: 'data:image/jpeg;base64,/9j/mockimage',
    fidelity: 0.85,
    context: { geometry: 'rectangular' },
    fallback: false,
    provider: 'wavespeed-ai',
  }),
}));

vi.mock('../services/core/validator.js', () => ({
  validateInvariants: vi.fn().mockResolvedValue({
    violated: false,
    scores: { shadows: 0.9, geometry: 0.9, objects: 0.9, perspective: 0.9 },
    overallScore: 0.9,
  }),
}));

vi.mock('../services/apiKeyStore.js', async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original,
    loadKeys: vi.fn().mockReturnValue({
      'sk_test_key': {
        clientId: 'test-client',
        plan: 'basic',
        planId: 'basic',
        active: true,
        credits: 100,
        usage: {},
        createdAt: new Date().toISOString(),
      },
    }),
    incrementUsage: vi.fn(),
    getUsage: vi.fn().mockReturnValue(0),
    ensureDemoClient: vi.fn().mockReturnValue({
      key: 'sk_demo_public',
      client: { clientId: 'demo-public', plan: 'demo', credits: 10, active: true },
    }),
    PLAN_LIMITS: original.PLAN_LIMITS,
  };
});

const VALID_BODY = {
  imageBase64: 'data:image/jpeg;base64,' + 'A'.repeat(1000),
  material: { type: 'porcelain', color: 'white', dimensions: '60x60cm' },
};

const AUTH_HEADERS = { 'x-api-key': 'sk_test_key' };

describe('POST /v1/simulate — Modo Assíncrono (padrão)', () => {
  beforeEach(() => {
    // Limpa todos os jobs e o cache síncrono entre testes
    jobManager.clear();
    clearSimulationCache();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('retorna 202 com jobId e statusUrl para requisição válida', async () => {
    const res = await request(app)
      .post('/v1/simulate')
      .set(AUTH_HEADERS)
      .send(VALID_BODY);

    expect(res.status).toBe(202);
    expect(res.body).toHaveProperty('jobId');
    expect(res.body).toHaveProperty('statusUrl');
    expect(res.body.statusUrl).toMatch(/^\/v1\/simulate\/.+\/status$/);
    expect(res.body.jobId).toMatch(/^[0-9a-f-]{36}$/); // UUID v4
  });

  it('retorna 400 para imageBase64 ausente', async () => {
    const res = await request(app)
      .post('/v1/simulate')
      .set(AUTH_HEADERS)
      .send({ material: VALID_BODY.material });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Bad Request');
  });

  it('retorna 400 para material incompleto', async () => {
    const res = await request(app)
      .post('/v1/simulate')
      .set(AUTH_HEADERS)
      .send({ imageBase64: VALID_BODY.imageBase64, material: { type: 'porcelain' } });

    expect(res.status).toBe(400);
  });

  it('retorna 400 para webhookUrl inválida', async () => {
    const res = await request(app)
      .post('/v1/simulate')
      .set(AUTH_HEADERS)
      .send({ ...VALID_BODY, webhookUrl: 'not-a-url' });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('webhookUrl');
  });

  it('retorna 401 sem API key', async () => {
    const res = await request(app)
      .post('/v1/simulate')
      .send(VALID_BODY);

    expect(res.status).toBe(401);
  });

  it('deduplicação: segunda requisição com mesmo cacheKey retorna jobId existente ou cache hit', async () => {
    const res1 = await request(app)
      .post('/v1/simulate')
      .set(AUTH_HEADERS)
      .send(VALID_BODY);

    // Primeira requisição deve retornar 202 (job criado)
    expect(res1.status).toBe(202);
    const jobId1 = res1.body.jobId;
    expect(jobId1).toMatch(/^[0-9a-f-]{36}$/);

    const res2 = await request(app)
      .post('/v1/simulate')
      .set(AUTH_HEADERS)
      .send(VALID_BODY);

    // Segunda requisição com mesmo cacheKey: ou deduplica (202 com mesmo jobId)
    // ou retorna cache hit (200 com result) se o job já completou via setImmediate
    expect([202, 200]).toContain(res2.status);
    if (res2.status === 202) {
      expect(res2.body.jobId).toBe(jobId1);
    } else {
      // Cache hit: job completou antes da segunda requisição
      expect(res2.body).toHaveProperty('editedImageBase64');
    }
  });
});

describe('GET /v1/simulate/:jobId/status', () => {
  it('retorna 404 para jobId inexistente', async () => {
    const res = await request(app)
      .get('/v1/simulate/nao-existe/status')
      .set(AUTH_HEADERS);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Job not found or expired');
  });

  it('retorna 401 sem API key', async () => {
    const res = await request(app)
      .get('/v1/simulate/qualquer-id/status');

    expect(res.status).toBe(401);
  });

  it('retorna status do job após criação', async () => {
    // Cria o job diretamente no JobManager para ter controle total sobre o estado
    const job = jobManager.createJob('test-client', 'unique-key-for-status-test');

    const statusRes = await request(app)
      .get(`/v1/simulate/${job.id}/status`)
      .set(AUTH_HEADERS);

    expect(statusRes.status).toBe(200);
    expect(statusRes.body.jobId).toBe(job.id);
    expect(['pending', 'processing', 'completed', 'failed']).toContain(statusRes.body.status);
    expect(statusRes.body).toHaveProperty('progress');
    expect(statusRes.body).toHaveProperty('createdAt');
  });

  it('job completed inclui result na resposta', async () => {
    const job = jobManager.createJob('test-client', 'test-key-completed');
    jobManager.updateJob(job.id, {
      status: 'completed',
      progress: 100,
      result: { editedImageBase64: 'data:image/jpeg;base64,mock', fidelity: 0.85 },
    });

    const res = await request(app)
      .get(`/v1/simulate/${job.id}/status`)
      .set(AUTH_HEADERS);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('completed');
    expect(res.body).toHaveProperty('result');
    expect(res.body.result).toHaveProperty('editedImageBase64');
  });

  it('job failed inclui error na resposta', async () => {
    const job = jobManager.createJob('test-client', 'test-key-failed');
    jobManager.updateJob(job.id, {
      status: 'failed',
      error: 'Provider timeout',
    });

    const res = await request(app)
      .get(`/v1/simulate/${job.id}/status`)
      .set(AUTH_HEADERS);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('failed');
    expect(res.body.error).toBe('Provider timeout');
  });
});

describe('POST /v1/simulate — Modo Síncrono (X-Sync-Mode: true)', () => {
  it('retorna 200 com resultado direto no modo síncrono', async () => {
    const res = await request(app)
      .post('/v1/simulate')
      .set({ ...AUTH_HEADERS, 'x-sync-mode': 'true' })
      .send(VALID_BODY);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('editedImageBase64');
    expect(res.body).toHaveProperty('fidelity');
  });

  it('modo síncrono não cria job no JobManager', async () => {
    const sizeBefore = jobManager.size;

    await request(app)
      .post('/v1/simulate')
      .set({ ...AUTH_HEADERS, 'x-sync-mode': 'true' })
      .send(VALID_BODY);

    expect(jobManager.size).toBe(sizeBefore);
  });
});
