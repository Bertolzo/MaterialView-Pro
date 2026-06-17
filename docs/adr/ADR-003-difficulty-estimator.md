# ADR-003: Estimativa de Dificuldade para Roteamento Inteligente

**Status:** Aceito
**Data:** Abril/2026

## Contexto

Imagens complexas (muitos objetos, iluminação difícil) têm maior chance de falha em provedores de menor qualidade. Enviar tarefas difíceis para o provedor mais barato resulta em falhas frequentes e piora a experiência do usuário.

## Decisão

`DifficultyEstimator` classifica cada requisição em `low / medium / high` com base em fatores ponderados:

| Fator | Peso |
|---|---|
| Imagem > 600KB | +2 |
| Imagem > 150KB | +1 |
| Dimensões não-padrão | +1 |
| Cena complexa (> 5 objetos) | +2 |
| Cena moderada (> 2 objetos) | +1 |
| Iluminação desconhecida | +1 |

Score ≤ 1 → `low` | Score 2–3 → `medium` | Score ≥ 4 → `high`

Tarefas `high` definem `minCostTier` mais alto, pulando provedores gratuitos.

## Consequências

**Positivas:**
- Melhor taxa de sucesso em cenas complexas
- Menos tentativas desperdiçadas em provedores inadequados

**Negativas:**
- Custo ligeiramente maior para tarefas `high` (pula free tier)

## Arquivos Relevantes

- `backend/services/gateway/DifficultyEstimator.js`
- `backend/services/gateway/__tests__/DifficultyEstimator.test.js`
