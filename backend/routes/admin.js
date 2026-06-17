// backend/routes/admin.js
// Rotas administrativas protegidas por ADMIN_SECRET

import { Router } from 'express';
import { loadKeys } from '../services/apiKeyStore.js';
import { safeCompare } from '../middleware/safeCompare.js';
import { getSimulationCacheStats } from '../services/core/simulationCache.js';

const router = Router();

// Valores de MRR por plano (R$)
const PLAN_VALUES = {
  trial: 0,
  basic: 197,
  popular: 347,
  pro: 597,
  enterprise: 1497,
};

const COMMISSION_RATE = 0.30;

/**
 * Middleware de autenticação admin.
 * Aceita: header `x-admin-key: <ADMIN_SECRET>` ou `Authorization: Bearer <ADMIN_SECRET>`
 */
function requireAdmin(req, res, next) {
  const secret = process.env.ADMIN_SECRET;
  const fromHeader = req.headers['x-admin-key'];
  const fromBearer = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  const token = fromHeader || fromBearer;

  if (!safeCompare(token, secret)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

/**
 * GET /v1/admin/metrics
 * Retorna métricas gerais de clientes e uso.
 */
router.get('/metrics', requireAdmin, (req, res) => {
  const keys = loadKeys();
  const clients = Object.values(keys);

  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  const totalClients = clients.length;
  const activeClients = clients.filter((c) => c.active === true).length;
  const trialClients = clients.filter((c) => (c.plan || c.planId) === 'trial').length;
  const paidClients = clients.filter(
    (c) => c.active === true && (c.plan || c.planId) !== 'trial'
  ).length;

  const simulationsToday = clients
    .filter((c) => (c.plan || c.planId) !== 'trial')
    .reduce((sum, c) => sum + (c.usage?.[today] ?? 0), 0);

  const planDistribution = clients.reduce((acc, c) => {
    const plan = c.plan || c.planId || 'unknown';
    acc[plan] = (acc[plan] ?? 0) + 1;
    return acc;
  }, {});

  return res.json({
    totalClients,
    activeClients,
    trialClients,
    paidClients,
    simulationsToday,
    planDistribution,
    simulationCache: getSimulationCacheStats(),
  });
});

/**
 * GET /v1/admin/affiliates/:ref
 * Retorna métricas de conversão para um código de afiliado.
 */
router.get('/affiliates/:ref', requireAdmin, (req, res) => {
  const { ref } = req.params;
  const keys = loadKeys();

  // Filtrar clientes indicados por este afiliado
  const referred = Object.values(keys).filter(
    (client) => client.referredBy === ref
  );

  const activeClients = referred.filter((c) => c.active === true).length;

  const totalRevenue = referred
    .filter((c) => c.active === true)
    .reduce((sum, c) => {
      const plan = c.plan || c.planId || 'trial';
      return sum + (PLAN_VALUES[plan] ?? 0);
    }, 0);

  const totalCommissionEarned = +(totalRevenue * COMMISSION_RATE).toFixed(2);

  // lastPaymentDate: campo lastPaymentDate do cliente mais recente, ou createdAt do mais recente
  const lastPaymentDate = referred
    .map((c) => c.lastPaymentDate || c.createdAt || null)
    .filter(Boolean)
    .sort()
    .at(-1) ?? null;

  return res.json({
    ref,
    totalClients: referred.length,
    activeClients,
    totalRevenue,
    totalCommissionEarned,
    lastPaymentDate,
  });
});

export default router;
