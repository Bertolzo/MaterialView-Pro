// backend/tracing.js
// Módulo central de instrumentação OpenTelemetry.
// Controlado por OTEL_ENABLED: quando false (padrão), opera em modo no-op
// sem importar nenhum pacote @opentelemetry/* e sem conexões de rede.

const OTEL_ENABLED = process.env.OTEL_ENABLED === 'true';
const SERVICE_NAME = process.env.OTEL_SERVICE_NAME || 'materialview-backend';
const SERVICE_VERSION = process.env.OTEL_SERVICE_VERSION || '1.0.0';
const DEFAULT_ENDPOINT = 'http://localhost:4318';

// Span no-op: todos os métodos são no-op sem efeito colateral
const noopSpan = {
  end: () => {},
  setStatus: () => {},
  setAttribute: () => {},
  setAttributes: () => {},
  spanContext: () => ({ traceId: '', spanId: '', traceFlags: 0 }),
  recordException: () => {},
  updateName: () => {},
  isRecording: () => false,
};

// Tracer no-op: retorna spans no-op sem I/O
const noopTracer = {
  startSpan: () => noopSpan,
  startActiveSpan: (_name, _opts, _ctx, fn) => {
    const callback = typeof _opts === 'function' ? _opts
      : typeof _ctx === 'function' ? _ctx
      : fn;
    if (typeof callback === 'function') return callback(noopSpan);
  },
};

const noopSpanStatusCode = { OK: 1, ERROR: 2, UNSET: 0 };

let _tracer = noopTracer;
let _SpanStatusCode = noopSpanStatusCode;
let _context = {
  active: () => ({}),
  with: (_ctx, fn) => fn(),
};

export async function initTracing() {
  if (!OTEL_ENABLED) return;

  const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || DEFAULT_ENDPOINT;
  if (!process.env.OTEL_EXPORTER_OTLP_ENDPOINT) {
    console.warn(`[tracing] OTEL_EXPORTER_OTLP_ENDPOINT não definido. Usando padrão: ${DEFAULT_ENDPOINT}`);
  }

  try {
    const [
      { NodeSDK },
      { OTLPTraceExporter },
      { getNodeAutoInstrumentations },
      { Resource },
      { SEMRESATTRS_SERVICE_NAME, SEMRESATTRS_SERVICE_VERSION },
      otelApi,
    ] = await Promise.all([
      import('@opentelemetry/sdk-node'),
      import('@opentelemetry/exporter-trace-otlp-http'),
      import('@opentelemetry/auto-instrumentations-node'),
      import('@opentelemetry/resources'),
      import('@opentelemetry/semantic-conventions'),
      import('@opentelemetry/api'),
    ]);

    const exporter = new OTLPTraceExporter({ url: `${endpoint}/v1/traces` });

    const sdk = new NodeSDK({
      resource: new Resource({
        [SEMRESATTRS_SERVICE_NAME]: SERVICE_NAME,
        [SEMRESATTRS_SERVICE_VERSION]: SERVICE_VERSION,
      }),
      traceExporter: exporter,
      instrumentations: [getNodeAutoInstrumentations()],
    });

    sdk.start();

    _tracer = otelApi.trace.getTracer(SERVICE_NAME, SERVICE_VERSION);
    _SpanStatusCode = otelApi.SpanStatusCode;
    _context = otelApi.context;
    // Expõe otelApi no globalThis para uso no logger (ESM não suporta import síncrono)
    globalThis.__otelApi = otelApi;

    console.log(`[tracing] OpenTelemetry inicializado. Exportando para: ${endpoint}`);
  } catch (err) {
    console.error('[tracing] Falha ao inicializar OpenTelemetry SDK:', err.message);
  }
}

export function getTracer() {
  return _tracer;
}

export function getContext() {
  return _context;
}

export async function withSpan(name, attributes, fn) {
  const span = _tracer.startSpan(name, { attributes });
  try {
    return await fn(span);
  } catch (err) {
    span.setStatus({ code: _SpanStatusCode.ERROR, message: err.message });
    span.setAttribute('error.message', err.message);
    throw err;
  } finally {
    span.end();
  }
}
