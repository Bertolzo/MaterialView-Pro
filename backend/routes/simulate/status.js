// backend/routes/simulate/status.js
// GET /v1/simulate/:jobId/status — consulta o status de um job assíncrono.
// Requer autenticação por API key. Verifica ownership do job.

import { Router } from 'express';
import { jobManager } from '../../services/core/JobManager.js';
import { apiKeyMiddleware } from '../../middleware/apiKey.js';

const router = Router();

/**
 * GET /:jobId/status
 * Retorna o status atual de um job de simulação.
 *
 * Responses:
 * - 200: { jobId, status, progress, createdAt, result? (se completed), error? (se failed) }
 * - 403: Job pertence a outro cliente
 * - 404: Job não encontrado ou expirado
 */
router.get('/:jobId/status', apiKeyMiddleware, (req, res) => {
  const { jobId } = req.params;
  const job = jobManager.getJob(jobId);

  if (!job) {
    return res.status(404).json({ error: 'Job not found or expired' });
  }

  // Verifica ownership: apenas o cliente que criou o job pode consultá-lo
  if (job.clientId !== req.client.clientId) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const response = {
    jobId: job.id,
    status: job.status,
    progress: job.progress,
    createdAt: job.createdAt,
  };

  if (job.status === 'completed') {
    response.result = job.result;
  } else if (job.status === 'failed') {
    response.error = job.error;
  }

  return res.status(200).json(response);
});

export default router;
