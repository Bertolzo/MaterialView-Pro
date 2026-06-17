# Residual de Migracao apos a Fase 6.5

## Objetivo

Registrar o que ainda depende de `services/` depois da consolidacao de `src/domains/rendering/`, separando:

- compatibilidade intencional
- adaptadores legados ainda no caminho critico
- proximos cortes seguros

## Estado atual

Fonte canonica do dominio:

- `src/domains/rendering/domain/`
- `src/domains/rendering/application/`
- `src/domains/rendering/infrastructure/`
- `src/domains/rendering/interface/http/`

Compatibilidade ainda mantida:

- `services/renderWithSelfAuditService.ts`
- `services/semanticValidationService.ts`
- `services/renderCoreService.ts`

## Wrappers residuais intencionais

### `services/renderWithSelfAuditService.ts`

Status:

- facade de compatibilidade
- reexporta a implementacao de `src/domains/rendering/application/renderPipeline.ts`

Pode remover agora?

- nao

Motivo:

- ainda ha testes e possiveis consumidores externos esperando esse path

### `services/semanticValidationService.ts`

Status:

- facade de compatibilidade
- reexporta `src/domains/rendering/domain/validation/`

Pode remover agora?

- quase, mas ainda nao ha ganho relevante em apagar antes de revisar todos os consumidores externos

### `services/renderCoreService.ts`

Status:

- ainda concentra utilitarios compartilhados operacionais
- reexporta parte pura do dominio
- ainda e usado por testes de compatibilidade e por componentes legados

Pode remover agora?

- nao

Motivo:

- ainda e a ponte entre compatibilidade antiga e os modulos novos

## Dependencias residuais de `src/` para `services/`

Hoje o `dependency-cruiser` ainda acusa dependencias informativas de `src/` para `services/`.

Elas estao concentradas nestes pontos:

- `src/domains/rendering/infrastructure/ai/*`
  - wrappers para `promptLoader`, `renderCoreService`, `geminiCommon`, `regressionService`
  - `geminiRoomAnalysis.ts` ainda usa `hfService.server.ts` e `hfAnalysisService.server.ts`
- `src/domains/rendering/infrastructure/persistence/*`
  - wrapper para `materialService`
- `src/domains/rendering/infrastructure/telemetry/*`
  - wrappers para `telemetryService` e `vtaSentryBridge.server`

## Leitura correta desse residual

O nucleo do dominio ja nao depende de `services/`.

O residual agora esta quase todo em:

- interface HTTP
- infraestrutura
- compatibilidade

Isso significa que a migracao saiu do caminho critico de negocio e entrou na borda operacional.

## Reducoes implementadas apos a Fase 6.5

- `services/geminiService.server.ts` passou a consumir imports canonicos do dominio e da infraestrutura nova, em vez de depender diretamente de `services/renderCoreService.ts` para tudo
- os wrappers de compatibilidade passaram a ficar explicitamente marcados como facades
- `src/domains/rendering/interface/http/*` ja nao depende de `services/geminiService.server.ts`
- `src/domains/rendering/infrastructure/ai/roomAnalysisGateway.ts` agora aponta para `geminiRoomAnalysis.ts`
- `src/domains/rendering/infrastructure/ai/renderGateway.ts` agora aponta para `geminiRenderExecution.ts`
- nenhum arquivo em `src/domains/rendering/**` importa `services/geminiService.server.ts`

## Proximos cortes seguros

### Corte 1

Mover `promptLoader`, `geminiCommon`, `regressionService`, `materialService`, `telemetryService` e `vtaSentryBridge.server` para modulos canonicos em `src/shared/` ou `src/domains/rendering/infrastructure/`.

Impacto:

- elimina os `info` do `dependency-cruiser` em infraestrutura

### Corte 2

Migrar testes nao focados em compatibilidade para `src/domains/rendering/`.

Impacto:

- `services/` fica restrito a testes de facade e circularidade

## Criterio para remocao final de `services/`

Podemos comecar a apagar wrappers apenas quando:

- nenhum controller em `src/` depender de `services/`
- nenhum modulo de infraestrutura em `src/` depender de `services/`
- os testes de compatibilidade forem separados dos testes de dominio

## Resumo

A migracao nao elimina completamente `services/`, mas muda a natureza do problema:

- antes, `services/` era o centro do pipeline
- agora, `services/` e legado residual e camada de compatibilidade
- `geminiService.server.ts` ja nao faz parte do caminho de execucao canonico de `src/domains/rendering/**`

Esse e o ponto correto para a proxima limpeza arquitetural.
