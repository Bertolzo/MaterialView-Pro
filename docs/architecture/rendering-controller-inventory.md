# Rendering Controller Inventory

Data: 2026-03-09

## Estado do dominio `rendering`

| Entry point | Status | Observacao |
| --- | --- | --- |
| `src/domains/rendering/interface/http/analysisController.ts` | Refatorado | Usa `application/analyzeRoom` |
| `src/domains/rendering/interface/http/renderController.ts` | Refatorado | Usa `application/renderScene` |
| `bin/pisodev.js` | Parcialmente consolidado | `analyze`, `render` e `validate` passam por `application/`; infraestrutura residual fica em gateways |

## Outros controllers/endpoints fora de `rendering`

| Arquivo | Tipo | Status | Observacao |
| --- | --- | --- | --- |
| `api/health.ts` | Vercel handler | Estavel | Endpoint simples, sem acoplamento ao dominio de rendering |
| `api/dashboard.ts` | Express router | Estavel | Usa `api/lib/db`, sem relacao com rendering |
| `api/agent-log.ts` | Express router | Estavel | Persistencia de logs de agente, sem relacao com rendering |
| `api/analyze.ts` | Facade HTTP | Compatibilidade | Delegacao para controller canônico de rendering |
| `api/render.ts` | Facade HTTP | Compatibilidade | Delegacao para controller canônico de rendering |

## Dependencias residuais de `services/` ainda intencionais

Estas dependencias ainda existem, mas agora estao concentradas em infraestrutura:

- `src/domains/rendering/infrastructure/ai/roomAnalysisGateway.ts`
- `src/domains/rendering/infrastructure/ai/renderGateway.ts`
- `src/domains/rendering/infrastructure/persistence/materialCatalogGateway.ts`
- `src/domains/rendering/infrastructure/persistence/materialTextureGateway.ts`
- `src/domains/rendering/infrastructure/telemetry/renderObservability.ts`

## Proximo corte recomendado

1. Extrair porta canônica para `renderGateway`
2. Reduzir dependencia residual de `services/geminiService.server.ts`
3. Revisar se `api/analyze.ts` e `api/render.ts` ainda precisam permanecer como facades separadas
