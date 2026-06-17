// backend/services/core/JobManager.js
// Gerenciador de jobs assíncronos para o padrão 202 Async Job.
// Armazena jobs em memória com TTL de 1 hora e limpeza periódica a cada 5 minutos.
// Índice secundário #cacheKeyIndex garante deduplicação em O(1).

import { randomUUID } from 'crypto';
import { EventEmitter } from 'events';

export class JobManager extends EventEmitter {
  #jobs = new Map();           // Map<jobId, SimulationJob>
  #cacheKeyIndex = new Map();  // Map<cacheKey, Set<jobId>>
  #cleanupTimer = null;

  static TTL_MS = 3_600_000;          // 1 hora
  static CLEANUP_INTERVAL_MS = 300_000; // 5 minutos

  /**
   * Inicia o ciclo de limpeza periódica de jobs expirados.
   * Deve ser chamado após o servidor iniciar.
   */
  start() {
    if (this.#cleanupTimer) return;
    this.#cleanupTimer = setInterval(() => this.cleanup(), JobManager.CLEANUP_INTERVAL_MS);
    // Evita que o timer impeça o processo de encerrar
    if (this.#cleanupTimer.unref) this.#cleanupTimer.unref();
  }

  /**
   * Para o ciclo de limpeza. Deve ser chamado no graceful shutdown.
   */
  stop() {
    if (this.#cleanupTimer) {
      clearInterval(this.#cleanupTimer);
      this.#cleanupTimer = null;
    }
  }

  /**
   * Cria um novo job de simulação.
   * @param {string} clientId - ID do cliente (req.client.clientId)
   * @param {string} cacheKey - SHA-256 de imageBase64 + material
   * @param {string|null} webhookUrl - URL para notificação opcional
   * @returns {SimulationJob} O job criado
   */
  createJob(clientId, cacheKey, webhookUrl = null) {
    const jobId = randomUUID();
    const job = {
      id: jobId,
      clientId,
      cacheKey,
      webhookUrl,
      status: 'pending',
      progress: 0,
      createdAt: Date.now(),
      result: null,
      error: null,
    };

    this.#jobs.set(jobId, job);

    // Atualiza índice secundário
    if (!this.#cacheKeyIndex.has(cacheKey)) {
      this.#cacheKeyIndex.set(cacheKey, new Set());
    }
    this.#cacheKeyIndex.get(cacheKey).add(jobId);

    return job;
  }

  /**
   * Retorna um job pelo ID, ou null se não encontrado ou expirado.
   * @param {string} jobId
   * @returns {SimulationJob|null}
   */
  getJob(jobId) {
    const job = this.#jobs.get(jobId);
    if (!job) return null;

    // Verifica expiração on-demand
    if (Date.now() - job.createdAt > JobManager.TTL_MS) {
      this._removeJob(jobId, job);
      return null;
    }

    return job;
  }

  /**
   * Atualiza campos de um job existente (merge parcial).
   * @param {string} jobId
   * @param {Partial<SimulationJob>} updates
   * @returns {boolean} true se o job foi encontrado e atualizado
   */
  updateJob(jobId, updates) {
    const job = this.#jobs.get(jobId);
    if (!job) return false;
    Object.assign(job, updates);
    return true;
  }

  /**
   * Busca um job ativo (pending ou processing) pelo cacheKey.
   * Usado para deduplicação: evita criar jobs duplicados.
   * @param {string} cacheKey
   * @returns {SimulationJob|null}
   */
  findActiveJobByCacheKey(cacheKey) {
    const jobIds = this.#cacheKeyIndex.get(cacheKey);
    if (!jobIds) return null;

    for (const jobId of jobIds) {
      const job = this.#jobs.get(jobId);
      if (job && (job.status === 'pending' || job.status === 'processing')) {
        return job;
      }
    }
    return null;
  }

  /**
   * Busca um job completado pelo cacheKey.
   * Usado para cache hit: retorna resultado sem reprocessar.
   * @param {string} cacheKey
   * @returns {SimulationJob|null}
   */
  findCompletedJobByCacheKey(cacheKey) {
    const jobIds = this.#cacheKeyIndex.get(cacheKey);
    if (!jobIds) return null;

    for (const jobId of jobIds) {
      const job = this.#jobs.get(jobId);
      if (job && job.status === 'completed') {
        // Verifica se ainda não expirou
        if (Date.now() - job.createdAt <= JobManager.TTL_MS) {
          return job;
        }
      }
    }
    return null;
  }

  /**
   * Remove jobs expirados do store e do índice secundário.
   * Jobs em "processing" expirados são marcados como "failed" antes da remoção.
   */
  cleanup() {
    const now = Date.now();
    for (const [jobId, job] of this.#jobs.entries()) {
      if (now - job.createdAt > JobManager.TTL_MS) {
        if (job.status === 'processing') {
          job.status = 'failed';
          job.error = 'Job expired during processing';
          this.emit('jobExpired', job);
        }
        this._removeJob(jobId, job);
      }
    }
  }

  /**
   * Remove um job do store principal e do índice secundário.
   * @private
   */
  _removeJob(jobId, job) {
    this.#jobs.delete(jobId);

    const cacheKeySet = this.#cacheKeyIndex.get(job.cacheKey);
    if (cacheKeySet) {
      cacheKeySet.delete(jobId);
      if (cacheKeySet.size === 0) {
        this.#cacheKeyIndex.delete(job.cacheKey);
      }
    }
  }

  /**
   * Retorna o número de jobs ativos (para métricas/admin).
   */
  get size() {
    return this.#jobs.size;
  }

  /**
   * Remove todos os jobs do store e do índice secundário.
   * Usado em testes para garantir estado limpo entre suites.
   */
  clear() {
    this.#jobs.clear();
    this.#cacheKeyIndex.clear();
  }
}

// Singleton exportado para uso em toda a aplicação
export const jobManager = new JobManager();
