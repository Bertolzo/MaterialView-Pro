import { initTracing } from './tracing.js';
await initTracing();
// backend/server.js
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import analyzeRouter from './routes/analyze.js';
import simulateRouter from './routes/simulate.js';
import billingRouter from './routes/billing.js';
import authRouter from './routes/auth.js';
import adminRouter from './routes/admin.js';
import usageRouter from './routes/usage.js';
import { resetCredits, getMetrics } from './services/gateway/index.js';
import { createKey, revokeKey, loadKeys } from './services/apiKeyStore.js';
import { correlationIdMiddleware } from './middleware/correlationId.js';
import { log } from './services/gateway/logger.js';
import { safeCompare } from './middleware/safeCompare.js';
import { getSimulationCacheStats } from './services/core/simulationCache.js';
import helmet from 'helmet';
import { jobManager } from './services/core/JobManager.js';
import statusRouter from './routes/simulate/status.js';

// --- Validação de variáveis obrigatórias ---
const REQUIRED_ENV = ['WAVESPEED_API_KEY', 'ADMIN_SECRET'];
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`[startup] ERRO: variável obrigatória ausente: ${key}`);
    console.error(`[startup] Defina ${key} nas variáveis de ambiente ou no arquivo .env`);
    process.exit(1);
  }
}

const app = express();
const isProd = process.env.NODE_ENV === 'production';

// --- Middleware: correlationId (deve ser o primeiro) ---
app.use(correlationIdMiddleware);

// --- Middleware: segurança (helmet) ---
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: [
        "'self'",
        'https://api.wavespeed.ai',
        'https://api.pika.art',
        'https://open.bigmodel.cn',
      ],
      imgSrc: ["'self'", 'data:', 'blob:'],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
    },
  },
  frameguard: { action: 'deny' },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  referrerPolicy: { policy: 'no-referrer' },
}));

// --- Middleware: request logging ---
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    log('info', 'http', 'request', {
      correlationId: req.correlationId,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      latencyMs: Date.now() - start,
    });
  });
  next();
});

// --- Middleware: payload limit ---
app.use(express.json({ limit: process.env.MAX_PAYLOAD_SIZE || '10mb' }));

// --- Middleware: CORS ---
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }));

// --- Middleware: rate limiting (produção) ---
if (isProd) {
  const limiter = rateLimit({
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 60_000,
    max: Number(process.env.RATE_LIMIT_MAX) || 60,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      const resetTime = req.rateLimit?.resetTime
        ? Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000)
        : 60;
      const retryAfter = Math.max(0, resetTime);
      res.status(429).json({ error: 'Too Many Requests', retryAfter });
    },
  });
  app.use('/v1/analyze', limiter);
  app.use('/v1/simulate', limiter);

  const trialLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      const resetTime = req.rateLimit?.resetTime
        ? Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000)
        : 3600;
      res.status(429).json({ error: 'Too Many Requests', retryAfter: Math.max(0, resetTime) });
    },
  });

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      const resetTime = req.rateLimit?.resetTime
        ? Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000)
        : 900;
      res.status(429).json({ error: 'Too Many Requests', retryAfter: Math.max(0, resetTime) });
    },
  });

  app.post('/v1/auth/trial', trialLimiter);
  app.use('/v1/auth', authLimiter);

  const usageLimiter = rateLimit({
    windowMs: 60_000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      const retryAfter = req.rateLimit?.resetTime
        ? Math.max(0, Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000))
        : 60;
      res.status(429).json({ error: 'Too Many Requests', retryAfter });
    },
  });
  app.use('/v1/usage', usageLimiter);

  const billingWebhookLimiter = rateLimit({
    windowMs: 60_000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      const retryAfter = req.rateLimit?.resetTime
        ? Math.max(0, Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000))
        : 60;
      res.status(429).json({ error: 'Too Many Requests', retryAfter });
    },
  });
  app.use('/v1/billing/webhook', billingWebhookLimiter);

  const billingLimiter = rateLimit({
    windowMs: 60_000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      const retryAfter = req.rateLimit?.resetTime
        ? Math.max(0, Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000))
        : 60;
      res.status(429).json({ error: 'Too Many Requests', retryAfter });
    },
  });
  app.use('/v1/billing', billingLimiter);
}

// --- Health check ---
app.get('/health', (req, res) => res.json({ ok: true, uptime: process.uptime() }));

// --- Rotas ---
app.use('/v1/analyze', analyzeRouter);
app.use('/v1/simulate', statusRouter);
app.use('/v1/simulate', simulateRouter);
app.use('/v1/billing', billingRouter);
app.use('/v1/auth', authRouter);
app.use('/v1/admin', adminRouter);
app.use('/v1/usage', usageRouter);

// --- Error handler global ---
app.use((err, req, res, next) => {
  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      error: 'Payload Too Large',
      message: 'O tamanho máximo permitido é 10 MB.',
    });
  }
  console.error(err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// --- Admin: autenticação ---
function requireAdminAuth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!safeCompare(token, process.env.ADMIN_SECRET)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// --- Admin: reset de créditos ---
app.post('/admin/credits/reset', requireAdminAuth, (req, res) => {
  const { providerId } = req.body;
  const counters = resetCredits(providerId);
  res.json({ ok: true, counters });
});

// --- Admin: métricas DAAO ---
app.get('/admin/metrics', requireAdminAuth, (req, res) => {
  const metrics = getMetrics();
  res.json({ ok: true, metrics, simulationCache: getSimulationCacheStats() });
});

// --- Admin: gerenciamento de API keys ---
app.post('/admin/keys', requireAdminAuth, (req, res) => {
  const { clientId, planId = 'basic' } = req.body;
  if (!clientId) return res.status(400).json({ error: 'clientId obrigatório' });
  const key = createKey({ clientId, planId });
  res.json({ ok: true, key, clientId, planId });
});

app.delete('/admin/keys/:key', requireAdminAuth, (req, res) => {
  const revoked = revokeKey(req.params.key);
  if (!revoked) return res.status(404).json({ error: 'Key não encontrada' });
  res.json({ ok: true });
});

app.get('/admin/keys', requireAdminAuth, (req, res) => {
  const keys = loadKeys();
  const list = Object.entries(keys).map(([, client]) => ({
    clientId: client.clientId,
    planId: client.planId,
    active: client.active,
    createdAt: client.createdAt,
    usage: client.usage,
  }));
  res.json({ ok: true, count: list.length, keys: list });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'info',
    event: 'server_started',
    port: PORT,
    env: process.env.NODE_ENV || 'development',
  }));
});

// Inicia o JobManager (limpeza periódica de jobs expirados)
jobManager.start();

// Graceful shutdown: para o JobManager ao encerrar o processo
process.on('SIGTERM', () => {
  log('info', 'server', 'shutdown', { signal: 'SIGTERM' });
  jobManager.stop();
});
process.on('SIGINT', () => {
  log('info', 'server', 'shutdown', { signal: 'SIGINT' });
  jobManager.stop();
});

export default app;
