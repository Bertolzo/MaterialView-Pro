# Relatorio de Uso do `kwaipilot/kat-coder-pro` com Base na Analise do PisosRealView PRO

## Objetivo

Este documento transforma a analise tecnica recente do PisosRealView PRO em um guia operacional para uso com multiplas CLIs e, em especial, com o `kwaipilot/kat-coder-pro`.

O foco aqui nao e reanalisar o sistema, mas mostrar como usar a analise produzida para acelerar a implementacao das melhorias de forma controlada, incremental e auditavel.

---

## Resumo

A analise tecnica anterior identificou quatro grupos principais de trabalho:

1. gargalos de performance em hot paths do backend
2. repeticao de processamento de imagem e I/O sincrono evitavel
3. wrappers residuais de infraestrutura ainda acoplados a `services/`
4. oportunidades claras de consolidacao arquitetural em `src/domains/rendering/`

O `kat-coder-pro` se encaixa como executor assistido dessas melhorias, desde que receba:

- backlog claro
- contexto arquitetural
- criterio de aceite
- sequencia procedural
- comandos de validacao

Em outras palavras: o melhor uso do agente nao e pedir "otimize tudo", mas sim entregar tarefas pequenas, testaveis e ordenadas.

---

## Como o `kat-coder-pro` se encaixa no fluxo

O `kat-coder-pro` deve ser usado como um agente de implementacao semi-automatizada para:

- refatorar arquivos pontuais
- criar ou ajustar testes
- aplicar mudancas repetitivas com contexto
- seguir uma lista de tarefas priorizadas
- rodar validacoes locais apos cada etapa

Ele nao substitui a analise arquitetural. Ele acelera a execucao dela.

No contexto atual do PisosRealView PRO, o uso mais produtivo e:

- deixar a analise e o backlog em `.md`
- usar uma CLI principal para coordenacao
- usar o `kat-coder-pro` para implementar um item por vez
- usar testes e guardrails como freio automatico

---

## Modelo recomendado para uso com multiplas CLIs

### Papel de cada CLI

#### 1. CLI de analise/planejamento

Usar para:

- revisar arquitetura
- identificar gargalos
- priorizar backlog
- escrever ADRs e relatorios

Saida esperada:

- documentos `.md`
- lista priorizada de tarefas
- criterios de aceite

#### 2. `kat-coder-pro`

Usar para:

- implementar um item especifico do backlog
- gerar patches/refatoracoes
- atualizar testes
- executar validacao local

Saida esperada:

- alteracoes pequenas e revisaveis
- relatorio do que foi modificado
- status dos testes apos cada item

#### 3. CLI de validacao/qualidade

Usar para:

- rodar `lint`
- rodar `vitest`
- rodar `dependency-cruiser`
- rodar coverage

Saida esperada:

- feedback objetivo de regressao

---

## Regra operacional importante

Ao usar multiplas CLIs, cada uma deve receber um papel claro:

- uma pensa
- uma implementa
- uma valida

Misturar tudo na mesma sessao piora a qualidade de contexto e aumenta o risco de alteracoes difusas.

---

## Backlog acionavel para o `kat-coder-pro`

Com base na analise tecnica anterior, este e o backlog inicial recomendado.

## Prioridade Alta

### 1. Cache de prompts

- Arquivo principal: `src/domains/rendering/infrastructure/ai/promptLoader.ts`
- Problema: leitura de prompt com `readFileSync` em hot path
- Impacto: I/O sincrono por request
- Objetivo: adicionar cache em memoria por `provider/version/type`
- Validacao:
  - testes de prompt
  - testes de render
  - `npm run lint`

### 2. Reutilizacao de imagens otimizadas por request

- Arquivos principais:
  - `src/domains/rendering/application/renderPipeline.ts`
  - `src/domains/rendering/infrastructure/ai/geminiRenderExecution.ts`
  - `services/regressionService.ts`
- Problema: mesma imagem e otimizada varias vezes no mesmo fluxo
- Impacto: CPU, memoria e latencia
- Objetivo: introduzir um contexto de assets otimizados por request
- Validacao:
  - testes de render
  - testes HTTP
  - coverage do dominio

### 3. Cache server-side de catalogo e textura

- Arquivos principais:
  - `src/domains/rendering/infrastructure/persistence/materialCatalogGateway.ts`
  - `services/materialService.ts`
- Problema:
  - `fetchMaterials()` com latencia artificial
  - ausencia de cache efetivo no backend
- Impacto: overhead em CLI real e render
- Objetivo:
  - remover delay artificial
  - introduzir cache em memoria ou Redis
  - separar claramente comportamento browser/server
- Validacao:
  - testes unitarios do gateway
  - testes da CLI real
  - testes de render

### 4. Inicializacao unica de Sentry

- Arquivos principais:
  - `src/domains/rendering/interface/http/analysisController.ts`
  - `src/domains/rendering/interface/http/renderController.ts`
- Problema: `Sentry.init()` em cada request
- Impacto: custo repetido e ruido operacional
- Objetivo: mover bootstrap para inicializacao do processo
- Validacao:
  - testes HTTP
  - smoke test local

### 5. Timeout cancelavel e cancelamento real de requests paralelos

- Arquivos principais:
  - `services/renderCoreService.ts`
  - `services/hfAnalysisService.server.ts`
- Problema:
  - timeout logico sem cancelamento efetivo
  - trabalho continua em voo apos `Promise.race`
- Impacto: desperdicio de recursos
- Objetivo: usar `AbortController` e limpar timers
- Validacao:
  - testes unitarios
  - testes de integracao de analise

---

## Prioridade Media

### 6. Remover import de `services` da porta de observabilidade

- Arquivo principal: `src/domains/rendering/application/ports/renderObservability.ts`
- Problema: porta de `application` importa tipos de `services`
- Objetivo: mover tipos compartilhados para `domain/shared` ou `src/shared`

### 7. Mover composicao default para fora de `application`

- Arquivos principais:
  - `src/domains/rendering/application/analyzeRoom.ts`
  - `src/domains/rendering/application/renderScene.ts`
- Problema: casos de uso ainda puxam implementacoes concretas default
- Objetivo: composition root na borda

### 8. Reduzir o tamanho funcional de `renderPipeline.ts`

- Arquivo principal: `src/domains/rendering/application/renderPipeline.ts`
- Problema: orquestrador ainda muito grande
- Objetivo: quebrar em coordenadores menores

### 9. Consolidar wrappers residuais de infraestrutura

- Arquivos principais:
  - `src/domains/rendering/infrastructure/ai/geminiExecution.ts`
  - `src/domains/rendering/infrastructure/ai/promptLoader.ts`
  - `src/domains/rendering/infrastructure/ai/structuralAudit.ts`
  - `src/domains/rendering/infrastructure/ai/securityCircuit.ts`
  - `src/domains/rendering/infrastructure/telemetry/renderObservability.ts`
- Problema: ainda sao facades para `services/*`
- Objetivo: reduzir dependencias residuais

---

## Como preparar o backlog para o agente

O formato ideal para o `kat-coder-pro` e um backlog orientado a execucao.

Exemplo de item:

```md
## Item 1 - Cache de prompts

- Arquivo alvo: `src/domains/rendering/infrastructure/ai/promptLoader.ts`
- Problema: `readFileSync` executado a cada chamada
- Objetivo: adicionar cache em memoria por chave `provider/version/type`
- Restricoes:
  - nao mudar contrato publico
  - nao alterar texto dos prompts
  - preservar testes existentes
- Validacao obrigatoria:
  - `npx vitest run tests/unit/promptLoader.test.ts`
  - `npm run lint`
  - `npm run complexity:check`
```

Esse formato reduz ambiguidade e evita que o agente ataque o problema de forma ampla demais.

---

## Prompt recomendado para o `kat-coder-pro`

Use um prompt deste tipo:

```md
Voce vai implementar apenas o item abaixo.

Item: Cache de prompts

Contexto:
- Projeto: PisosRealView PRO
- Dominio principal: `src/domains/rendering/`
- Ha testes e guardrails arquiteturais ativos

Tarefa:
- No arquivo `src/domains/rendering/infrastructure/ai/promptLoader.ts`, substituir o carregamento repetido de prompts por um cache em memoria.
- A chave do cache deve considerar `provider`, `version` e `type`.
- Nao alterar a API publica de `loadPrompt` e `renderPrompt`.
- Nao alterar o conteudo dos prompts.

Apos implementar:
- rode `npx vitest run tests/unit/promptLoader.test.ts`
- rode `npm run lint`
- rode `npm run complexity:check`

Se algum teste falhar:
- corrija antes de concluir

Ao final:
- resuma o que foi alterado
- informe o resultado das validacoes
```

---

## Ordem recomendada de execucao com o agente

Para evitar regressao arquitetural e desperdicio, a sequencia sugerida e:

1. cache de prompts
2. timeout cancelavel
3. cache de catalogo/material
4. reutilizacao de imagens otimizadas
5. mover `Sentry.init`
6. limpar portas e wrappers residuais
7. dividir `renderPipeline.ts`

Essa ordem tem uma vantagem pratica:

- primeiro elimina custos locais simples
- depois reduz custo operacional por request
- por fim ataca consolidacao arquitetural mais sensivel

---

## Fluxo recomendado com multiplas CLIs

### Etapa 1. Planejamento

Use a CLI de analise para:

- escrever ou atualizar o backlog
- validar prioridade
- registrar criterios de aceite

Artefato:

- `todo-refactoring.md` ou equivalente

### Etapa 2. Implementacao

Use o `kat-coder-pro` para:

- pegar um item por vez
- alterar apenas os arquivos necessarios
- rodar validacoes

### Etapa 3. Revisao

Use uma CLI de revisao/analise para:

- verificar regressao arquitetural
- revisar risco semantico
- avaliar se houve vazamento de responsabilidade

### Etapa 4. Integracao

Rode:

- `npm run lint`
- `npm run complexity:check`
- `npm run quality:gate`

Se o item tocar render:

- rodar testes de `rendering`

Se tocar CLI:

- rodar `npm run test:cli`

---

## Exemplo de uso pratico por item

### Caso 1. Cache de prompts

Entrada para o agente:

- problema localizado
- arquivo alvo unico
- criterio de aceite simples

Motivo para comecar por aqui:

- baixo risco semantico
- impacto real em performance
- alteracao facilmente testavel

### Caso 2. Reutilizacao de imagens otimizadas

Entrada para o agente:

- varios arquivos
- necessidade de alterar assinaturas
- necessidade de preservar contratos

Como quebrar:

1. criar tipo `RenderAssetContext`
2. adaptar `renderPipeline`
3. adaptar `geminiRenderExecution`
4. adaptar `regressionService`
5. ajustar testes

Aqui o agente deve receber tarefas menores, nao um pedido unico.

---

## Regras para nao perder controle usando agentes

1. Nao entregue multiplas prioridades altas no mesmo prompt.
2. Nao peça refatoracao e redesign ao mesmo tempo.
3. Sempre inclua comandos de validacao no prompt.
4. Sempre diga o que nao pode mudar.
5. Sempre revise diffs em itens que tocam:
   - `renderPipeline.ts`
   - `geminiRenderExecution.ts`
   - `geminiRoomAnalysis.ts`
   - `regressionService.ts`

---

## Criterios de aceite minimos por tarefa

Cada tarefa executada pelo `kat-coder-pro` deve sair com:

- escopo pequeno
- arquivos afetados listados
- testes executados
- resultado de `lint`
- resultado de `dependency-cruiser` ou `complexity:check`
- resumo do risco residual

Se o agente nao entregar isso, a tarefa nao esta concluida.

---

## O que nao delegar de primeira para o agente

Evite comecar por tarefas amplas demais, como:

- "otimize toda a arquitetura"
- "migre tudo de services para src"
- "reescreva o pipeline inteiro"

Essas tarefas sao inadequadas para uso tatico de um agente e tendem a gerar:

- diffs grandes
- regressao semantica
- perda de rastreabilidade

---

## Estrategia recomendada para este projeto

No estado atual do PisosRealView PRO, o melhor uso do `kat-coder-pro` e:

- como executor de backlog priorizado
- em ciclos pequenos
- com validacao automatica obrigatoria
- com forte apoio dos testes ja existentes

O projeto ja tem maturidade suficiente para esse modelo porque possui:

- testes unitarios
- testes de integracao
- testes de arquitetura
- quality gates
- documentacao de migracao

Isso torna o agente mais seguro de usar.

---

## Conclusao

O `kat-coder-pro` deve ser usado como instrumento de execucao controlada das melhorias ja identificadas pela analise tecnica.

O caminho mais eficiente e:

1. transformar a analise em backlog operacional
2. entregar um item por vez ao agente
3. exigir validacao automatica apos cada alteracao
4. usar outra CLI para revisao arquitetural

Para este projeto, o melhor proximo passo com o agente e iniciar pelos itens de alta prioridade de menor risco:

1. cache de prompts
2. timeout cancelavel
3. cache de catalogo/material

Depois disso, o agente pode avancar para itens mais sensiveis, como reutilizacao de imagens otimizadas e consolidacao de wrappers residuais.

---

## Proximo artefato recomendado

Se necessario, o proximo documento a ser criado e:

- `docs/architecture/todo-refactoring-for-agents.md`

com o backlog ja quebrado em tarefas pequenas, cada uma pronta para ser copiada e colada no `kat-coder-pro`.
