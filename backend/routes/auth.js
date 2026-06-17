// backend/routes/auth.js
// Rota de autenticação: registro de conta trial.

import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { createKey, loadKeys } from '../services/apiKeyStore.js';
import { logAbuse } from '../services/abuseLog.js';

const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com', 'guerrillamail.com', '10minutemail.com', 'tempmail.com',
  'tempmail.net', 'throwaway.email', 'yopmail.com', 'trashmail.com',
  'sharklasers.com', 'mailcatch.com', 'spambox.us', 'tempinbox.com',
  'dispostable.com', 'mailnator.com', 'mailexpire.com', 'mailsac.com',
  'getairmail.com', 'emailondeck.com', 'temp-mail.org', 'maildrop.cc',
  'inboxbear.com', 'burnermail.io', 'anonaddy.com', 'spamgourmet.com',
  'mytemp.email', 'fakeinbox.com', 'luxusmail.org', 'mailmetrash.com',
  'temporary-email.com', 'maileater.com',
]);

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const router = Router();

const trialRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    const deviceId = req.headers['x-device-id'] || '';
    return deviceId ? `${ip}:${deviceId}` : ip;
  },
  handler: (req, res) => {
    const retryAfter = req.rateLimit?.resetTime
      ? Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000)
      : 3600;
    logAbuse('rate_limited', { ip: req.ip, deviceId: req.headers['x-device-id'] || '', userAgent: req.headers['user-agent'] || '' });
    res.status(429).json({ error: 'Muitas tentativas. Aguarde antes de criar nova conta.', retryAfter: Math.max(0, retryAfter) });
  },
});

/**
 * POST /v1/auth/trial
 * Body: { email, storeName }
 * Cria conta trial com 50 créditos e retorna a API key.
 * Idempotente por email: não cria duplicatas para o mesmo email.
 */
router.post('/trial', trialRateLimiter, (req, res) => {
  const { email, storeName, ref } = req.body ?? {};

  if (!email || typeof email !== 'string' || !email.trim()) {
    return res.status(400).json({ error: 'Campo "email" é obrigatório.' });
  }
  if (!storeName || typeof storeName !== 'string' || !storeName.trim()) {
    return res.status(400).json({ error: 'Campo "storeName" é obrigatório.' });
  }

  const normalizedEmail = email.trim().toLowerCase();

  const ip = req.ip || req.connection?.remoteAddress || 'unknown';
  const deviceId = req.headers['x-device-id'] || '';
  const userAgent = req.headers['user-agent'] || '';

  if (!EMAIL_REGEX.test(normalizedEmail)) {
    logAbuse('trial_blocked', { reason: 'invalid_email', email: normalizedEmail, ip, deviceId, userAgent });
    return res.status(400).json({ error: 'Email inválido.' });
  }

  const domain = normalizedEmail.split('@')[1];
  if (DISPOSABLE_DOMAINS.has(domain)) {
    logAbuse('disposable_blocked', { domain, email: normalizedEmail, ip, deviceId, userAgent });
    return res.status(400).json({
      error: 'Emails temporários não são permitidos. Use um email permanente.',
    });
  }

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

  logAbuse('trial_created', { clientId, email: normalizedEmail, storeName: storeName.trim(), ip, deviceId, userAgent, ref: ref || '' });

  return res.status(201).json({
    apiKey,
    clientId,
    plan: 'trial',
    credits: 50,
  });
});

export default router;
