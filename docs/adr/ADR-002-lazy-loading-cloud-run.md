# ADR-002: Lazy Loading de Dependencias Pesadas para Cloud Run

## Status

Accepted

## Data

2026-03-09

## Contexto

O projeto usa dependencias de inicializacao relativamente pesadas para o fluxo de IA e processamento de imagem:

- `@google/genai`
- `sharp`
- integracoes de fallback de IA

Em ambiente Cloud Run, isso afeta:

- cold start
- tempo de resposta do primeiro request
- memoria inicial do container

## Decisao

Introduzir lazy loading para dependencias pesadas e criar wrappers dedicados:

- `services/gemini/geminiClient.ts`
- `services/huggingface/hfClient.ts`
- `services/image/processing.ts`

Esses wrappers carregam modulos sob demanda e mantem cache local do modulo/cliente quando fizer sentido.

## Consequencias

### Positivas

- menor custo de inicializacao
- menor acoplamento entre bootstrap do servidor e SDKs pesados
- base melhor para rotas leves como health check e analise parcial

### Negativas

- primeira chamada real do fluxo pesado ainda paga custo de carregamento
- necessidade de manter cuidado com cache em ambiente serverless

## Estado atual

Os wrappers lazy ja existem e estao prontos para ser adotados progressivamente na infraestrutura canonica de rendering.

## Proximos passos

- mover esses wrappers para caminhos canonicos em `src/domains/rendering/infrastructure/` ou `src/shared/infrastructure/`
- medir efeito real em Cloud Run com metricas de cold start e p95

## Relacionados

- [rendering-next-implementation-plan.md](/home/vector/Transferências/pisosrealview-pro/docs/architecture/rendering-next-implementation-plan.md)
