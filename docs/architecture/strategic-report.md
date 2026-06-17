# Relatório Estratégico - PisosRealView PRO

## 1. Resumo Executivo

O projeto já saiu da fase mais arriscada da refatoração. O domínio `rendering` em `src/domains/rendering/` tem separação real entre `domain`, `application`, `infrastructure` e `interface`, os controllers HTTP já delegam para casos de uso canônicos, e há guardrails ativos com `dependency-cruiser` e testes de arquitetura.

O problema central agora não é mais o facade legado `services/geminiService.server.ts`. O risco principal migrou para três áreas:

- wrappers residuais de infraestrutura ainda dependentes de `services/*`
- custos operacionais repetidos em hot paths, especialmente otimização de imagem, carga de prompts e catálogo/texturas
- composição arquitetural ainda incompleta, com `application` usando defaults concretos de `infrastructure`

A melhor estratégia para os próximos ciclos é combinar duas trilhas em paralelo:

- reduzir custo operacional com mudanças de baixo risco e alto impacto
- consolidar a arquitetura alvo sem reabrir regressão semântica no pipeline de render

A recomendação principal é executar primeiro os itens que reduzem custo local sem mexer em semântica de IA:
1. cache de prompts
2. timeout/cancelamento
3. cache server-side de catálogo/texturas
4. composição explícita e eliminação gradual de wrappers residuais

---

## 2. Análise Estratégica

### Estado atual: pontos fortes

- O domínio `rendering` está claramente mapeado em `src/domains/rendering/`.
- `interface/http` já delega para casos de uso:
  - `src/domains/rendering/interface/http/analysisController.ts`
  - `src/domains/rendering/interface/http/renderController.ts`
- A CLI já passa por `application` e não pelo legado diretamente:
  - `bin/pisodev.js`
- O caminho crítico de `src/domains/rendering/**` já não depende de `services/geminiService.server.ts`.
- Existem guardrails arquiteturais em:
  - `.dependency-cruiser.cjs`
  - `tests/unit/renderingArchitectureBoundaries.test.ts`
- A cobertura de testes está bem distribuída:
  - contratos semânticos
  - prompts
  - integração HTTP
  - CLI
  - fronteiras arquiteturais

### Pontos consolidados

- regras semânticas do VTA isoladas em `domain/validation`
- builders puros de geração em `domain/generation`
- orquestração principal migrada para `application/renderPipeline.ts`
- portas formais para gateways principais
- documentação arquitetural já existente:
  - `docs/architecture/obsidian-rendering-state.md`
  - `docs/architecture/rendering-migration-residuals.md`
  - `docs/architecture/multi-cli-kat-coder-pro-report.md`

### Dívidas técnicas remanescentes

#### 1. Application ainda conhece infraestrutura concreta
Mesmo com portas formais, os defaults ainda são compostos dentro de `application`:

- `src/domains/rendering/application/analyzeRoom.ts`
- `src/domains/rendering/application/renderScene.ts`

Isso mantém acoplamento estrutural e impede endurecer a regra `application -> infrastructure`.

#### 2. Porta de observabilidade ainda vaza tipos de `services`
Arquivo:
- `src/domains/rendering/application/ports/renderObservability.ts`

Esse é um vazamento de dependência para fora da camada.

#### 3. Infraestrutura ainda depende bastante de wrappers legados
Arquivos principais:
- `src/domains/rendering/infrastructure/ai/geminiExecution.ts`
- `src/domains/rendering/infrastructure/ai/promptLoader.ts`
- `src/domains/rendering/infrastructure/ai/securityCircuit.ts`
- `src/domains/rendering/infrastructure/ai/structuralAudit.ts`
- `src/domains/rendering/infrastructure/persistence/materialCatalogGateway.ts`
- `src/domains/rendering/infrastructure/persistence/materialTextureGateway.ts`
- `src/domains/rendering/infrastructure/telemetry/renderObservability.ts`

A arquitetura melhorou, mas parte da infraestrutura nova ainda é apenas fachada do legado.

#### 4. Gargalos operacionais ainda ativos
A análise técnica anterior mostrou os principais:

- prompts carregados via `readFileSync` em hot path
- otimização de imagem repetida no mesmo request
- cache server-side inexistente para texturas
- `Sentry.init()` por request
- timeout sem cancelamento efetivo
- catálogo com latência artificial em `services/materialService.ts`

#### 5. `renderPipeline.ts` ainda é grande
Arquivo:
- `src/domains/rendering/application/renderPipeline.ts`

Mesmo refatorado, continua sendo o centro de coordenação mais sensível do domínio. É um ponto de manutenção delicado.

### Conformidade com Clean Architecture / DDD

#### Aderente
- `domain/` está livre de dependências operacionais relevantes
- controllers não carregam regra semântica de negócio
- adaptadores foram formalizados com portas
- existem testes específicos para fronteiras

#### Ainda em desvio
- `application/` ainda importa infraestrutura concreta por default
- tipos de `services` ainda aparecem em porta de `application`
- `dependency-cruiser` ainda aceita `application -> infrastructure` como `info`
- infraestrutura nova ainda reexporta muito do legado

### Risco arquitetural real hoje

Baixo risco de regressão semântica pura.  
Médio risco de estagnação arquitetural se o time continuar empilhando wrappers sem fechar composition root e sem migrar os adapters residuais.

---

## 3. Backlog Refinado e Priorizado

### Legenda
- Impacto: Alto / Médio / Baixo
- Esforço: P / M / G
- Delegável ao `kat-coder-pro`: Sim / Parcial / Não

| Item | Impacto | Esforço | Dependências | Risco de regressão | Delegável |
|---|---|---:|---|---|---|
| Cache de prompts | Alto | P | nenhuma | baixo | Sim |
| Timeout cancelável + limpeza de timers | Alto | M | nenhuma | médio | Parcial |
| Cancelamento real em HF analysis | Alto | M | timeout cancelável | médio | Parcial |
| Cache server-side de catálogo | Alto | M | nenhuma | baixo | Sim |
| Cache server-side de textura | Alto | M/G | catálogo ou storage policy | médio | Parcial |
| Remover `Sentry.init()` por request | Médio | P | definir bootstrap | baixo | Sim |
| Extrair tipos de observabilidade para `shared` | Médio | P | nenhuma | baixo | Sim |
| Composition root explícito | Alto | M | portas estabilizadas | médio | Parcial |
| Endurecer regra `application -> infrastructure` | Médio | P | composition root | baixo | Sim |
| Migrar `geminiExecution.ts` para canônico | Alto | M | composition root não obrigatório | médio | Parcial |
| Migrar `promptLoader.ts` canônico real | Médio | P/M | cache de prompts | baixo | Sim |
| Migrar `securityCircuit.ts` / `structuralAudit.ts` | Médio | M | tipos/shared estáveis | médio | Parcial |
| Dividir `renderPipeline.ts` | Médio | G | composition root e adapters mais estáveis | médio/alto | Não |
| Remover wrappers residuais de `services/` | Alto | G | vários itens anteriores | médio | Não |
| Expansão de testes de arquitetura | Médio | P | nenhuma | baixo | Sim |
| Profiling real com clinic.js/0x | Médio | M | baseline definida | baixo | Não |

### Ordem recomendada

#### Bloco 1: ganhos rápidos e seguros
1. Cache de prompts
2. Remover `Sentry.init()` por request
3. Extrair tipos de observabilidade para `shared`
4. Expansão de testes de arquitetura

#### Bloco 2: redução de custo operacional
5. Timeout cancelável
6. Cancelamento real em HF analysis
7. Cache server-side de catálogo
8. Cache server-side de textura

#### Bloco 3: consolidação arquitetural
9. Composition root explícito
10. Endurecer `application -> infrastructure`
11. Migrar `geminiExecution.ts`
12. Migrar `promptLoader.ts`, `securityCircuit.ts`, `structuralAudit.ts`

#### Bloco 4: fechamento estrutural
13. Dividir `renderPipeline.ts`
14. Remover wrappers residuais de `services/`

### Itens com maior retorno imediato

- cache de prompts
- catálogo server-side
- `Sentry.init` fora do request
- timeout/cancelamento

Esses quatro melhoram latência e custo sem tocar o contrato semântico do VTA.

---

## 4. ADRs Geradas

## ADR-004: Introduzir Composition Root Explícito para `rendering`

**Status**  
Proposta

**Data**  
2026-03-09

**Contexto**  
Os casos de uso em `src/domains/rendering/application/` já dependem de portas formais, mas ainda montam defaults concretos de infraestrutura dentro da própria camada, por exemplo em:

- `src/domains/rendering/application/analyzeRoom.ts`
- `src/domains/rendering/application/renderScene.ts`

Isso impede endurecer a regra arquitetural de que `application` não deve depender de `infrastructure`.

**Decisão**  
Introduzir um composition root explícito na borda do domínio `rendering`, responsável por conectar:

- casos de uso
- gateways de infraestrutura
- adaptadores HTTP
- adaptadores CLI

A composição deve ocorrer em `interface/` ou em um módulo de bootstrap do domínio, e não dentro dos arquivos de `application`.

**Consequências**
- Positivas:
  - melhora aderência a Clean Architecture
  - permite elevar guardrails arquiteturais
  - simplifica testes com injeção explícita
- Negativas:
  - aumenta número de módulos de wiring
  - exige ajuste coordenado em controllers e CLI
- Riscos:
  - baixo risco funcional
  - médio risco de churn de imports

**Alternativas consideradas**
- Manter defaults em `application`
  - rejeitada por perpetuar acoplamento
- Mover wiring para `infrastructure`
  - rejeitada por inverter a direção de dependência

---

## ADR-005: Adotar Cache em Memória para Prompts e Catálogo no Hot Path

**Status**  
Proposta

**Data**  
2026-03-09

**Contexto**  
O sistema ainda executa operações repetidas em hot path:

- leitura síncrona de prompts
- reconstrução de catálogo a cada lookup
- ausência de cache server-side para texturas

Esses custos são pequenos individualmente, mas somam latência relevante em Cloud Run.

**Decisão**  
Adotar cache em memória por processo para:

- prompts por chave `provider/version/type`
- catálogo de materiais por snapshot carregado
- textura, onde possível, com política separada para backend

O cache deve ser transparente para as camadas superiores e encapsulado nos adaptadores de infraestrutura.

**Consequências**
- Positivas:
  - menor latência por request
  - menor I/O síncrono
  - menos custo redundante de rede e parsing
- Negativas:
  - necessidade de política de invalidação
  - diferenças entre instâncias em ambiente distribuído
- Riscos:
  - baixo risco funcional
  - médio risco operacional se TTL/invalidação forem mal definidos

**Alternativas consideradas**
- Não cachear e depender só de filesystem/rede
  - rejeitada por custo desnecessário
- Usar Redis imediatamente para tudo
  - adiada; memória local é suficiente como primeiro passo

---

## ADR-006: Unificar Política de Timeout e Cancelamento para Provedores de IA

**Status**  
Proposta

**Data**  
2026-03-09

**Contexto**  
O sistema usa timeouts lógicos em múltiplos pontos, mas sem cancelamento consistente do trabalho pendente. Isso aparece em:

- `services/renderCoreService.ts`
- `services/hfAnalysisService.server.ts`

Em cenários de timeout, parte do trabalho ainda continua em execução.

**Decisão**  
Definir uma política única de timeout e cancelamento com os seguintes princípios:

- timers devem ser limpos após resolução
- chamadas externas paralelas devem ser abortáveis
- timeout deve ser responsabilidade de adapter/provider, não do domínio puro
- erros de timeout devem ser mapeados de forma uniforme para HTTP e CLI

**Consequências**
- Positivas:
  - melhor uso de recursos
  - menor contenção em bursts
  - semântica uniforme de falha
- Negativas:
  - aumento de complexidade nos adapters
  - necessidade de testes mais específicos
- Riscos:
  - médio risco de regressão operacional
  - baixo risco semântico

**Alternativas consideradas**
- Manter `Promise.race` simples
  - rejeitada por não cancelar trabalho real
- Aplicar timeout só na borda HTTP
  - rejeitada por deixar adapters inconsistentes

---

## 5. Plano de Ação (3 ciclos)

## Ciclo 1: Redução de custo local e limpeza de borda
**Objetivo**  
Eliminar custos locais fáceis sem mexer no núcleo semântico.

**Entregáveis**
- cache de prompts implementado
- `Sentry.init()` removido dos controllers
- tipos de observabilidade movidos para `shared` ou `domain/shared`
- testes de arquitetura ampliados para impedir novos vazamentos

**Validação**
- `lint` verde
- `complexity:check` verde
- testes de prompt, HTTP e arquitetura verdes
- nenhum import novo de `services/` em `application/` ou `interface/`

**Meta de saída**
- hot path sem `readFileSync` para prompts
- portas de `application` sem dependência de `services`

---

## Ciclo 2: Eficiência operacional do pipeline
**Objetivo**  
Reduzir desperdício de CPU/rede por request.

**Entregáveis**
- timeout cancelável unificado
- cancelamento real em HF analysis
- cache server-side para catálogo
- política inicial para cache de textura no backend

**Validação**
- testes de integração de análise e render verdes
- smoke test com cenários de timeout
- baseline simples de latência antes/depois registrada

**Meta de saída**
- menos trabalho pendente após timeout
- menor latência média em análise/render
- lookup de material sem latência artificial por chamada

---

## Ciclo 3: Consolidação arquitetural
**Objetivo**  
Aproximar o domínio `rendering` do alvo final de Clean Architecture.

**Entregáveis**
- composition root explícito para `rendering`
- casos de uso sem defaults concretos de infraestrutura
- regra `application -> infrastructure` endurecida
- início da migração real de `geminiExecution`, `promptLoader`, `securityCircuit`, `structuralAudit`

**Validação**
- `dependency-cruiser` com menos `info`
- testes de arquitetura atualizados
- controllers e CLI passando pelo novo wiring
- documentação `obsidian-rendering-state.md` atualizada

**Meta de saída**
- `application` desacoplada de implementação concreta
- menos wrappers residuais em `services/`
- base pronta para dividir `renderPipeline.ts` com menor risco

---

## 6. Recomendações de Processo

- Formalizar um `composition-root checklist`.
Antes de qualquer refatoração estrutural, verificar:
  - porta existe
  - adapter existe
  - wiring está na borda
  - teste de arquitetura cobre a regra

- Ampliar os testes de arquitetura.
Os atuais são bons, mas ainda podem crescer para validar:
  - `application` sem imports concretos de `infrastructure`
  - portas sem tipos de `services`
  - lista explícita de wrappers legados permitidos

- Adotar profiling leve antes/depois dos itens de performance.
Ferramentas sugeridas:
  - `clinic.js`
  - `0x`
  - logs de fase com `performance.now()`

- Manter o `kat-coder-pro` restrito a tarefas pequenas.
Melhor delegar:
  - cache de prompts
  - mover tipos
  - ajustes de controller
  - testes de arquitetura
Não delegar de primeira:
  - divisão completa de `renderPipeline.ts`
  - remoção total de `services/`
  - redesenho amplo de composição

- Registrar baseline operacional por ciclo.
Mesmo sem observabilidade sofisticada, registrar:
  - tempo médio de análise
  - tempo médio de render
  - número de chamadas externas por fluxo
  - cache hit rate de prompts/catálogo/texturas

- Atualizar a documentação viva a cada ciclo.
Arquivos prioritários:
  - `docs/architecture/obsidian-rendering-state.md`
  - `docs/architecture/rendering-migration-residuals.md`
  - ADRs novas

- Separar backlog arquitetural de backlog funcional.
Isso evita que o solodev misture refatoração estrutural com entrega de feature na mesma janela e perca previsibilidade.

---

## Conclusão

O projeto está numa fase boa para consolidação, não para recomeço. A base de `rendering` já é suficientemente madura para suportar uma migração disciplinada até Clean Architecture de fato. O erro agora seria atacar mudanças amplas demais sem fechar primeiro os ganhos rápidos e os últimos vazamentos arquiteturais.

A melhor trajetória é:

1. reduzir custo local e operacional
2. consolidar composição e portas
3. migrar wrappers residuais
4. só então dividir o restante do núcleo orquestrador

Se quiser, no próximo passo eu posso converter este relatório em um backlog procedural por ciclo e por agente, sem tocar no código. 
