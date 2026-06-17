// backend/services/core/__tests__/JobManager.test.js
// Testes unitários e property-based para JobManager.
// Feature: async-simulation-job

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fc from 'fast-check';
import { JobManager } from '../JobManager.js';

// Configura mínimo de 100 iterações para property tests
fc.configureGlobal({ numRuns: 100 });

describe('JobManager', () => {
  let manager;

  beforeEach(() => {
    manager = new JobManager();
  });

  afterEach(() => {
    manager.stop();
  });

  // --- Testes unitários ---

  describe('createJob', () => {
    it('retorna job com campos iniciais corretos', () => {
      const before = Date.now();
      const job = manager.createJob('client-1', 'key-abc', null);
      const after = Date.now();

      expect(job.id).toMatch(/^[0-9a-f-]{36}$/); // UUID v4
      expect(job.clientId).toBe('client-1');
      expect(job.cacheKey).toBe('key-abc');
      expect(job.webhookUrl).toBeNull();
      expect(job.status).toBe('pending');
      expect(job.progress).toBe(0);
      expect(job.createdAt).toBeGreaterThanOrEqual(before);
      expect(job.createdAt).toBeLessThanOrEqual(after);
      expect(job.result).toBeNull();
      expect(job.error).toBeNull();
    });

    it('job é recuperável via getJob imediatamente após criação', () => {
      const job = manager.createJob('client-1', 'key-abc');
      expect(manager.getJob(job.id)).toBe(job);
    });

    it('dois jobs com mesmo cacheKey têm IDs diferentes', () => {
      const job1 = manager.createJob('c1', 'same-key');
      const job2 = manager.createJob('c2', 'same-key');
      expect(job1.id).not.toBe(job2.id);
    });
  });

  describe('getJob', () => {
    it('retorna null para jobId inexistente', () => {
      expect(manager.getJob('nao-existe')).toBeNull();
    });

    it('retorna null para job expirado', () => {
      const job = manager.createJob('c1', 'key');
      // Simula expiração
      job.createdAt = Date.now() - JobManager.TTL_MS - 1;
      expect(manager.getJob(job.id)).toBeNull();
    });
  });

  describe('updateJob', () => {
    it('atualiza campos do job', () => {
      const job = manager.createJob('c1', 'key');
      manager.updateJob(job.id, { status: 'processing', progress: 10 });
      expect(job.status).toBe('processing');
      expect(job.progress).toBe(10);
    });

    it('retorna false para jobId inexistente', () => {
      expect(manager.updateJob('nao-existe', { status: 'failed' })).toBe(false);
    });
  });

  describe('findActiveJobByCacheKey', () => {
    it('retorna job pending com mesmo cacheKey', () => {
      const job = manager.createJob('c1', 'key-x');
      expect(manager.findActiveJobByCacheKey('key-x')).toBe(job);
    });

    it('retorna job processing com mesmo cacheKey', () => {
      const job = manager.createJob('c1', 'key-x');
      manager.updateJob(job.id, { status: 'processing' });
      expect(manager.findActiveJobByCacheKey('key-x')).toBe(job);
    });

    it('retorna null para job completed', () => {
      const job = manager.createJob('c1', 'key-x');
      manager.updateJob(job.id, { status: 'completed' });
      expect(manager.findActiveJobByCacheKey('key-x')).toBeNull();
    });

    it('retorna null para job failed', () => {
      const job = manager.createJob('c1', 'key-x');
      manager.updateJob(job.id, { status: 'failed' });
      expect(manager.findActiveJobByCacheKey('key-x')).toBeNull();
    });

    it('retorna null para cacheKey inexistente', () => {
      expect(manager.findActiveJobByCacheKey('nao-existe')).toBeNull();
    });
  });

  describe('findCompletedJobByCacheKey', () => {
    it('retorna job completed com mesmo cacheKey', () => {
      const job = manager.createJob('c1', 'key-x');
      manager.updateJob(job.id, { status: 'completed', result: { ok: true } });
      expect(manager.findCompletedJobByCacheKey('key-x')).toBe(job);
    });

    it('retorna null para job pending', () => {
      manager.createJob('c1', 'key-x');
      expect(manager.findCompletedJobByCacheKey('key-x')).toBeNull();
    });

    it('retorna null para job failed', () => {
      const job = manager.createJob('c1', 'key-x');
      manager.updateJob(job.id, { status: 'failed' });
      expect(manager.findCompletedJobByCacheKey('key-x')).toBeNull();
    });
  });

  describe('cleanup', () => {
    it('remove jobs expirados', () => {
      const job = manager.createJob('c1', 'key');
      job.createdAt = Date.now() - JobManager.TTL_MS - 1;
      manager.cleanup();
      expect(manager.getJob(job.id)).toBeNull();
    });

    it('marca jobs processing expirados como failed antes de remover', () => {
      const expiredJob = { ...manager.createJob('c1', 'key') };
      manager.updateJob(expiredJob.id, { status: 'processing' });
      const jobRef = manager.getJob(expiredJob.id);
      jobRef.createdAt = Date.now() - JobManager.TTL_MS - 1;

      const expiredJobs = [];
      manager.on('jobExpired', (j) => expiredJobs.push(j));
      manager.cleanup();

      expect(expiredJobs).toHaveLength(1);
      expect(expiredJobs[0].status).toBe('failed');
      expect(expiredJobs[0].error).toBe('Job expired during processing');
    });

    it('não remove jobs válidos', () => {
      const job = manager.createJob('c1', 'key');
      manager.cleanup();
      expect(manager.getJob(job.id)).toBe(job);
    });
  });

  describe('start / stop', () => {
    it('start inicia o timer de limpeza', () => {
      const spy = vi.spyOn(global, 'setInterval');
      manager.start();
      expect(spy).toHaveBeenCalledWith(expect.any(Function), JobManager.CLEANUP_INTERVAL_MS);
      spy.mockRestore();
    });

    it('stop cancela o timer', () => {
      const spy = vi.spyOn(global, 'clearInterval');
      manager.start();
      manager.stop();
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    it('start é idempotente (não cria múltiplos timers)', () => {
      const spy = vi.spyOn(global, 'setInterval');
      manager.start();
      manager.start();
      expect(spy).toHaveBeenCalledTimes(1);
      spy.mockRestore();
    });
  });

  // --- Property-based tests ---

  describe('Property 2: invariantes de criação do job', () => {
    // Feature: async-simulation-job, Property 2: invariantes de criação do job
    it('job criado tem campos iniciais corretos para qualquer input', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          fc.string({ minLength: 1 }),
          fc.option(fc.webUrl(), { nil: null }),
          (clientId, cacheKey, webhookUrl) => {
            const mgr = new JobManager();
            const before = Date.now();
            const job = mgr.createJob(clientId, cacheKey, webhookUrl);
            const after = Date.now();

            expect(job.status).toBe('pending');
            expect(job.progress).toBe(0);
            expect(job.createdAt).toBeGreaterThanOrEqual(before);
            expect(job.createdAt).toBeLessThanOrEqual(after);
            expect(mgr.getJob(job.id)).toBe(job);
            mgr.stop();
          }
        )
      );
    });
  });

  describe('Property 8: limpeza de jobs expirados', () => {
    // Feature: async-simulation-job, Property 8: limpeza de jobs expirados
    it('cleanup remove todos os jobs expirados e mantém os válidos', () => {
      fc.assert(
        fc.property(
          fc.array(fc.boolean(), { minLength: 1, maxLength: 20 }),
          (expiredFlags) => {
            const mgr = new JobManager();
            const jobs = expiredFlags.map((isExpired, i) => {
              const job = mgr.createJob(`client-${i}`, `key-${i}`);
              if (isExpired) {
                job.createdAt = Date.now() - JobManager.TTL_MS - 1000;
              }
              return { job, isExpired };
            });

            mgr.cleanup();

            for (const { job, isExpired } of jobs) {
              if (isExpired) {
                expect(mgr.getJob(job.id)).toBeNull();
              } else {
                expect(mgr.getJob(job.id)).toBe(job);
              }
            }
            mgr.stop();
          }
        )
      );
    });
  });

  describe('Property 9: deduplicação por cacheKey', () => {
    // Feature: async-simulation-job, Property 9: deduplicação por cacheKey
    it('findActiveJobByCacheKey retorna job existente quando pending/processing', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          fc.constantFrom('pending', 'processing', 'completed', 'failed'),
          (cacheKey, status) => {
            const mgr = new JobManager();
            const job = mgr.createJob('client', cacheKey);
            mgr.updateJob(job.id, { status });

            const active = mgr.findActiveJobByCacheKey(cacheKey);
            const completed = mgr.findCompletedJobByCacheKey(cacheKey);

            if (status === 'pending' || status === 'processing') {
              expect(active).toBe(job);
              expect(completed).toBeNull();
            } else if (status === 'completed') {
              expect(active).toBeNull();
              expect(completed).toBe(job);
            } else {
              // failed
              expect(active).toBeNull();
              expect(completed).toBeNull();
            }
            mgr.stop();
          }
        )
      );
    });
  });
});
