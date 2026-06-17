# Métricas Internas — MaterialView Pro

Documento operacional. Define os gatilhos numéricos que determinam quando evoluir cada componente técnico do sistema. Não é roadmap de features — é um guia de decisão baseado em dados reais de produção.

---

## Como usar este documento

1. Consulte `GET /v1/admin/metrics` semanalmente (requer `Authorization: Bearer {ADMIN_SECRET}`)
2. Compare os valores retornados com os gatilhos abaixo
3. Quando um gatilho for atingido, execute a ação correspondente

---

## Gatilho 1 — Migrar CreditTracker para Redis

**Contexto:** O `CreditTracker` atual usa memória in-process. Em processo único (Railway com 1 instância), funciona perfeitamente. Em multi-processo, os contadores de crédito ficam dessincronizados entre instâncias.

**Gatilho de ativação:**

```
paidClients >= 50
OU
simulationsToday >= 300 (em qualquer dia dos últimos 7)
```

**Como medir:**

```bash
curl -H "Authorization: Bearer $ADMIN_SECRET" \
  https://<railway-url>/v1/admin/metrics
# Observe: paidClients e simulationsToday
```

**Ação:** Implementar spec `producao-redis-credittracker` (já existe em `.kiro/specs/producao-redis-credittracker/`).

**Custo estimado:** Redis no Railway ~R$ 30/mês. Esforço: 1-2 dias de desenvolvimento.

---

## Gatilho 2 — Ativar múltiplas instâncias (PM2 / Railway scaling)

**Contexto:** Uma instância Railway suporta ~50 requisições simultâneas confortavelmente. Acima disso, latência aumenta.

**Gatilho de ativação:**

```
paidClients >= 100
OU
p95 de latência em /v1/simulate > 8s (medido por Railway metrics)
```

**Como medir:** Painel Railway → Metrics → Response Time p95.

**Pré-requisito:** Redis deve estar ativo (Gatilho 1 já executado).

**Ação:** Configurar Railway para 2+ instâncias. Adicionar `cluster` mode ou usar Railway autoscaling.

**Custo estimado:** +R$ 150/mês por instância adicional.

---

## Gatilho 3 — Substituir roomAnalyzer por modelo mais barato (Kimi K2)

**Contexto:** O `roomAnalyzer` atual usa stub local (fallback). Quando ativado com LLM real, o custo por análise pode ser reduzido usando Kimi K2 (~1/25 do custo do Claude).

**Gatilho de ativação:**

```
paidClients >= 20
E custo mensal de API > R$ 200
```

**Como medir:** Soma das faturas de API (WaveSpeedAI + LLM) no mês.

**Ação:** Criar provider `kimi-k2` no `roomAnalyzer.ts` com endpoint `https://api.moonshot.cn/v1`. Testar fidelidade de análise vs. Claude antes de ativar em produção.

**Custo estimado:** Kimi K2 ~$0.0002/1k tokens vs. Claude ~$0.003/1k tokens.

---

## Gatilho 4 — Implementar banco de dados persistente (PostgreSQL)

**Contexto:** O `apiKeyStore.js` atual usa arquivo JSON em disco. Funciona para até ~500 clientes. Acima disso, leitura/escrita do arquivo inteiro a cada requisição vira gargalo.

**Gatilho de ativação:**

```
totalClients >= 200
OU
arquivo keys.json > 1 MB
```

**Como medir:**

```bash
# No servidor Railway (via Railway CLI ou logs)
ls -lh data/keys.json
```

**Ação:** Migrar `apiKeyStore.js` para PostgreSQL (Railway já oferece PostgreSQL nativo). Manter interface idêntica (`loadKeys`, `saveKey`, `getKey`) para zero impacto no restante do código.

**Custo estimado:** PostgreSQL no Railway ~R$ 0 (plano hobby) até R$ 80/mês (plano pro). Esforço: 1 dia.

---

## Gatilho 5 — Dashboard administrativo com UI

**Contexto:** O endpoint `GET /v1/admin/metrics` já retorna dados estruturados. Uma UI simples elimina a necessidade de usar `curl` para monitorar o negócio.

**Gatilho de ativação:**

```
paidClients >= 10
OU
o fundador consulta /admin/metrics mais de 3x por semana
```

**Ação:** Criar página `/admin` no frontend React com:
- Cards: totalClients, paidClients, trialClients, simulationsToday
- Tabela: planDistribution
- Gráfico simples: simulações por dia (últimos 30 dias)

**Custo estimado:** 2-3 dias de desenvolvimento. Zero custo de infraestrutura (já está no Vercel).

---

## Gatilho 6 — Integrar CLIP no validator.js

**Contexto:** O `validator.js` atual usa histograma de luminância e distância de Bhattacharyya para validar invariantes semânticas. CLIP (via Replicate) oferece validação semântica mais precisa (~$0.001/validação).

**Gatilho de ativação:**

```
taxa de rejeição 409 > 15% das simulações em qualquer semana
OU
reclamações de clientes sobre qualidade de imagem >= 3 no mês
```

**Como medir:** Logs do backend — contar respostas HTTP 409 vs. 200 em `/v1/simulate`.

**Ação:** Adicionar provider CLIP no `validator.js` como validação secundária. Manter Bhattacharyya como validação primária (zero custo).

**Custo estimado:** ~R$ 0.006/simulação adicional. Só ativar quando a qualidade atual for insuficiente.

---

## Resumo dos gatilhos

| # | Componente | Gatilho principal | Custo adicional |
|---|---|---|---|
| 1 | Redis (CreditTracker) | 50 clientes pagos | ~R$ 30/mês |
| 2 | Multi-instância | 100 clientes pagos | ~R$ 150/mês |
| 3 | Kimi K2 (roomAnalyzer) | 20 clientes + custo API > R$ 200 | Reduz custo |
| 4 | PostgreSQL (apiKeyStore) | 200 clientes totais | ~R$ 0–80/mês |
| 5 | Dashboard UI | 10 clientes pagos | R$ 0 |
| 6 | CLIP (validator) | Taxa 409 > 15% | ~R$ 0.006/sim |

---

## Métricas de saúde — verificação semanal

Execute toda segunda-feira:

```bash
# 1. Métricas de clientes
curl -s -H "Authorization: Bearer $ADMIN_SECRET" \
  https://<railway-url>/v1/admin/metrics | jq .

# 2. Health check
curl -s https://<railway-url>/health

# 3. Métricas de providers (BEST-Route scores)
curl -s -H "Authorization: Bearer $ADMIN_SECRET" \
  https://<railway-url>/v1/admin/provider-metrics | jq .
```

Valores de referência saudáveis:
- `activeClients / totalClients` > 0.7 (churn baixo)
- `simulationsToday` > 0 em dias úteis (produto sendo usado)
- Nenhum provider com score BEST-Route < 0.3 (qualidade mínima)

---

*Última atualização: Abril 2026*
