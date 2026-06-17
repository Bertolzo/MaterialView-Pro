// backend/routes/usage.js
// GET /v1/usage — retorna consumo do mês para a API key autenticada

import { Router } from 'express';
import { loadKeys, getUsage, PLAN_LIMITS } from '../services/apiKeyStore.js';
import { safeCompare } from '../middleware/safeCompare.js';

const router = Router();

router.get('/', (req, res) => {
  const apiKey =
    req.headers['x-api-key'] ||
    req.headers.authorization?.replace(/^Bearer\s+/i, '');

  if (!apiKey) {
    return res.status(401).json({ error: 'API key obrigatória. Use o header x-api-key.' });
  }

  const keys = loadKeys();
  const entry = Object.entries(keys).find(([k]) => safeCompare(k, apiKey));
  const client = entry?.[1];

  if (!client || !client.active) {
    return res.status(401).json({ error: 'API key inválida ou inativa.' });
  }

  const plan = client.plan || client.planId || 'basic';
  const limit = PLAN_LIMITS[plan] ?? 0;
  const used = plan === 'trial' || plan === 'demo'
    ? (PLAN_LIMITS[plan] - (client.credits ?? 0))
    : getUsage(client);

  return res.json({
    plan,
    used,
    limit,
    remaining: Math.max(0, limit - used),
    storeName: client.storeName || null,
    email: client.email || null,
    createdAt: client.createdAt || null,
  });
});

export default router;
