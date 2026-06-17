# backend/docs — Documentação Técnica do Backend

> Este diretório existe para orientar qualquer LLM (Claude, GPT, Gemini, Kiro, etc.) ou
> desenvolvedor humano que precise entender, modificar ou depurar o backend do PisoRealView Pro.
> Leia este índice antes de qualquer outro arquivo.

## Para LLMs: Leia Primeiro

Se você é um modelo de linguagem trabalhando neste repositório:

1. Leia `../CLAUDE.md` — comandos, padrões de código e o que NÃO modificar.
2. Leia `architecture.md` — fluxo de dados, componentes e ADRs.
3. Leia `telemetry-guide.md` — como ativar e usar OpenTelemetry.
4. Leia `security-changelog.md` — histórico de correções de segurança.

O backend usa **ESM puro** (`import`/`export`). Nunca use `require()`.

## Índice

| Arquivo | Conteúdo |
|---|---|
| `architecture.md` | Diagrama de fluxo, módulos, dependências e ADRs |
| `telemetry-guide.md` | Como ativar OTEL, rodar Jaeger local, ler traces |
| `security-changelog.md` | Histórico de vulnerabilidades corrigidas (SEC-01 a SEC-07) |

## Estrutura do Backend em Uma Linha

```
POST /v1/simulate → JobManager (202) → setImmediate → ProviderRouter → Validator → job.completed
```

## Arquivos Críticos (Não Modificar Sem Discussão)

| Arquivo | Por quê é crítico |
|---|---|
| `../tracing.js` | No-op quando OTEL_ENABLED=false. Qualquer import fora do bloco if quebra os testes. |
| `../services/apiKeyStore.js` | Mutex _writeLock protege contra race condition em api-keys.json. |
| `../services/core/simulationCache.js` | MAX_ENTRY_SIZE_BYTES=2MB previne OOM com imagens grandes. |
| `../server.js` | initTracing() deve ser a primeira instrução, antes de qualquer outro import. |
