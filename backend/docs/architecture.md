# Arquitetura do Backend — PisoRealView Pro

> Para LLMs: este documento descreve a arquitetura interna do backend.
> Para a visão completa do projeto (frontend + infra), veja `../../docs/architecture.md`.

## Fluxo Principal

```
POST /v1/simulate
  → Rate Limiter
  → apiKeyMiddleware (X-API-Key)
  → routes/simulate.js
  → JobManager.createJob() → 202 Accepted
  → setImmediate (background)
      → analyzeRoom()
      → applyMaterial() → ProviderRouter → WaveSpeed / Zhipu / Pika / Fallback
      → validateInvariants()
      → job.status = 'completed'

GET /v1/simulate/:jobId/status
  → routes/simulate/status.js
  → JobManager.getJob()
  → { status, progress, result? }
```

## Componentes

| Arquivo | Responsabilidade |
|---|---|
| `server.js` | Entry point. initTracing() deve ser a primeira instrução. |
| `routes/simulate.js` | Endpoint 202 Async Job + modo síncrono legado (X-Sync-Mode). |
| `routes/simulate/status.js` | GET /:jobId/status — polling do cliente. |
| `services/core/JobManager.js` | Fila em memória, TTL 1h, deduplicação por cacheKey O(1). |
| `services/core/webhookNotifier.js` | Notificação webhook com AbortController 5s. |
| `services/gateway/ProviderRouter.js` | IRT-Router: cascata WaveSpeed → Zhipu → Pika → fallback. |
| `services/gateway/CreditTracker.js` | Controle de créditos free tier com rollover mensal. |
| `services/gateway/DifficultyEstimator.js` | Classifica requisições em low/medium/high. |
| `services/gateway/TaskMetrics.js` | BEST-Route score histórico por provedor. |
| `services/core/validator.js` | Invariantes visuais: shadows, geometry, objects, perspective. |
| `services/core/simulationCache.js` | Cache SHA256 + TTL 30min + limite 2MB por entrada. |
| `services/apiKeyStore.js` | API keys em JSON com mutex _writeLock e escrita atômica. |
| `tracing.js` | OpenTelemetry no-op quando OTEL_ENABLED=false. |
| `services/gateway/logger.js` | Logger JSON estruturado com traceId/spanId. |

## Cascata de Provedores

| Provedor | costTier | Fidelidade | Notas |
|---|---|---|---|
| WaveSpeedAI | 0 | 0.85 | Qwen Image Edit, async polling |
| Zhipu CogView | 1 | 0.78 | cogview-3-flash |
| Pika Labs | 2 | 0.75 | pika.art v1/generate |
| local-fallback | — | 0.0 | Descrição textual, nunca falha |

## Planos de API Key

| Plano | Créditos | Rollover |
|---|---|---|
| trial | 50 | Sem rollover (decremental) |
| basic | 200 | Mensal |
| popular | 500 | Mensal |
| pro | 1000 | Mensal |
| enterprise | 3000 | Mensal |
| demo | 10/dia | Diário UTC |

## ADRs Resumidos

**ADR-001** — Cache SHA256 em memória (TTL 30min, max 100 entradas, max 2MB/entrada).
Reduz custo e latência para requisições repetidas. Próximo passo: Redis.

**ADR-002** — Cascata multi-provedor IRT-Router.
Resiliência a falhas. Custo otimizado (tenta gratuito primeiro).

**ADR-003** — DifficultyEstimator para roteamento inteligente.
Tarefas `high` pulam provedores gratuitos. Melhor taxa de sucesso em cenas complexas.

**ADR-004** — Validação de invariantes visuais pós-geração.
Garante qualidade mínima. Próximo passo: CLIP via Replicate para validação semântica.

**ADR-005** — API Keys em JSON (MVP).
Simples de operar. Não escala para múltiplas instâncias. Migrar para Redis/PostgreSQL.

**ADR-006** — Helmet + safeCompare.
CSP restritiva, frameguard deny, timing-safe token comparison.

**ADR-007** — Async Job Pattern (202 + polling).
Evita timeout em clientes com simulações longas (10–45s). Deduplicação por cacheKey.

**ADR-008** — OpenTelemetry com no-op padrão.
Zero overhead em testes. Ativar com OTEL_ENABLED=true em produção.

## Variáveis de Ambiente

### Obrigatórias

| Variável | Descrição |
|---|---|
| `WAVESPEED_API_KEY` | API key WaveSpeedAI (costTier 0) |
| `ADMIN_SECRET` | Token para endpoints /admin/* |

### Opcionais

| Variável | Padrão | Descrição |
|---|---|---|
| `OTEL_ENABLED` | false | Ativa OpenTelemetry |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | http://localhost:4318 | Endpoint Jaeger/OTLP |
| `ZHIPU_API_KEY` | — | Zhipu CogView (costTier 1) |
| `PIKA_API_KEY` | — | Pika Labs (costTier 2) |
| `SIMULATION_CACHE_MAX_ENTRY_BYTES` | 2097152 | Limite por entrada no cache |
| `PROVIDER_TIMEOUT_MS` | 45000 | Timeout por provedor |
| `NODE_ENV` | development | production ativa rate limiting |
| `PORT` | 3001 | Porta do servidor |
| `CORS_ORIGIN` | http://localhost:5173 | Origem CORS permitida |
