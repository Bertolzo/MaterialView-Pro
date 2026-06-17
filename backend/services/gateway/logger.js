// backend/services/gateway/logger.js
// Logger estruturado em JSON — compatível com Railway/Vercel log aggregation.
// Níveis: debug < info < warn < error
// Configurar via LOG_LEVEL env var (padrão: info)
// Quando OTEL_ENABLED=true e span ativo: inclui traceId e spanId para correlação.

const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const currentLevel = LEVELS[process.env.LOG_LEVEL || 'info'] ?? 1;

/**
 * Emite log estruturado em JSON.
 * @param {'debug'|'info'|'warn'|'error'} level
 * @param {string} component - ex: 'ProviderRouter', 'validator'
 * @param {string} event - ex: 'provider_success', 'fallback_activated'
 * @param {object} data - campos extras (provider, latencyMs, clientId, etc.)
 */
export function log(level, component, event, data = {}) {
  if ((LEVELS[level] ?? 1) < currentLevel) return;

  const entry = {
    timestamp: new Date().toISOString(),
    level,
    component,
    event,
    ...data,
  };

  // Correlação com OpenTelemetry: injeta traceId e spanId quando span ativo
  if (process.env.OTEL_ENABLED === 'true') {
    try {
      // Import síncrono via require não disponível em ESM — usa cache do módulo
      // O módulo @opentelemetry/api já foi carregado por initTracing() se OTEL_ENABLED=true
      const otelApi = globalThis.__otelApi;
      if (otelApi) {
        const span = otelApi.trace.getActiveSpan();
        if (span) {
          const ctx = span.spanContext();
          if (ctx.traceId) entry.traceId = ctx.traceId;
          if (ctx.spanId) entry.spanId = ctx.spanId;
        }
      }
    } catch {
      // Silencioso: falha na correlação não deve afetar o log
    }
  }

  const output = JSON.stringify(entry);
  if (level === 'error' || level === 'warn') {
    console.error(output);
  } else {
    console.log(output);
  }
}
