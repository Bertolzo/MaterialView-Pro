import crypto from 'crypto';

const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;

const store = new Map();

const timers = new Map();

function generateKey(rawKey) {
  return crypto.createHash('sha256').update(rawKey).digest('hex');
}

function scheduleEviction(key) {
  const existing = timers.get(key);
  if (existing) clearTimeout(existing);
  timers.set(key, setTimeout(() => {
    store.delete(key);
    timers.delete(key);
  }, IDEMPOTENCY_TTL_MS));
}

export function getIdempotencyKey(req) {
  return req.headers['idempotency-key'] || null;
}

export function getCachedIdempotentResult(key) {
  if (!key) return null;
  const hashed = generateKey(key);
  return store.get(hashed) || null;
}

export function setIdempotentResult(key, result) {
  if (!key) return;
  const hashed = generateKey(key);
  store.set(hashed, result);
  scheduleEviction(hashed);
}

export function clearExpiredIdempotencyKeys() {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry._cachedAt && (now - entry._cachedAt) > IDEMPOTENCY_TTL_MS) {
      store.delete(key);
      const timer = timers.get(key);
      if (timer) { clearTimeout(timer); timers.delete(key); }
    }
  }
}

setInterval(clearExpiredIdempotencyKeys, 60 * 60 * 1000);

export function requireIdempotencyKey(req, res, next) {
  const key = getIdempotencyKey(req);
  if (!key) {
    return res.status(400).json({
      error: 'Bad Request',
      message: "Header 'Idempotency-Key' é obrigatório para evitar duplicação de simulações.",
    });
  }
  const cached = getCachedIdempotentResult(key);
  if (cached) {
    res.set('X-Idempotency', 'REPLAY');
    return res.status(200).json(cached);
  }
  next();
}
