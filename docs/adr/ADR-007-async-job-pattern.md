# ADR-007: Async Job Pattern (202 + Polling)

**Status:** Aceito
**Data:** Abril/2026

## Contexto

Simulações via IA levam 10–45 segundos. Clientes com timeout curto (ex: Vercel Edge, Cloudflare Workers) perderiam a resposta. O modo síncrono legado era inviável para produção.

## Decisão

`POST /v1/simulate` retorna `202 Accepted` imediatamente com `jobId`. O processamento ocorre em background via `setImmediate`. O cliente faz polling em `GET /v1/simulate/:jobId/status`.

Funcionalidades adicionais:
- **Deduplicação**: dois POSTs com mesmo `cacheKey` retornam o mesmo `jobId`
- **Webhook opcional**: cliente pode passar `webhookUrl` para receber notificação ao completar
- **TTL 1h**: jobs são removidos automaticamente após 1 hora
- **Modo legado**: `X-Sync-Mode: true` mantém comportamento síncrono anterior

## Consequências

**Positivas:**
- Elimina timeouts em clientes com limite rígido de tempo
- Deduplicação evita chamadas duplicadas ao provider

**Negativas:**
- Cliente precisa implementar polling ou webhook
- Estado dos jobs é volátil (perdido em restart)

## Arquivos Relevantes

- `backend/routes/simulate.js`
- `backend/routes/simulate/status.js`
- `backend/services/core/JobManager.js`
- `backend/services/core/webhookNotifier.js`
