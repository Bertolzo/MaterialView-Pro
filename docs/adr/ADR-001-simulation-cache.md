# ADR-001: Cache de Simulações com SHA256 + Material

**Status:** Aceito
**Data:** Abril/2026

## Contexto

Chamadas ao WaveSpeedAI custam ~$0.01–0.05 e levam 10–45s. Usuários frequentemente testam o mesmo material na mesma imagem — especialmente durante a fase de escolha de piso, onde o cliente experimenta várias cores do mesmo produto.

## Decisão

Cache em memória (`Map`) com chave SHA256 derivada de `imageBase64 + material.type + material.color + material.dimensions`. TTL de 30 minutos, máximo 100 entradas, limite de 2MB por entrada.

Variáveis de controle:
- `SIMULATION_CACHE_TTL_MS` (padrão: 1.800.000ms)
- `SIMULATION_CACHE_MAX_ENTRIES` (padrão: 100)
- `SIMULATION_CACHE_MAX_ENTRY_BYTES` (padrão: 2.097.152 = 2MB)

## Consequências

**Positivas:**
- Redução de custo e latência para requisições repetidas
- Evita chamadas desnecessárias a APIs externas

**Negativas:**
- Cache não sobrevive a restart do processo (memória volátil)
- Não escala para múltiplas instâncias (cada processo tem seu próprio cache)

## Próximo Passo

Migrar para Redis com TTL para persistência entre restarts e compartilhamento entre instâncias.

## Arquivos Relevantes

- `backend/services/core/simulationCache.js`
