// backend/__tests__/contract.simulate-jobmanager.test.js
// Testes de contrato: verifica que a interface entre routes/simulate.js
// e services/core/JobManager.js permanece estável.
//
// Esses testes falham imediatamente se:
// - JobManager.createJob() mudar a forma do objeto retornado
// - JobManager.findActiveJobByCacheKey() ou findCompletedJobByCacheKey() mudarem o contrato
// - O endpoint POST /v1/simulate mudar o formato da resposta 202
// - O endpoint GET /v1/simulate/:jobId/status mudar o formato da resposta 200

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { JobManager } from '../services/core/JobManager.js';

// --- Mocks de dependências externas ---
vi.mock('../services/ai/roomAnalyzer.js', () => ({
  analyzeRoom: vi.fn().mockResolvedValue({
    geometry: 'rectangular',
    obstacles: 2,
    lighting: 'natural',
    floorArea: 20,
    roomType: 'living',
  }),
}));

vi.mock('../services/ai/materialApplier.js', () => ({
  applyMaterial: vi.fn().mockResolvedValue({
    editedImageBase64: 'edited-base64',
    fidelity: 0.85,
    provider: 'wavespeed',
    fallback: false,
  }),
}));

vi.mock('../services/core/validator.js', () => ({
  validateInvariants: vi.fn().mockResolvedValue({
    violated: false,
    overallScore: 0.9,
    scores: { shadows: 0.9, geometry: 0.9, objects: 0.9, perspective: 0.9 },
  }),
}));

vi.mock('../services/core/simulationCache.js', () => ({
  getSimulationCacheKey: vi.fn().mockReturnValue('test-cache-key'),
  getCachedSimulation: vi.fn().mockReturnValue(null),
  setCachedSimulation: vi.fn(),
}));

vi.mock('../services/core/webhookNotifier.js', () => ({
  sendWebhookNotification: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../services/apiKeyStore.js', () => ({
  incrementUsage: vi.fn(),
  loadKeys: vi.fn().mockReturnValue({}),
}));

vi.mock('../middleware/apiKey.js', () => ({
  apiKeyMiddleware: (req, _res, next) => {
    req.client = { clientId: 'test-client', key: 'sk_live_test', planId: 'basic' };
    next();
  },
}));

// Importa app após os mocks
const { default: app } = await import('../server.js');

// ============================================================
// CONTRATO 1: JobManager.createJob() — forma do objeto retornado
// ============================================================
describe('Contrato: JobManager.createJob()', () => {
  let jm;

  beforeEach(() => {
    jm = new JobManager();
  });

  it('retorna objeto com campos obrigatórios do contrato', () => {
    const job = jm.createJob('client-1', 'cache-key-1', null);

    // Campos que simulate.js e status.js dependem
    expect(job).toMatchObject({
      id: expect.any(String),
      clientId: 'client-1',
      cacheKey: 'cache-key-1',
      webhookUrl: null,
      status: 'pending',
      progress: 0,
      createdAt: expect.any(Number),
      result: null,
      error: null,
    });
  });

  it('id é um UUID v4 válido', () => {
    const job = jm.createJob('client-1', 'cache-key-1');
    expect(job.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });

  it('status inicial é sempre "pending"', () => {
    const job = jm.createJob('client-1', 'cache-key-1');
    expect(job.status).toBe('pending');
  });

  it('progress inicial é sempre 0', () => {
    const job = jm.createJob('client-1', 'cache-key-1');
    expect(job.progress).toBe(0);
  });
});

// ============================================================
// CONTRATO 2: JobManager.updateJob() — merge parcial
// ============================================================
describe('Contrato: JobManager.updateJob()', () => {
  let jm;

  beforeEach(() => {
    jm = new JobManager();
  });

  it('atualiza apenas os campos fornecidos', () => {
    const job = jm.createJob('client-1', 'cache-key-1');
    jm.updateJob(job.id, { status: 'processing', progress: 25 });

    const updated = jm.getJob(job.id);
    expect(updated.status).toBe('processing');
    expect(updated.progress).toBe(25);
    expect(updated.clientId).toBe('client-1'); // não alterado
  });

  it('retorna false para jobId inexistente', () => {
    const result = jm.updateJob('non-existent-id', { status: 'completed' });
    expect(result).toBe(false);
  });

  it('status "completed" com result é acessível via getJob()', () => {
    const job = jm.createJob('client-1', 'cache-key-1');
    const result = { editedImageBase64: 'base64', fidelity: 0.85, context: {} };
    jm.updateJob(job.id, { status: 'completed', progress: 100, result });

    const completed = jm.getJob(job.id);
    expect(completed.status).toBe('completed');
    expect(completed.result).toEqual(result);
  });

  it('status "failed" com error é acessível via getJob()', () => {
    const job = jm.createJob('client-1', 'cache-key-1');
    jm.updateJob(job.id, { status: 'failed', error: 'Provider timeout' });

    const failed = jm.getJob(job.id);
    expect(failed.status).toBe('failed');
    expect(failed.error).toBe('Provider timeout');
  });
});

// ============================================================
// CONTRATO 3: findActiveJobByCacheKey() e findCompletedJobByCacheKey()
// ============================================================
describe('Contrato: deduplicação por cacheKey', () => {
  let jm;

  beforeEach(() => {
    jm = new JobManager();
  });

  it('findActiveJobByCacheKey retorna job pending', () => {
    const job = jm.createJob('client-1', 'cache-key-1');
    const found = jm.findActiveJobByCacheKey('cache-key-1');
    expect(found?.id).toBe(job.id);
  });

  it('findActiveJobByCacheKey retorna job processing', () => {
    const job = jm.createJob('client-1', 'cache-key-1');
    jm.updateJob(job.id, { status: 'processing' });
    const found = jm.findActiveJobByCacheKey('cache-key-1');
    expect(found?.id).toBe(job.id);
  });

  it('findActiveJobByCacheKey retorna null para job completed', () => {
    const job = jm.createJob('client-1', 'cache-key-1');
    jm.updateJob(job.id, { status: 'completed' });
    const found = jm.findActiveJobByCacheKey('cache-key-1');
    expect(found).toBeNull();
  });

  it('findCompletedJobByCacheKey retorna job completed', () => {
    const job = jm.createJob('client-1', 'cache-key-1');
    jm.updateJob(job.id, { status: 'completed', result: { editedImageBase64: 'b64' } });
    const found = jm.findCompletedJobByCacheKey('cache-key-1');
    expect(found?.id).toBe(job.id);
  });

  it('findCompletedJobByCacheKey retorna null para job pending', () => {
    jm.createJob('client-1', 'cache-key-1');
    const found = jm.findCompletedJobByCacheKey('cache-key-1');
    expect(found).toBeNull();
  });

  it('findActiveJobByCacheKey retorna null para cacheKey desconhecido', () => {
    expect(jm.findActiveJobByCacheKey('unknown-key')).toBeNull();
  });

  it('findCompletedJobByCacheKey retorna null para cacheKey desconhecido', () => {
    expect(jm.findCompletedJobByCacheKey('unknown-key')).toBeNull();
  });
});

// ============================================================
// CONTRATO 4: POST /v1/simulate — formato da resposta 202
// ============================================================
describe('Contrato: POST /v1/simulate → 202', () => {
  it('resposta 202 contém jobId (string) e statusUrl (string)', async () => {
    const res = await request(app)
      .post('/v1/simulate')
      .set('X-API-Key', 'sk_live_test')
      .send({
        imageBase64: 'base64data',
        material: { type: 'porcelanato', color: 'cinza', dimensions: '60x60cm' },
      });

    expect(res.status).toBe(202);
    expect(res.body).toMatchObject({
      jobId: expect.any(String),
      statusUrl: expect.stringMatching(/^\/v1\/simulate\/.+\/status$/),
    });
  });

  it('statusUrl contém o mesmo jobId da resposta', async () => {
    const res = await request(app)
      .post('/v1/simulate')
      .set('X-API-Key', 'sk_live_test')
      .send({
        imageBase64: 'base64data',
        material: { type: 'porcelanato', color: 'cinza', dimensions: '60x60cm' },
      });

    expect(res.status).toBe(202);
    expect(res.body.statusUrl).toBe(`/v1/simulate/${res.body.jobId}/status`);
  });
});

// ============================================================
// CONTRATO 5: GET /v1/simulate/:jobId/status — formato da resposta
// ============================================================
describe('Contrato: GET /v1/simulate/:jobId/status', () => {
  it('resposta 200 para job pending contém campos obrigatórios', async () => {
    // Cria job via POST
    const postRes = await request(app)
      .post('/v1/simulate')
      .set('X-API-Key', 'sk_live_test')
      .send({
        imageBase64: 'base64data',
        material: { type: 'porcelanato', color: 'cinza', dimensions: '60x60cm' },
      });

    const { jobId } = postRes.body;

    const statusRes = await request(app)
      .get(`/v1/simulate/${jobId}/status`)
      .set('X-API-Key', 'sk_live_test');

    expect(statusRes.status).toBe(200);
    expect(statusRes.body).toMatchObject({
      jobId: expect.any(String),
      status: expect.stringMatching(/^(pending|processing|completed|failed)$/),
      progress: expect.any(Number),
      createdAt: expect.any(Number),
    });
  });

  it('resposta 404 para jobId inexistente', async () => {
    const res = await request(app)
      .get('/v1/simulate/non-existent-job-id/status')
      .set('X-API-Key', 'sk_live_test');

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });

  it('resposta 200 para job completed inclui result', async () => {
    // Injeta job completed diretamente no jobManager singleton
    const { jobManager } = await import('../services/core/JobManager.js');
    const job = jobManager.createJob('test-client', 'contract-test-key');
    jobManager.updateJob(job.id, {
      status: 'completed',
      progress: 100,
      result: { editedImageBase64: 'edited', fidelity: 0.85, context: {} },
    });

    const res = await request(app)
      .get(`/v1/simulate/${job.id}/status`)
      .set('X-API-Key', 'sk_live_test');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('completed');
    expect(res.body.result).toMatchObject({
      editedImageBase64: expect.any(String),
      fidelity: expect.any(Number),
    });
  });

  it('resposta 200 para job failed inclui error', async () => {
    const { jobManager } = await import('../services/core/JobManager.js');
    const job = jobManager.createJob('test-client', 'contract-test-key-2');
    jobManager.updateJob(job.id, {
      status: 'failed',
      error: 'Provider timeout',
    });

    const res = await request(app)
      .get(`/v1/simulate/${job.id}/status`)
      .set('X-API-Key', 'sk_live_test');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('failed');
    expect(res.body.error).toBe('Provider timeout');
  });
});
