# Guia de Telemetria — OpenTelemetry + Jaeger

> Para LLMs: este arquivo descreve como o tracing funciona no MaterialView Pro.
> O sistema opera em modo **no-op por padrão** (`OTEL_ENABLED=false`).
> Zero overhead, zero conexões de rede, zero dependências em testes.

## Visão Geral

O backend usa OpenTelemetry para rastrear o ciclo de vida completo de cada simulação:

```
POST /v1/simulate
  └── simulate.job (span raiz)
        ├── roomAnalyzer.analyzeRoom
        ├── providerRouter.route
        └── validator.validateInvariants
```

Cada span carrega atributos relevantes (provider, fidelity, room geometry, etc.).
O `traceId` e `spanId` são injetados automaticamente nos logs JSON quando um span está ativo.

## Ativar em Desenvolvimento

### 1. Subir Jaeger local (Docker)

```bash
docker run -d --name jaeger \
  -p 16686:16686 \
  -p 4318:4318 \
  jaegertracing/all-in-one:latest
```

- UI: http://localhost:16686
- Endpoint OTLP HTTP: http://localhost:4318

### 2. Configurar variáveis de ambiente

```bash
# .env (backend/)
OTEL_ENABLED=true
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
OTEL_SERVICE_NAME=materialview-backend
OTEL_SERVICE_VERSION=1.0.0
```

### 3. Iniciar o servidor

```bash
npm run dev
```

O log de inicialização confirmará:
```
[tracing] OpenTelemetry inicializado. Exportando para: http://localhost:4318
```

## Ler Traces no Jaeger

1. Acesse http://localhost:16686
2. Selecione o serviço `materialview-backend`
3. Clique em "Find Traces"
4. Cada trace representa uma requisição `POST /v1/simulate`

### Atributos Úteis por Span

**`simulate.job`** (span raiz)
| Atributo | Descrição |
|---|---|
| `job.id` | UUID do job assíncrono |
| `client.id` | ID do cliente autenticado |
| `client.plan` | Plano do cliente (trial, basic, pro, etc.) |

**`roomAnalyzer.analyzeRoom`**
| Atributo | Descrição |
|---|---|
| `room.geometry` | Geometria detectada (square, rectangular, etc.) |
| `room.obstacles_count` | Número de obstáculos detectados |
| `room.lighting` | Condição de iluminação (natural, artificial, mixed) |

**`providerRouter.route`**
| Atributo | Descrição |
|---|---|
| `provider.id` | Provedor usado (wavespeed, zhipu, pika, local-fallback) |
| `provider.difficulty` | Dificuldade estimada (low, medium, high) |
| `provider.fidelity` | Score de fidelidade (0.0–1.0) |
| `provider.fallback` | true se todos os provedores falharam |

**`validator.validateInvariants`**
| Atributo | Descrição |
|---|---|
| `validation.overall_score` | Score geral (0.0–1.0) |
| `validation.violated` | true se algum invariante foi violado |
| `validation.invariant` | Nome do invariante violado (shadows, geometry, etc.) |

## Logs com TraceId

Quando um span está ativo, o logger injeta `traceId` e `spanId` automaticamente:

```json
{
  "timestamp": "2026-04-16T10:30:00.000Z",
  "level": "info",
  "service": "simulate",
  "event": "async_job_completed",
  "jobId": "abc123",
  "traceId": "4bf92f3577b34da6a3ce929d0e0e4736",
  "spanId": "00f067aa0ba902b7"
}
```

Use o `traceId` para correlacionar logs com traces no Jaeger.

## Modo No-Op (Padrão)

Com `OTEL_ENABLED=false` (padrão):

- Nenhum pacote `@opentelemetry/*` é importado
- Nenhuma conexão de rede é aberta
- Todos os spans são objetos no-op (métodos vazios)
- `traceId` e `spanId` não aparecem nos logs
- Os 166 testes passam sem nenhuma dependência de rede

**Nunca defina `OTEL_ENABLED=true` em testes.**

## Adicionar Instrumentação Manual

Use `withSpan` para instrumentar operações críticas:

```javascript
import { withSpan } from '../../tracing.js';

const result = await withSpan('meuServico.minhaOperacao', {
  'atributo.customizado': 'valor',
}, async (span) => {
  const data = await minhaOperacao();
  span.setAttribute('resultado.tamanho', data.length);
  return data;
});
```

## Propagação de Contexto em setImmediate

O contexto de trace não atravessa `setImmediate` automaticamente.
Capture o contexto antes e propague explicitamente:

```javascript
import { getContext } from '../../tracing.js';

const activeCtx = getContext().active();

setImmediate(getContext().with(activeCtx, async () => {
  // spans criados aqui são filhos do span raiz
}));
```

Ver implementação em `routes/simulate.js`.
