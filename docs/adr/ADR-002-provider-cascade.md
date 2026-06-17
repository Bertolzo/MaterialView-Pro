# ADR-002: Cascata Multi-Provedor com IRT-Router

**Status:** Aceito
**Data:** Abril/2026

## Contexto

Nenhum provedor de IA é 100% confiável. WaveSpeedAI é o mais barato mas pode falhar ou ter timeout. Precisamos de resiliência sem explodir o custo.

## Decisão

Cascata ordenada por `costTier` (menor custo primeiro), com promoção dinâmica baseada em histórico de performance (`TaskMetrics`). Fallback textual garante que o usuário sempre recebe uma resposta.

Ordem de tentativa:
1. WaveSpeedAI (costTier 0, fidelidade 0.85)
2. Zhipu CogView (costTier 1, fidelidade 0.78)
3. Pika Labs (costTier 2, fidelidade 0.75)
4. local-fallback (descrição textual, fidelidade 0.0)

## Consequências

**Positivas:**
- Resiliência a falhas de provedores individuais
- Custo otimizado (tenta o mais barato primeiro)
- O usuário sempre recebe uma resposta (fallback textual)

**Negativas:**
- Latência aumenta quando provedores prioritários falham (soma dos timeouts)
- Complexidade adicional no roteamento

## Arquivos Relevantes

- `backend/services/gateway/ProviderRouter.js`
- `backend/services/gateway/providers/`
