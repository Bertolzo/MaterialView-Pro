# ADR-001: Migracao de Services Monoliticos para Dominios DDD

## Status

Accepted

## Data

2026-03-09

## Contexto

O pipeline de rendering do projeto estava concentrado em `services/`, com responsabilidades misturadas:

- geracao de imagem
- validacao semantica
- montagem de prompts
- retry e timeout
- telemetria
- adaptadores de IA

O principal sintoma era a concentracao excessiva em arquivos como:

- `services/renderWithSelfAuditService.ts`
- `services/geminiService.server.ts`
- `services/renderCoreService.ts`

Problemas observados:

- alta complexidade ciclomática em pontos criticos
- maior risco de regressao semantica em mudancas pequenas
- acoplamento entre regra de negocio e SDKs externos
- dificuldade de evoluir Cloud Run e CI/CD com clareza arquitetural

## Decisao

Migrar incrementalmente o pipeline para `src/domains/rendering/`, seguindo uma estrutura inspirada em DDD e Clean Architecture:

- `domain/` para regras puras e contratos
- `application/` para orquestracao
- `infrastructure/` para adaptadores externos
- `interface/` para entrada HTTP e eventos

Durante a transicao, manter `services/` como camada de compatibilidade e facades temporarias.

## Consequencias

### Positivas

- reducao forte da complexidade nas funcoes criticas
- regras semanticas isoladas e testaveis
- entrada HTTP, orquestracao e infraestrutura separadas
- base melhor para quality gates e evolucao operacional

### Negativas

- duplicacao temporaria de caminhos durante a migracao
- necessidade de manter wrappers legados por algum tempo
- `dependency-cruiser` ainda mostra dependencias residuais de transicao

## Resultado observado

O dominio de rendering deixou de ser centrado em `services/` e passou a ter fonte canonica em:

- `src/domains/rendering/domain/`
- `src/domains/rendering/application/`
- `src/domains/rendering/infrastructure/`
- `src/domains/rendering/interface/http/`

## Relacionados

- [rendering-refactor-plan.md](/home/vector/Transferências/pisosrealview-pro/docs/architecture/rendering-refactor-plan.md)
- [rendering-refactor-report.md](/home/vector/Transferências/pisosrealview-pro/docs/architecture/rendering-refactor-report.md)
- [rendering-next-implementation-plan.md](/home/vector/Transferências/pisosrealview-pro/docs/architecture/rendering-next-implementation-plan.md)
- [rendering-migration-residuals.md](/home/vector/Transferências/pisosrealview-pro/docs/architecture/rendering-migration-residuals.md)
