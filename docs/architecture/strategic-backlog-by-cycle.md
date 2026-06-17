# Backlog Procedural por Ciclo e por Agente

## Objetivo

Este documento traduz o relatório estratégico em um backlog operacional executável, organizado por:

- ciclo
- ordem de execução
- tipo de tarefa
- quem executa melhor
- comandos de validação

Ele foi pensado para uso com múltiplas CLIs e com agentes como `kat-coder-pro`, preservando controle arquitetural e reduzindo risco de regressão.

---

## Como usar este documento

### Papéis recomendados

#### Arquiteto / CLI de análise

Usar para:

- validar escopo
- revisar dependências
- reordenar tarefas quando houver bloqueio
- revisar diffs de itens estruturais

#### `kat-coder-pro`

Usar para:

- tarefas pequenas e locais
- refatorações com critério de aceite claro
- atualização de testes
- tarefas repetitivas de migração

#### CLI de validação

Usar para:

- `npm run lint`
- `npm run complexity:check`
- `npm run quality:gate`
- suítes específicas de `vitest`

---

## Regras de execução

1. Executar um item por vez.
2. Não misturar itens de performance com itens estruturais grandes no mesmo PR.
3. Sempre validar antes de avançar para o próximo item.
4. Quando um item tocar `renderPipeline.ts`, exigir revisão manual.
5. Quando um item tocar `application` e `infrastructure` ao mesmo tempo, revisar impacto nas portas.

---

## Ciclo 1

## Meta do ciclo

Reduzir custo local e limpar vazamentos arquiteturais simples sem mexer no contrato semântico do VTA.

## Critério de saída do ciclo

- prompts não carregam mais com I/O síncrono em hot path
- `Sentry.init()` sai do request path
- portas de `application` não dependem de tipos de `services`
- testes de arquitetura cobrem essas regras

---

### Item 1. Cache de prompts

**Objetivo**

Eliminar leitura repetida de prompt em disco no hot path.

**Arquivos alvo**

- `src/domains/rendering/infrastructure/ai/promptLoader.ts`
- possivelmente `services/promptLoader.ts` se o wrapper ainda for a fonte real

**Tipo**

- performance local
- baixo risco semântico

**Executor recomendado**

- `kat-coder-pro`

**Passos**

1. Identificar a implementação efetiva atual de `loadPrompt`.
2. Adicionar cache em memória por chave `provider/version/type`.
3. Preservar API pública.
4. Garantir que testes de prompt ainda passem.

**Validação mínima**

```bash
npx vitest run tests/unit/promptLoader.test.ts tests/unit/renderPromptContracts.test.ts
npm run lint
npm run complexity:check
```

**Bloqueadores**

- nenhum

**Não fazer junto**

- não mexer em conteúdo dos YAMLs
- não reescrever `renderPipeline.ts`

---

### Item 2. Remover `Sentry.init()` do caminho por request

**Objetivo**

Mover bootstrap de observabilidade para inicialização única.

**Arquivos alvo**

- `src/domains/rendering/interface/http/analysisController.ts`
- `src/domains/rendering/interface/http/renderController.ts`
- arquivo de bootstrap/server se existir

**Tipo**

- otimização operacional
- limpeza de borda

**Executor recomendado**

- `kat-coder-pro`

**Passos**

1. Mapear ponto de bootstrap existente.
2. Extrair inicialização do Sentry para módulo único.
3. Ajustar controllers para apenas consumir ambiente já inicializado.
4. Preservar comportamento quando `SENTRY_DSN` estiver ausente.

**Validação mínima**

```bash
npx vitest run tests/integration/renderingHttpContracts.test.ts
npm run lint
```

**Bloqueadores**

- identificar bootstrap correto do backend

**Não fazer junto**

- não alterar mapeamento de erro HTTP

---

### Item 3. Extrair tipos de observabilidade para camada compartilhada

**Objetivo**

Eliminar vazamento de `services` nas portas de `application`.

**Arquivos alvo**

- `src/domains/rendering/application/ports/renderObservability.ts`
- `services/telemetryService.ts`
- `src/domains/rendering/domain/shared/` ou `src/shared/`

**Tipo**

- conformidade arquitetural

**Executor recomendado**

- `kat-coder-pro`

**Passos**

1. Identificar tipos usados pela porta.
2. Mover os tipos para módulo compartilhado neutro.
3. Ajustar imports da porta e da infraestrutura.
4. Garantir compatibilidade com testes e telemetry.

**Validação mínima**

```bash
npx vitest run tests/unit/renderingArchitectureBoundaries.test.ts tests/telemetry.test.ts
npm run lint
npm run complexity:check
```

**Bloqueadores**

- nenhum

---

### Item 4. Expandir testes de arquitetura

**Objetivo**

Transformar o estado arquitetural atual em regra testável.

**Arquivos alvo**

- `tests/unit/renderingArchitectureBoundaries.test.ts`
- `.dependency-cruiser.cjs`

**Tipo**

- guardrail

**Executor recomendado**

- `kat-coder-pro`

**Passos**

1. Adicionar regra para portas sem dependência de `services`.
2. Adicionar whitelist explícita de wrappers residuais permitidos.
3. Garantir que novos adapters canônicos não voltem a apontar para facades errados.

**Validação mínima**

```bash
npx vitest run tests/unit/renderingArchitectureBoundaries.test.ts
npm run complexity:check
```

**Bloqueadores**

- Item 3 idealmente concluído

---

## Ciclo 2

## Meta do ciclo

Reduzir trabalho redundante por request e melhorar eficiência operacional real do pipeline.

## Critério de saída do ciclo

- timeouts cancelam trabalho real ou limpam timers
- análise HF não continua consumindo recursos após timeout
- catálogo deixa de impor latência artificial por lookup
- política de cache server-side para textura está definida

---

### Item 5. Tornar `withTimeout` cancelável ou ao menos limpo

**Objetivo**

Evitar timers órfãos e criar base para cancelamento consistente.

**Arquivos alvo**

- `services/renderCoreService.ts`
- wrappers canônicos que dependem dele

**Tipo**

- performance operacional
- utilitário transversal

**Executor recomendado**

- `kat-coder-pro` com revisão manual

**Passos**

1. Mapear todos os usos de `withTimeout`.
2. Refatorar para limpar timer ao resolver.
3. Se viável, preparar interface para `AbortController`.
4. Garantir que contratos de erro permaneçam estáveis.

**Validação mínima**

```bash
npx vitest run tests/unit/renderCoreSemantics.test.ts tests/integration/geminiAnalysisFlow.test.ts tests/integration/geminiRenderFlow.test.ts
npm run lint
```

**Bloqueadores**

- nenhum

**Revisão manual obrigatória**

- sim

---

### Item 6. Cancelamento real na análise HF

**Objetivo**

Fazer timeout global interromper trabalho útil, não apenas abandonar resposta.

**Arquivos alvo**

- `services/hfAnalysisService.server.ts`
- possivelmente wrappers ou clientes auxiliares

**Tipo**

- performance remota
- resiliência

**Executor recomendado**

- `kat-coder-pro` com revisão manual

**Passos**

1. Introduzir `AbortController` no fluxo de fetch.
2. Propagar sinal para BLIP e LLaVA.
3. Integrar com política de timeout global.
4. Preservar fallback para Gemini quando necessário.

**Validação mínima**

```bash
npx vitest run tests/integration/geminiAnalysisFlow.test.ts tests/integration/geminiRoomAnalysis.test.ts
npm run lint
```

**Bloqueadores**

- Item 5 recomendável antes

---

### Item 7. Cache server-side de catálogo

**Objetivo**

Eliminar latência artificial e recomputação desnecessária no lookup de material.

**Arquivos alvo**

- `src/domains/rendering/infrastructure/persistence/materialCatalogGateway.ts`
- `services/materialService.ts`

**Tipo**

- performance local
- infraestrutura

**Executor recomendado**

- `kat-coder-pro`

**Passos**

1. Mapear como `fetchMaterials()` é usado.
2. Remover ou reduzir delay artificial.
3. Adicionar snapshot em memória por processo.
4. Definir política de refresh explícita.

**Validação mínima**

```bash
npx vitest run tests/unit/cliRealRenderGateway.test.ts tests/unit/renderCliApplication.test.ts
npm run lint
```

**Bloqueadores**

- nenhum

---

### Item 8. Definir e aplicar política de cache server-side para textura

**Objetivo**

Evitar fetch repetido de textura no backend.

**Arquivos alvo**

- `services/materialService.ts`
- `src/domains/rendering/infrastructure/persistence/materialTextureGateway.ts`

**Tipo**

- performance de rede
- infraestrutura

**Executor recomendado**

- Parcial

**Passos**

1. Separar claramente comportamento browser e server.
2. Definir se o primeiro passo será cache em memória local ou Redis.
3. Implementar política mínima.
4. Preservar fallback neutro e negative caching.

**Validação mínima**

```bash
npx vitest run tests/regression/renderWithSelfAudit.test.ts tests/integration/geminiRenderExecution.test.ts
npm run lint
```

**Bloqueadores**

- Item 7 ajuda, mas não bloqueia

**Revisão manual obrigatória**

- sim

---

## Ciclo 3

## Meta do ciclo

Fechar a lacuna arquitetural principal entre `application` e `infrastructure`, reduzindo dependências residuais e preparando o domínio para endurecimento dos guardrails.

## Critério de saída do ciclo

- composition root explícito criado
- `application` sem defaults concretos internos
- regra `application -> infrastructure` pronta para subir de severidade
- wrappers críticos residuais em trajetória clara de remoção

---

### Item 9. Introduzir composition root explícito

**Objetivo**

Tirar wiring concreto de dentro dos casos de uso.

**Arquivos alvo**

- `src/domains/rendering/application/analyzeRoom.ts`
- `src/domains/rendering/application/renderScene.ts`
- `src/domains/rendering/interface/http/*`
- `bin/pisodev.js`
- novo módulo de composition root

**Tipo**

- arquitetura estrutural

**Executor recomendado**

- Parcial

**Passos**

1. Definir local do composition root.
2. Remover defaults concretos dos casos de uso.
3. Injetar dependências na borda HTTP e CLI.
4. Atualizar testes de integração e arquitetura.

**Validação mínima**

```bash
npx vitest run tests/unit/renderingArchitectureBoundaries.test.ts tests/integration/renderingHttpContracts.test.ts tests/cli
npm run lint
npm run complexity:check
```

**Bloqueadores**

- idealmente Item 3 concluído

**Revisão manual obrigatória**

- sim

---

### Item 10. Endurecer guardrail `application -> infrastructure`

**Objetivo**

Transformar o alvo arquitetural em regra do repositório.

**Arquivos alvo**

- `.dependency-cruiser.cjs`
- `tests/unit/renderingArchitectureBoundaries.test.ts`

**Tipo**

- governança arquitetural

**Executor recomendado**

- `kat-coder-pro`

**Passos**

1. Subir severidade de `info` para `warn` ou `error`.
2. Ajustar whitelist transitória se necessário.
3. Rodar validação completa de arquitetura.

**Validação mínima**

```bash
npm run complexity:check
npx vitest run tests/unit/renderingArchitectureBoundaries.test.ts
```

**Bloqueadores**

- Item 9 deve estar concluído ou perto disso

---

### Item 11. Migrar `geminiExecution.ts` para implementação canônica real

**Objetivo**

Remover dependência de `renderCoreService.ts` dentro da nova infraestrutura.

**Arquivos alvo**

- `src/domains/rendering/infrastructure/ai/geminiExecution.ts`
- `services/renderCoreService.ts`

**Tipo**

- migração de infraestrutura

**Executor recomendado**

- Parcial

**Passos**

1. Trazer `APIKeyManager`, `withRetry`, `withTimeout` para módulo canônico.
2. Ajustar consumidores.
3. Manter facade legado compatível.

**Validação mínima**

```bash
npx vitest run tests/unit/renderCoreSemantics.test.ts tests/integration/geminiRoomAnalysis.test.ts tests/integration/geminiRenderExecution.test.ts
npm run lint
```

**Bloqueadores**

- nenhum estrutural forte

**Revisão manual obrigatória**

- sim

---

### Item 12. Migrar wrappers restantes de IA e auditoria

**Objetivo**

Reduzir dependência residual em:

- `promptLoader.ts`
- `securityCircuit.ts`
- `structuralAudit.ts`

**Arquivos alvo**

- `src/domains/rendering/infrastructure/ai/*`
- `services/*` correspondentes

**Tipo**

- consolidação de infraestrutura

**Executor recomendado**

- Parcial

**Passos**

1. Migrar um wrapper por vez.
2. Preservar contratos públicos.
3. Atualizar testes canônicos e de compatibilidade.

**Validação mínima**

```bash
npx vitest run tests/unit/renderCoreSemantics.test.ts tests/regression/renderWithSelfAudit.test.ts tests/integration/geminiRenderExecution.test.ts
npm run lint
npm run complexity:check
```

**Bloqueadores**

- Item 11 ajuda bastante

---

## Itens pós-ciclo 3

Estes itens não devem entrar antes da estabilização dos três ciclos acima.

### Item 13. Dividir `renderPipeline.ts`

**Motivo para adiar**

- alto risco de regressão semântica
- melhor fazer com portas e infraestrutura mais estáveis

### Item 14. Remover wrappers residuais de `services/`

**Motivo para adiar**

- depende do fechamento de vários adapters canônicos
- deve ocorrer com checklist de compatibilidade e documentação final

---

## Backlog pronto para o `kat-coder-pro`

Os itens mais seguros para delegação direta são:

1. Cache de prompts
2. Remover `Sentry.init()` do request path
3. Extrair tipos de observabilidade
4. Expandir testes de arquitetura
5. Cache server-side de catálogo
6. Endurecer `dependency-cruiser` após composition root

Os itens que exigem revisão arquitetural explícita são:

1. Timeout cancelável
2. Cancelamento real em HF analysis
3. Cache de textura
4. Composition root
5. Migração de `geminiExecution.ts`
6. Migração de `structuralAudit.ts` e `securityCircuit.ts`

---

## Template de tarefa para agente

Use este formato ao delegar:

```md
Item: [nome do item]

Objetivo:
- [resultado desejado]

Arquivos alvo:
- [lista]

Restrições:
- não mudar contratos públicos
- não alterar semântica do VTA
- não tocar arquivos fora do escopo

Validação obrigatória:
- [comandos]

Critério de conclusão:
- [estado observável]
```

---

## Checklist de encerramento por item

- escopo respeitado
- testes relevantes executados
- `lint` executado
- `complexity:check` executado quando aplicável
- nenhum import indevido novo
- documentação atualizada se o item alterar arquitetura

---

## Resumo final

A ordem procedural recomendada é:

### Primeiro

- resolver hot path barato e limpo

### Depois

- reduzir desperdício operacional

### Depois

- consolidar composition root e guardrails

### Por fim

- remover wrappers residuais e quebrar o orquestrador grande

Essa sequência minimiza regressão, melhora performance cedo e prepara o terreno para a fase final da migração arquitetural.
