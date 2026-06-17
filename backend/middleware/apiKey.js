// backend/middleware/apiKey.js
// Middleware de autenticação por API key.
// Verifica header X-API-Key, valida contra apiKeyStore, controla limites por plano.
// Clientes trial: créditos só diminuem por uso, sem rollover mensal.

import { loadKeys, getUsage, incrementUsage, PLAN_LIMITS, ensureDemoClient } from '../services/apiKeyStore.js';
import { log } from '../services/gateway/logger.js';

function nextMonthFirst() {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return next.toISOString().slice(0, 10);
}

function tomorrowUTC() {
  const now = new Date();
  const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  return tomorrow.toISOString().slice(0, 10);
}

export function apiKeyMiddleware(req, res, next) {
  // Rota demo: sem necessidade de API key
  const isDemo = req.path.startsWith('/demo') || req.headers['x-demo-mode'] === 'true';
  if (isDemo) {
    const { key: demoKey, client } = ensureDemoClient();
    if (client.credits <= 0) {
      log('warn', 'apiKeyMiddleware', 'demo_limit_reached', { path: req.path, ip: req.ip });
      return res.status(429).json({
        error: 'Limite diário da demo atingido. Volte amanhã.',
        resetAt: tomorrowUTC(),
      });
    }
    req.client = { clientId: 'demo-public', plan: 'demo', key: demoKey };
    return next();
  }

  const key = req.headers['x-api-key'];

  if (!key) {
    log('warn', 'apiKeyMiddleware', 'api_key_missing', { path: req.path, ip: req.ip });
    return res.status(401).json({ error: 'API key obrigatória. Inclua o header X-API-Key.' });
  }

  const keys = loadKeys();
  const client = keys[key];

  if (!client || !client.active) {
    log('warn', 'apiKeyMiddleware', 'api_key_invalid', { path: req.path, ip: req.ip });
    return res.status(401).json({ error: 'API key inválida ou revogada.' });
  }

  const plan = client.plan || client.planId || 'basic';
  const limit = PLAN_LIMITS[plan] ?? 200;

  let usage;
  if (plan === 'trial') {
    // Trial: créditos não expiram por tempo — usa campo `credits` diretamente
    const remaining = typeof client.credits === 'number' ? client.credits : 0;
    usage = limit - remaining;
  } else {
    // Outros planos: rollover mensal normal via campo usage[mês]
    usage = getUsage(client);
  }

  if (usage >= limit) {
    log('warn', 'apiKeyMiddleware', 'rate_limit_exceeded', {
      clientId: client.clientId,
      usage,
      limit,
      plan,
    });

    const errorResponse = {
      error: 'Limite de simulações atingido.',
      usage,
      limit,
      upgrade: 'Entre em contato para fazer upgrade do plano.',
    };

    if (plan !== 'trial') {
      errorResponse.resetAt = nextMonthFirst();
    }

    return res.status(429).json(errorResponse);
  }

  if (usage >= limit * 0.8) {
    res.setHeader('X-Usage-Warning', 'true');
    res.setHeader('X-Usage-Remaining', String(limit - usage));
  }

  req.client = { clientId: client.clientId, planId: plan, plan, key };
  next();
}
