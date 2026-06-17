// backend/routes/auth.js
// Rota de autenticação: registro de conta trial.

import { Router } from 'express';
import { createKey, loadKeys } from '../services/apiKeyStore.js';

const router = Router();

/**
 * POST /v1/auth/trial
 * Body: { email, storeName }
 * Cria conta trial com 50 créditos e retorna a API key.
 * Idempotente por email: não cria duplicatas para o mesmo email.
 */
router.post('/trial', (req, res) => {
  const { email, storeName, ref } = req.body ?? {};

  if (!email || typeof email !== 'string' || !email.trim()) {
    return res.status(400).json({ error: 'Campo "email" é obrigatório.' });
  }
  if (!storeName || typeof storeName !== 'string' || !storeName.trim()) {
    return res.status(400).json({ error: 'Campo "storeName" é obrigatório.' });
  }

  const normalizedEmail = email.trim().toLowerCase();

  // Idempotência: verifica se email já existe
  const keys = loadKeys();
  const existingEntry = Object.entries(keys).find(
    ([, client]) => client.email && client.email.toLowerCase() === normalizedEmail
  );
  if (existingEntry) {
    return res.status(409).json({
      error: 'Conflict',
      message: 'Este email já possui uma conta cadastrada.',
    });
  }

  const clientId = `trial_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const apiKey = createKey({
    clientId,
    planId: 'trial',
    email: normalizedEmail,
    storeName: storeName.trim(),
    ...(ref && typeof ref === 'string' && { referredBy: ref.trim() }),
  });

  return res.status(201).json({
    apiKey,
    clientId,
    plan: 'trial',
    credits: 50,
  });
});

export default router;
