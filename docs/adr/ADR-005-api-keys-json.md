# ADR-005: Armazenamento de API Keys em JSON (MVP)

**Status:** Aceito (temporário)
**Data:** Abril/2026

## Contexto

MVP sem banco de dados. Necessidade de autenticação simples e rápida para validar o produto com os primeiros clientes, sem overhead operacional de infraestrutura.

## Decisão

Arquivo `data/api-keys.json` com leitura/escrita protegida por mutex `_writeLock`. Escrita atômica via `.tmp → renameSync` para evitar corrupção de arquivo.

Planos suportados: `trial (50)`, `basic (200)`, `popular (500)`, `pro (1000)`, `enterprise (3000)`, `demo (10/dia)`.

## Consequências

**Positivas:**
- Zero overhead operacional (sem banco de dados)
- Simples de auditar (arquivo texto legível)

**Negativas:**
- Não escala para múltiplas instâncias (race condition entre processos)
- Sem suporte a queries complexas

## Próximo Passo

Migrar para Redis (sessões) + PostgreSQL (dados persistentes) para suportar deploy multi-instância.

## Arquivos Relevantes

- `backend/services/apiKeyStore.js`
- `backend/data/api-keys.json`
