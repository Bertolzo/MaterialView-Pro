# ADR-003: Quality Gates Automatizados para o Dominio de Rendering

## Status

Accepted

## Data

2026-03-09

## Contexto

O pipeline de rendering possui risco funcional alto:

- integridade semantica
- preservacao humana
- bleed em nao-piso
- regressao de prompt

Esse tipo de risco nao pode depender apenas de revisao manual.

## Decisao

Adotar quality gates automatizados no repositório com:

- `tsc --noEmit`
- checagem de arquitetura/dependencias com `dependency-cruiser`
- testes de contrato semantico
- testes de regressao do pipeline
- workflow dedicado em `.github/workflows/quality-gates.yml`

Tambem foi adicionado um comando local unico:

- `npm run quality:gate`

## Consequencias

### Positivas

- feedback rapido antes do merge
- regressao arquitetural e semantica detectada cedo
- padrao minimo replicavel para proximos dominios

### Negativas

- pipeline de CI fica um pouco mais custoso
- durante a migracao, algumas violacoes aparecem apenas como `info`

## Resultado observado

Os quality gates ja rodam localmente e validam:

- compilacao
- contratos semanticos
- regressao de rendering
- dependencia circular e regras arquiteturais basicas

## Relacionados

- [quality-gates.yml](/home/vector/Transferências/pisosrealview-pro/.github/workflows/quality-gates.yml)
- [.dependency-cruiser.cjs](/home/vector/Transferências/pisosrealview-pro/.dependency-cruiser.cjs)
