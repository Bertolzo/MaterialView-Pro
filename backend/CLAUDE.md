# CLAUDE.md — PisoRealView Pro

Guia de trabalho para IAs e novos desenvolvedores. Leia antes de modificar qualquer arquivo.

## Documentação Detalhada

Para documentação técnica completa, veja o diretório `docs/`:

| Arquivo | Conteúdo |
|---|---|
| `docs/architecture.md` | Fluxo de dados, componentes, cascata de provedores e ADRs |
| `docs/telemetry-guide.md` | Como ativar OTEL, rodar Jaeger local, ler traces e adicionar spans |
| `docs/security-changelog.md` | Histórico de vulnerabilidades corrigidas (SEC-01 a SEC-07) |

## Comandos Essenciais

```bash
# Sempre execute a partir de pisosrealview-pro-transformed/backend/
npm test              # 166 testes (Vitest + fast-check) — deve passar 100%
npm run dev           # servidor em modo watch (porta 3001, requer .env)

# Para rodar um único arquivo de teste:
npx vitest run caminho/para/arquivo.test.js
```

## Arquitetura em Uma Linha

```
POST /v1/simulate → JobManager (202 + jobId) → setImmediate → ProviderRouter → Validator → job.completed
```

O fluxo é assíncrono por padrão. O cliente recebe 202 imediatamente e faz polling em
`GET /v1/simulate/:jobId/status`. O modo síncrono legado é ativado via `X-Sync-Mode: true`.

## Componentes Críticos

| Arquivo | Responsabilidade |
|---|---|
| `server.js` | Ponto de entrada. `await initTracing()` deve ser a primeira linha. |
| `routes/simulate.js` | Endpoint 202 Async Job. Cria job, responde 202, processa via `setImmediate`. |
| `routes/simulate/status.js` | `GET /:jobId/status` — polling do cliente. |
| `services/core/JobManager.js` | Fila em memória com TTL 1h, deduplicação por cacheKey (índice O(1)). |
| `services/gateway/ProviderRouter.js` | Cascata WaveSpeed (costTier 0) → Zhipu (1) → Pika (2) → fallback textual. |
| `services/core/validator.js` | Invariantes visuais: shadows, geometry, objects, perspective (Bhattacharyya). |
| `services/core/simulationCache.js` | Cache em memória com TTL 30min e limite de 2MB por entrada. |
| `services/apiKeyStore.js` | API keys em JSON com mutex `_writeLock` e escrita atômica `.tmp → rename`. |
| `tracing.js` | OpenTelemetry no-op quando `OTEL_ENABLED=false`. Zero overhead em testes. |
| `services/gateway/logger.js` | Logger JSON estruturado. Injeta `traceId`/`spanId` quando span ativo. |

## Padrões de Código

- **ESM puro**: apenas `import`/`export`. Nunca `require()`.
- **Injeção de dependência via construtor** para qualquer I/O externo (fs, fetch, Date.now).
  Exemplo correto: `new CreditTracker({ clock: () => new Date(), fsModule: fs })`.
- **`withWriteLock()`** obrigatório para qualquer escrita em `api-keys.json`.
  Nunca chame `loadKeys()` + `saveKeys()` diretamente fora do lock.
- **Mock de `fs` deve interceptar `renameSync`**: a escrita atômica usa `.tmp → rename`.
  Um mock que só intercepta `writeFileSync` não preserva estado. Ver `trialFlow.test.js`.
- **`withSpan(name, attrs, fn)`** para instrumentar operações críticas quando `OTEL_ENABLED=true`.

## O Que NÃO Modificar Sem Discussão

- **`tracing.js`**: a lógica de no-op é crítica para os 166 testes. Qualquer mudança
  que importe `@opentelemetry/*` fora do bloco `if (OTEL_ENABLED)` quebra os testes.
- **`services/apiKeyStore.js`**: o mutex `_writeLock` protege contra race condition.
  Toda operação de escrita deve passar por `withWriteLock()`.
- **`services/core/simulationCache.js`**: `MAX_ENTRY_SIZE_BYTES` (padrão 2MB) previne OOM
  com imagens de alta resolução. Não remova essa verificação.
- **`server.js` — primeiras linhas**: `import { initTracing }` e `await initTracing()`
  devem ser as primeiras instruções, antes de qualquer outro import.

## Variáveis de Ambiente

### Obrigatórias (servidor não sobe sem elas)

| Variável | Descrição |
|---|---|
| `WAVESPEED_API_KEY` | API key do provedor WaveSpeedAI (costTier 0) |
| `ADMIN_SECRET` | Token para endpoints `/admin/*` e `/v1/admin/*` |

### Opcionais com padrão seguro

| Variável | Padrão | Descrição |
|---|---|---|
| `OTEL_ENABLED` | `false` | Ativa OpenTelemetry. Manter `false` em testes. |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `http://localhost:4318` | Endpoint Jaeger/coletor OTLP |
| `ZHIPU_API_KEY` | — | API key Zhipu CogView (costTier 1, opcional) |
| `PIKA_API_KEY` | — | API key Pika Labs (costTier 2, opcional) |
| `SIMULATION_CACHE_MAX_ENTRY_BYTES` | `2097152` (2MB) | Limite por entrada no cache |
| `PROVIDER_TIMEOUT_MS` | `45000` | Timeout por provedor de IA |
| `NODE_ENV` | `development` | `production` ativa rate limiting |

## Estrutura de Testes

```
backend/
  __tests__/                    # testes de integração (supertest)
    asyncSimulate.test.js       # fluxo completo POST → 202 → polling → 200
    rateLimitUsageBilling.test.js
    securityHeaders.test.js
    trialRateLimit.test.js
  services/
    core/__tests__/
      JobManager.test.js        # unitários + property-based (fast-check)
      simulationCache.test.js
    gateway/__tests__/
      ProviderRouter.test.js
      CreditTracker.test.js
      DifficultyEstimator.test.js
      TaskMetrics.test.js
    billing/__tests__/
      trialFlow.test.js         # mock stateful de fs com renameSync
      billingWebhook.test.js
      asaasService.test.js
  middleware/__tests__/
    safeCompare.test.js
```

## O Que Aprendemos

1. **Mock de `fs` precisa interceptar `renameSync`**
   A escrita atômica em `apiKeyStore.js` usa `writeFileSync(.tmp)` + `renameSync(.tmp → .json)`.
   Um mock que só intercepta `writeFileSync` para `api-keys.json` nunca atualiza o estado,
   porque a escrita real vai para `.tmp`. A correção usa um `tmpStore` intermediário que é
   copiado para `mockStore` no `renameSync`. Ver `trialFlow.test.js`.

2. **`setImmediate` não propaga contexto OpenTelemetry automaticamente**
   O contexto de trace não atravessa fronteiras assíncronas como `setImmediate`.
   A solução é capturar o contexto antes: `const activeCtx = getContext().active()` e
   envolver o callback: `setImmediate(getContext().with(activeCtx, async () => { ... }))`.
   Ver `routes/simulate.js`.

3. **Cache com limite de tamanho previne OOM**
   Imagens base64 de alta resolução (ex: 20MP) podem ter ~15MB cada. Com 100 entradas
   no cache, isso seria 1.5GB de RAM. A variável `SIMULATION_CACHE_MAX_ENTRY_BYTES=2MB`
   rejeita entradas grandes antes de inserir. Ver `services/core/simulationCache.js`.

4. **Webhook Asaas precisa de `ASAAS_WEBHOOK_SECRET` em produção**
   Sem esse secret, qualquer POST para `/v1/billing/webhook` ativa pagamentos.
   A validação existente (`if (secret && token !== secret)`) era silenciosa quando
   `secret` era `undefined` — aceitava qualquer requisição. Corrigido em SEC-07.
   Ver `SECURITY_CHANGELOG.md` e `routes/billing.js`.
