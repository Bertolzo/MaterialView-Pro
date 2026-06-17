# ADR-008: OpenTelemetry com No-Op Padrão

**Status:** Aceito
**Data:** Abril/2026

## Contexto

Observabilidade é crítica em produção para debugar falhas de providers e latência. Mas importar pacotes `@opentelemetry/*` em testes cria dependências de rede e aumenta o tempo de execução da suíte.

## Decisão

`tracing.js` opera em modo no-op quando `OTEL_ENABLED=false` (padrão). Nenhum pacote `@opentelemetry/*` é importado, nenhuma conexão de rede é aberta. Todos os spans são objetos JavaScript puros com métodos vazios.

Quando `OTEL_ENABLED=true`, as dependências são importadas dinamicamente (`await import(...)`) e o SDK é inicializado com exportador OTLP HTTP para Jaeger.

## Consequências

**Positivas:**
- Zero overhead em testes (166 testes passam sem nenhuma dependência de rede)
- Instrumentação completa disponível em produção com uma variável de ambiente

**Negativas:**
- `setImmediate` não propaga contexto automaticamente — exige `getContext().with()` explícito
- `logger.js` precisa acessar `globalThis.__otelApi` para injetar `traceId`/`spanId` (ESM não suporta import síncrono condicional)

## Ativar em Produção/Desenvolvimento

```bash
OTEL_ENABLED=true
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
```

Ver `backend/docs/telemetry-guide.md` para instruções completas.

## Arquivos Relevantes

- `backend/tracing.js`
- `backend/docs/telemetry-guide.md`
- `backend/services/gateway/logger.js`
