// backend/routes/simulate.js
// Suporta dois modos:
// - Assíncrono (padrão): retorna 202 imediatamente com jobId, processa em background
// - Síncrono legado: header X-Sync-Mode: true mantém comportamento anterior
import { Router } from 'express';
import crypto from 'crypto';
import { analyzeRoom } from '../services/ai/roomAnalyzer.js';
import { applyMaterial } from '../services/ai/materialApplier.js';
import { validateInvariants } from '../services/core/validator.js';
import { getSimulationCacheKey, getCachedSimulation, setCachedSimulation } from '../services/core/simulationCache.js';
import { jobManager } from '../services/core/JobManager.js';
import { sendWebhookNotification } from '../services/core/webhookNotifier.js';
import { apiKeyMiddleware } from '../middleware/apiKey.js';
import { incrementUsage } from '../services/apiKeyStore.js';
import { log } from '../services/gateway/logger.js';
import { getTracer, withSpan, getContext } from '../tracing.js';
import { getIdempotencyKey, getCachedIdempotentResult, setIdempotentResult } from '../middleware/idempotency.js';

const router = Router();

// Autenticação por API key em todas as rotas de simulação
router.use(apiKeyMiddleware);

function validateMaterial(material) {
  for (const field of ['type', 'color', 'dimensions']) {
    if (!material?.[field] || typeof material[field] !== 'string') {
      return field;
    }
  }
  return null;
}

/**
 * Valida que webhookUrl é uma URL http ou https válida.
 */
function isValidWebhookUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Executa o processamento completo de simulação (análise + IA + validação).
 * Usado tanto no modo síncrono quanto no background do modo assíncrono.
 */
async function runSimulation(imageBase64, material, clientKey) {
  const context = await analyzeRoom(imageBase64);
  const result = await applyMaterial(imageBase64, material, context);

  // Incrementa uso do cliente após chamada ao provider
  if (clientKey) {
    incrementUsage(clientKey);
  }

  if (result.fallback) {
    return { fallback: true, fallbackDescription: result.fallbackDescription };
  }

  const invariantResult = await validateInvariants(
    imageBase64,
    result.editedImageBase64,
    result.context || context
  );

  if (invariantResult.violated) {
    throw Object.assign(
      new Error(`Invariant violation: ${invariantResult.invariant}`),
      { invariantResult, provider: result.provider }
    );
  }

  return {
    fallback: false,
    editedImageBase64: result.editedImageBase64,
    fidelity: result.fidelity,
    context: result.context || context,
    provider: result.provider,
  };
}

router.post('/', async (req, res, next) => {
  const clientId = req.client?.clientId || 'anonymous';
  const startTime = Date.now();

  try {
    const { imageBase64, material, webhookUrl } = req.body;
    const syncMode = req.headers['x-sync-mode'] === 'true';

    // --- Validação de entrada (comum a ambos os modos) ---
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return res.status(400).json({
        error: 'Bad Request',
        message: "O campo 'imageBase64' é obrigatório.",
      });
    }

    if (!material || typeof material !== 'object') {
      return res.status(400).json({
        error: 'Bad Request',
        message: "O campo 'material' é obrigatório.",
      });
    }

    const missingField = validateMaterial(material);
    if (missingField) {
      return res.status(400).json({
        error: 'Bad Request',
        message: `O campo obrigatório 'material.${missingField}' está ausente.`,
      });
    }

    // Valida webhookUrl se fornecida (apenas no modo assíncrono)
    if (!syncMode && webhookUrl !== undefined && webhookUrl !== null) {
      if (typeof webhookUrl !== 'string' || !isValidWebhookUrl(webhookUrl)) {
        return res.status(400).json({
          error: 'Bad Request',
          message: "O campo 'webhookUrl' deve ser uma URL http ou https válida.",
        });
      }
    }

    // ---------------------------------------------------------
    // Idempotência: verifica Idempotency-Key antes de processar
    // ---------------------------------------------------------
    const idempotencyKey = getIdempotencyKey(req);
    if (idempotencyKey) {
      const cachedIdempotent = getCachedIdempotentResult(idempotencyKey);
      if (cachedIdempotent) {
        log('info', 'simulate', 'idempotency_replay', { clientId, idempotencyKey: idempotencyKey.slice(0, 8) });
        res.set('X-Idempotency', 'REPLAY');
        return res.status(200).json(cachedIdempotent);
      }
    }

    // =========================================================
    // MODO SÍNCRONO LEGADO (X-Sync-Mode: true)
    // Preserva comportamento anterior integralmente.
    // =========================================================
    if (syncMode) {
      const cacheKey = getSimulationCacheKey(imageBase64, material);
      const cached = getCachedSimulation(cacheKey);

      if (cached) {
        const cacheAgeSeconds = Math.floor((Date.now() - cached.cachedAt) / 1000);
        log('info', 'simulate', 'cache_hit', { clientId, cacheKey: cacheKey.slice(0, 8), cacheAgeSeconds, latencyMs: Date.now() - startTime });
        res.set('X-Cache', 'HIT');
        res.set('X-Cache-Age', String(cacheAgeSeconds));
        const { cachedAt: _, ...response } = cached;
        return res.status(200).json(response);
      }

      try {
        const simResult = await runSimulation(imageBase64, material, req.client?.key);

        if (simResult.fallback) {
          log('warn', 'simulate', 'fallback_activated', { clientId, reason: 'all_providers_failed', latencyMs: Date.now() - startTime });
          res.set('X-Cache', 'MISS');
          return res.status(200).json({ editedImageBase64: null, fidelity: 0.0, context: null, fallbackDescription: simResult.fallbackDescription });
        }

        const successResponse = { editedImageBase64: simResult.editedImageBase64, fidelity: simResult.fidelity, context: simResult.context };
        setCachedSimulation(cacheKey, successResponse);
        if (idempotencyKey) setIdempotentResult(idempotencyKey, successResponse);
        log('info', 'simulate', 'simulation_success', { clientId, provider: simResult.provider, fidelity: simResult.fidelity, latencyMs: Date.now() - startTime });
        res.set('X-Cache', 'MISS');
        return res.status(200).json(successResponse);
      } catch (err) {
        if (err.invariantResult) {
          const imageHash = crypto.createHash('sha256').update(imageBase64).digest('hex');
          log('info', 'simulate', 'invariant_violated', { clientId, invariant: err.invariantResult.invariant, provider: err.provider || 'unknown', imageHash });
          res.set('X-Cache', 'MISS');
          return res.status(409).json({ invariant: err.invariantResult.invariant, description: err.invariantResult.description, provider: err.provider || 'unknown' });
        }
        throw err;
      }
    }

    // =========================================================
    // MODO ASSÍNCRONO (padrão — sem X-Sync-Mode)
    // =========================================================
    const cacheKey = getSimulationCacheKey(imageBase64, material);

    // 1. Deduplicação: job ativo com mesmo cacheKey
    const activeJob = jobManager.findActiveJobByCacheKey(cacheKey);
    if (activeJob) {
      log('info', 'simulate', 'job_deduplicated', { clientId, jobId: activeJob.id, cacheKey: cacheKey.slice(0, 8) });
      return res.status(202).json({
        jobId: activeJob.id,
        statusUrl: `/v1/simulate/${activeJob.id}/status`,
      });
    }

    // 2. Cache hit: job completado com mesmo cacheKey
    const completedJob = jobManager.findCompletedJobByCacheKey(cacheKey);
    if (completedJob) {
      log('info', 'simulate', 'job_cache_hit', { clientId, jobId: completedJob.id, cacheKey: cacheKey.slice(0, 8) });
      return res.status(200).json(completedJob.result);
    }

    // 3. Cria novo job
    const job = jobManager.createJob(clientId, cacheKey, webhookUrl || null);
    const jobId = job.id;

    log('info', 'simulate', 'job_created', { clientId, jobId, cacheKey: cacheKey.slice(0, 8) });

    // Span raiz: cobre toda a duração do job (POST → conclusão do background)
    const rootSpan = getTracer().startSpan('simulate.job', {
      attributes: {
        'job.id': jobId,
        'client.id': clientId,
        'client.plan': req.client?.planId || req.client?.plan || 'unknown',
      },
    });

    // 4. Responde imediatamente 202
    res.status(202).json({
      jobId,
      statusUrl: `/v1/simulate/${jobId}/status`,
    });

    // Captura contexto ativo para propagação no setImmediate
    const activeCtx = getContext().active();

    // 5. Processamento em background com contexto propagado
    setImmediate(getContext().with(activeCtx, async () => {
      try {
        jobManager.updateJob(jobId, { status: 'processing', progress: 10 });

        // Span filho: análise de sala
        const context = await withSpan('roomAnalyzer.analyzeRoom', {}, async (span) => {
          const result = await analyzeRoom(imageBase64);
          span.setAttributes({
            'room.geometry': result.geometry || 'unknown',
            'room.obstacles_count': result.obstacles ?? 0,
            'room.lighting': result.lighting || 'unknown',
          });
          return result;
        });
        jobManager.updateJob(jobId, { progress: 25 });

        // Span filho: chamada ao provider de IA
        const result = await withSpan('providerRouter.route', {}, async (span) => {
          const r = await applyMaterial(imageBase64, material, context);
          span.setAttributes({
            'provider.id': r.provider || (r.fallback ? 'local-fallback' : 'unknown'),
            'provider.difficulty': context?.difficulty || 'unknown',
            'provider.fidelity': r.fidelity ?? 0,
            'provider.fallback': !!r.fallback,
          });
          return r;
        });

        // Incrementa uso após chamada ao provider
        if (req.client?.key) {
          incrementUsage(req.client.key);
        }

        jobManager.updateJob(jobId, { progress: 75 });

        if (result.fallback) {
          jobManager.updateJob(jobId, {
            status: 'failed',
            error: result.fallbackDescription || 'Todos os provedores falharam',
          });
          rootSpan.setStatus({ code: 2, message: result.fallbackDescription });
          rootSpan.end();
          if (webhookUrl) {
            await sendWebhookNotification(webhookUrl, { jobId, status: 'failed', error: result.fallbackDescription });
          }
          return;
        }

        // Span filho: validação de invariantes
        const invariantResult = await withSpan('validator.validateInvariants', {}, async (span) => {
          const r = await validateInvariants(imageBase64, result.editedImageBase64, result.context || context);
          span.setAttributes({
            'validation.overall_score': r.overallScore ?? 0,
            'validation.violated': !!r.violated,
            ...(r.violated && r.invariant ? { 'validation.invariant': r.invariant } : {}),
          });
          return r;
        });
        jobManager.updateJob(jobId, { progress: 90 });

        if (invariantResult.violated) {
          const errMsg = `Invariant violation: ${invariantResult.invariant} (score ${invariantResult.scores?.[invariantResult.invariant]?.toFixed(2)})`;
          jobManager.updateJob(jobId, { status: 'failed', error: errMsg });
          rootSpan.setStatus({ code: 2, message: errMsg });
          rootSpan.end();
          if (webhookUrl) {
            await sendWebhookNotification(webhookUrl, { jobId, status: 'failed', error: errMsg });
          }
          return;
        }

        // Sucesso
        const successResult = {
          editedImageBase64: result.editedImageBase64,
          fidelity: result.fidelity,
          context: result.context || context,
        };

        if (idempotencyKey) setIdempotentResult(idempotencyKey, successResult);
        jobManager.updateJob(jobId, { status: 'completed', progress: 100, result: successResult });
        rootSpan.setStatus({ code: 1 });
        rootSpan.end();
        log('info', 'simulate', 'async_job_completed', { clientId, jobId, provider: result.provider, fidelity: result.fidelity });

        if (webhookUrl) {
          await sendWebhookNotification(webhookUrl, { jobId, status: 'completed', result: successResult });
        }
      } catch (err) {
        log('error', 'simulate', 'async_job_failed', { clientId, jobId, error: err.message });
        jobManager.updateJob(jobId, { status: 'failed', error: err.message });
        rootSpan.setStatus({ code: 2, message: err.message });
        rootSpan.setAttribute('error.message', err.message);
        rootSpan.end();
        if (webhookUrl) {
          await sendWebhookNotification(webhookUrl, { jobId, status: 'failed', error: err.message });
        }
      }
    }));

  } catch (err) {
    log('error', 'simulate', 'simulation_error', { clientId, error: err.message, latencyMs: Date.now() - startTime });
    next(err);
  }
});

export default router;
