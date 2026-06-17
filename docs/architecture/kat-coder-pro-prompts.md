# Prompts para o `kat-coder-pro`

## Objetivo

Este documento contém prompts prontos para copiar e colar no `kat-coder-pro`, alinhados ao backlog procedural em:

- `docs/architecture/strategic-backlog-by-cycle.md`

Cada prompt foi desenhado para:

- atacar um item por vez
- limitar escopo
- preservar contratos existentes
- exigir validação automatizada
- minimizar risco de regressão

---

## Instrução base para todos os prompts

Use esta abertura sempre que necessário:

```md
Você está trabalhando no projeto PisosRealView PRO.

Siga estas regras:
- implemente apenas o item solicitado
- não altere contratos públicos sem necessidade explícita
- não faça refatorações paralelas fora do escopo
- preserve semântica do VTA e contratos de tests
- após a alteração, execute as validações pedidas
- se algum teste falhar, corrija antes de concluir
- no final, resuma arquivos alterados e resultado dos testes
```

---

## Como usar este documento

### Estratégia de execução

1. **Copie um prompt por vez** - Não dispare múltiplos prompts simultaneamente
2. **Execute validações obrigatórias** - Sempre rode os comandos especificados
3. **Respeite restrições** - Não ultrapasse os limites de escopo definidos
4. **Use o prompt de fechamento** - Sempre finalize com o resumo de entrega

### Arquivos sensíveis (requerem atenção especial)

Evite trabalhar em paralelo nos seguintes arquivos:
- `renderPipeline.ts` - Alto risco de regressão semântica
- `geminiRenderExecution.ts` - Core de renderização
- `geminiRoomAnalysis.ts` - Core de análise
- `services/materialService.ts` - Serviço crítico de materiais

### Níveis de complexidade

- **🟢 Baixo risco**: Cache, Sentry, tipos - podem ser executados por `kat-coder-pro`
- **🟡 Médio risco**: Timeout, cancelamento, cache server-side - requerem revisão manual
- **🔴 Alto risco**: Composition root, guardrails, migração de wrappers - requerem planejamento cuidadoso

---

## Estrutura do documento

### Organização por ciclos

- **Ciclo 1**: Otimizações de performance e limpeza arquitetural básica
- **Ciclo 2**: Redução de trabalho redundante e melhorias operacionais
- **Ciclo 3**: Consolidação arquitetural e preparação para endurecimento

### Formato de cada prompt

Cada prompt contém:

1. **Tarefa**: Descrição clara do que deve ser implementado
2. **Objetivo**: Resultado esperado e benefícios
3. **Arquivos alvo**: Lista específica de arquivos a serem modificados
4. **Restrições**: Limites de escopo e preservação de contratos
5. **Implementação esperada**: Diretrizes técnicas específicas
6. **Validação obrigatória**: Comandos de teste que devem ser executados
7. **Critério de conclusão**: Estado observável que indica sucesso

---

# Ciclo 1

## Prompt 1. Cache de prompts

```md
Você está trabalhando no projeto PisosRealView PRO.

Tarefa:
Implementar cache em memória para carregamento de prompts no hot path.

Objetivo:
- eliminar carregamento repetido de prompt em disco
- preservar a API pública atual de carregamento e renderização de prompts

Arquivos alvo:
- `src/domains/rendering/infrastructure/ai/promptLoader.ts`
- se necessário, a implementação real usada por esse wrapper

Restrições:
- não alterar o conteúdo dos prompts
- não mudar contratos de `loadPrompt` e `renderPrompt`
- não tocar em `renderPipeline.ts`
- não mexer em lógica semântica de renderização

Implementação esperada:
- adicionar cache em memória por chave `provider/version/type`
- manter comportamento idempotente
- preservar erros atuais para prompt inexistente

Validação obrigatória:
```bash
npx vitest run tests/unit/promptLoader.test.ts tests/unit/renderPromptContracts.test.ts
npm run lint
npm run complexity:check
```

Critério de conclusão:
- prompts não devem mais ser lidos do disco repetidamente em chamadas subsequentes
- testes e validações devem passar
```

---

## Prompt 2. Remover `Sentry.init()` do request path

```md
Você está trabalhando no projeto PisosRealView PRO.

Tarefa:
Remover a inicialização do Sentry do caminho por request nos controllers de rendering.

Objetivo:
- fazer com que `analysisController` e `renderController` não chamem `Sentry.init()` a cada request
- mover a inicialização para um ponto único de bootstrap ou wrapper compartilhado

Arquivos alvo:
- `src/domains/rendering/interface/http/analysisController.ts`
- `src/domains/rendering/interface/http/renderController.ts`
- o arquivo de bootstrap apropriado, se necessário

Restrições:
- não alterar contratos HTTP
- não alterar payloads de erro
- não alterar lógica de rate limit
- não alterar semântica de render/análise

Implementação esperada:
- extrair inicialização do Sentry para local único
- controllers devem apenas usar o ambiente já preparado
- quando `SENTRY_DSN` não existir, o comportamento deve continuar seguro

Validação obrigatória:
```bash
npx vitest run tests/integration/renderingHttpContracts.test.ts
npm run lint
```

Critério de conclusão:
- nenhum controller de rendering deve chamar `Sentry.init()` diretamente
- testes HTTP devem continuar verdes
```

---

## Prompt 3. Extrair tipos de observabilidade para camada compartilhada

```md
Você está trabalhando no projeto PisosRealView PRO.

Tarefa:
Remover dependência de `services` na porta de observabilidade da camada `application`.

Objetivo:
- fazer com que `src/domains/rendering/application/ports/renderObservability.ts` não importe tipos de `services/*`

Arquivos alvo:
- `src/domains/rendering/application/ports/renderObservability.ts`
- `src/domains/rendering/infrastructure/telemetry/renderObservability.ts`
- módulo compartilhado novo ou existente em `src/domains/rendering/domain/shared/` ou `src/shared/`
- `services/telemetryService.ts` se necessário apenas para compatibilidade de tipos

Restrições:
- não mudar contrato funcional de telemetria
- não remover campos dos payloads
- não alterar comportamento dos testes existentes

Implementação esperada:
- mover `ResidualInvariantPayload` e `ProviderUsagePayload` para uma camada compartilhada neutra
- ajustar imports da porta e da infraestrutura
- preservar facade legado se necessário

Validação obrigatória:
```bash
npx vitest run tests/unit/renderingArchitectureBoundaries.test.ts tests/telemetry.test.ts
npm run lint
npm run complexity:check
```

Critério de conclusão:
- `application/ports/renderObservability.ts` não deve importar `services/*`
- testes e guardrails devem continuar passando
```

---

## Prompt 4. Expandir testes de arquitetura

```md
Você está trabalhando no projeto PisosRealView PRO.

Tarefa:
Expandir os testes de arquitetura e guardrails do domínio `rendering`.

Objetivo:
- transformar o estado arquitetural atual em regra executável

Arquivos alvo:
- `tests/unit/renderingArchitectureBoundaries.test.ts`
- `.dependency-cruiser.cjs`

Restrições:
- não bloquear prematuramente wrappers residuais intencionais
- não criar regra que quebre o estado atual canônico do projeto

Implementação esperada:
- adicionar verificação de que portas de `application` não importam `services/*`
- explicitar melhor a whitelist de wrappers legados ainda permitidos
- reforçar que `roomAnalysisGateway` e `renderGateway` não podem voltar a depender de `services/geminiService.server.ts`

Validação obrigatória:
```bash
npx vitest run tests/unit/renderingArchitectureBoundaries.test.ts
npm run complexity:check
```

Critério de conclusão:
- novo estado arquitetural deve estar coberto por testes e `dependency-cruiser`
```

---

# Ciclo 2

## Prompt 5. Tornar `withTimeout` seguro e limpo

```md
Você está trabalhando no projeto PisosRealView PRO.

Tarefa:
Refatorar `withTimeout` para limpar timers corretamente e preparar base para cancelamento consistente.

Objetivo:
- evitar timers órfãos
- manter contrato atual de erro

Arquivos alvo:
- `services/renderCoreService.ts`
- wrappers e consumidores canônicos afetados, se necessário

Restrições:
- não alterar semântica dos timeouts expostos
- não alterar contratos públicos além do necessário
- não mexer em lógica de render além do que for exigido pelo utilitário

Implementação esperada:
- garantir limpeza do timer quando a promise principal resolver ou rejeitar
- preservar mensagens de erro compatíveis
- adicionar ou atualizar testes se necessário

Validação obrigatória:
```bash
npx vitest run tests/unit/renderCoreSemantics.test.ts tests/integration/geminiAnalysisFlow.test.ts tests/integration/geminiRenderFlow.test.ts
npm run lint
```

Critério de conclusão:
- `withTimeout` não deve deixar timers vivos desnecessariamente
- testes devem continuar verdes
```

---

## Prompt 6. Cancelamento real na análise HF

```md
Você está trabalhando no projeto PisosRealView PRO.

Tarefa:
Adicionar cancelamento real ao fluxo de análise Hugging Face.

Objetivo:
- fazer com que timeout global interrompa requests paralelos em vez de apenas abandonar o resultado lógico

Arquivos alvo:
- `services/hfAnalysisService.server.ts`

Restrições:
- preservar fallback para Gemini
- não alterar schema de retorno de análise
- não alterar heurísticas de parsing além do necessário

Implementação esperada:
- usar `AbortController`
- propagar sinal para chamadas BLIP e LLaVA
- integrar com timeout global existente
- preservar logging e telemetria atuais

Validação obrigatória:
```bash
npx vitest run tests/integration/geminiAnalysisFlow.test.ts tests/integration/geminiRoomAnalysis.test.ts
npm run lint
```

Critério de conclusão:
- timeout deve cancelar requests remotos em voo quando possível
- testes de análise devem continuar passando
```

---

## Prompt 7. Cache server-side de catálogo

```md
Você está trabalhando no projeto PisosRealView PRO.

Tarefa:
Adicionar cache server-side para resolução de catálogo de materiais.

Objetivo:
- evitar `fetchMaterials()` em toda resolução de material
- remover latência artificial desnecessária do hot path

Arquivos alvo:
- `src/domains/rendering/infrastructure/persistence/materialCatalogGateway.ts`
- `services/materialService.ts`

Restrições:
- não alterar contrato público de material
- não alterar ids, skus ou estrutura do catálogo
- não alterar semântica da CLI ou render real

Implementação esperada:
- manter snapshot em memória por processo
- reduzir ou eliminar delay artificial de 300ms do lookup normal
- preservar possibilidade de refresh explícito

Validação obrigatória:
```bash
npx vitest run tests/unit/cliRealRenderGateway.test.ts tests/unit/renderCliApplication.test.ts
npm run lint
```

Critério de conclusão:
- resolução por `materialId` não deve reconstruir catálogo a cada chamada
- testes devem continuar verdes
```

---

## Prompt 8. Política inicial de cache server-side para textura

```md
Você está trabalhando no projeto PisosRealView PRO.

Tarefa:
Implementar uma política inicial de cache server-side para texturas no backend.

Objetivo:
- evitar fetch repetido de textura no servidor
- preservar fallback neutro e negative caching

Arquivos alvo:
- `services/materialService.ts`
- `src/domains/rendering/infrastructure/persistence/materialTextureGateway.ts`

Restrições:
- não quebrar fluxo browser existente
- não remover fallback neutro
- não mudar contrato de `getTextureBase64`

Implementação esperada:
- separar claramente comportamento browser e server
- adicionar cache em memória no backend
- preservar cache/negative cache quando aplicável

Validação obrigatória:
```bash
npx vitest run tests/regression/renderWithSelfAudit.test.ts tests/integration/geminiRenderExecution.test.ts
npm run lint
```

Critério de conclusão:
- backend deve reutilizar textura já buscada no mesmo processo
- contratos de fallback devem permanecer intactos
```

---

# Ciclo 3

## Prompt 9. Introduzir composition root explícito

```md
Você está trabalhando no projeto PisosRealView PRO.

Tarefa:
Introduzir um composition root explícito para o domínio `rendering`.

Objetivo:
- remover wiring concreto de dentro dos casos de uso
- preparar o projeto para endurecer `application -> infrastructure`

Arquivos alvo:
- `src/domains/rendering/application/analyzeRoom.ts`
- `src/domains/rendering/application/renderScene.ts`
- `src/domains/rendering/interface/http/*`
- `bin/pisodev.js`
- novo módulo de composition root

Restrições:
- não alterar contratos HTTP
- não alterar contratos da CLI
- não alterar semântica do VTA
- manter testes existentes funcionando

Implementação esperada:
- criar composition root explícito na borda
- remover defaults concretos dos casos de uso
- injetar dependências em HTTP e CLI

Validação obrigatória:
```bash
npx vitest run tests/unit/renderingArchitectureBoundaries.test.ts tests/integration/renderingHttpContracts.test.ts tests/cli
npm run lint
npm run complexity:check
```

Critério de conclusão:
- `application` não deve depender de implementações concretas por default
- wiring deve estar concentrado na borda
```

---

## Prompt 10. Endurecer guardrail `application -> infrastructure`

```md
Você está trabalhando no projeto PisosRealView PRO.

Tarefa:
Endurecer os guardrails arquiteturais após a introdução do composition root.

Objetivo:
- elevar a regra `application -> infrastructure` para refletir o estado alvo

Arquivos alvo:
- `.dependency-cruiser.cjs`
- `tests/unit/renderingArchitectureBoundaries.test.ts`

Restrições:
- não bloquear caminhos canônicos válidos
- considerar apenas o estado após composition root

Implementação esperada:
- subir severidade da regra
- ajustar testes de fronteira
- preservar whitelists transitórias apenas quando justificadas

Validação obrigatória:
```bash
npm run complexity:check
npx vitest run tests/unit/renderingArchitectureBoundaries.test.ts
```

Critério de conclusão:
- nova arquitetura deve ser imposta automaticamente por testes e dependency-cruiser
```

---

## Prompt 11. Migrar `geminiExecution.ts` para implementação canônica real

```md
Você está trabalhando no projeto PisosRealView PRO.

Tarefa:
Migrar `src/domains/rendering/infrastructure/ai/geminiExecution.ts` para implementação canônica real.

Objetivo:
- remover dependência residual de `services/renderCoreService.ts`

Arquivos alvo:
- `src/domains/rendering/infrastructure/ai/geminiExecution.ts`
- `services/renderCoreService.ts`
- consumidores diretos da infraestrutura canônica

Restrições:
- preservar contratos de `APIKeyManager`, `withRetry` e `withTimeout`
- manter compatibilidade legada via facade se necessário
- não alterar semântica de retry sem cobertura

Implementação esperada:
- trazer a implementação operacional para `src/`
- deixar `services/renderCoreService.ts` como compatibilidade, se necessário

Validação obrigatória:
```bash
npx vitest run tests/unit/renderCoreSemantics.test.ts tests/integration/geminiRoomAnalysis.test.ts tests/integration/geminiRenderExecution.test.ts
npm run lint
```

Critério de conclusão:
- infraestrutura canônica não deve mais depender de `services/renderCoreService.ts`
```

---

## Prompt 12. Migrar wrappers restantes de IA e auditoria

```md
Você está trabalhando no projeto PisosRealView PRO.

Tarefa:
Migrar os wrappers restantes da infraestrutura canônica que ainda apontam para `services/*`.

Objetivo:
- reduzir dependências residuais em:
  - `promptLoader.ts`
  - `securityCircuit.ts`
  - `structuralAudit.ts`

Arquivos alvo:
- `src/domains/rendering/infrastructure/ai/*`
- `services/*` correspondentes

Restrições:
- migrar um wrapper por vez ou em cortes pequenos
- não alterar semântica de validação estrutural
- não alterar comportamento de proteção sem testes

Implementação esperada:
- substituir reexports por implementações canônicas
- manter facades legados quando necessário
- atualizar testes canônicos e de compatibilidade

Validação obrigatória:
```bash
npx vitest run tests/unit/renderCoreSemantics.test.ts tests/regression/renderWithSelfAudit.test.ts tests/integration/geminiRenderExecution.test.ts
npm run lint
npm run complexity:check
```

Critério de conclusão:
- wrappers residuais devem diminuir sem reabrir dependências proibidas
```

---

## Prompt de fechamento por item

Use este prompt ao final de cada tarefa:

```md
Agora me entregue:

1. resumo objetivo do que foi alterado
2. lista de arquivos modificados
3. resultado dos testes executados
4. riscos residuais
5. se o item pode ser considerado concluído ou se há follow-up obrigatório
```

---

## Uso recomendado

Copie um prompt por vez.

Não dispare dois prompts de prioridade alta em paralelo sobre:

- `renderPipeline.ts`
- `geminiRenderExecution.ts`
- `geminiRoomAnalysis.ts`
- `services/materialService.ts`

Esses arquivos são sensíveis e devem ser trabalhados em sequência.

---

## Fluxo de trabalho recomendado

### Antes de executar um prompt

1. **Entenda o escopo**: Leia atentamente todas as restrições
2. **Verifique dependências**: Confira se há itens anteriores que precisam ser concluídos
3. **Prepare o ambiente**: Certifique-se de que os testes atuais estão passando

### Durante a execução

1. **Siga as restrições**: Não ultrapasse os limites de escopo definidos
2. **Mantenha contratos**: Não altere APIs públicas sem necessidade explícita
3. **Documente mudanças**: Anote qualquer decisão técnica importante

### Após a implementação

1. **Execute validações**: Rode todos os comandos de validação obrigatória
2. **Verifique resultados**: Confirme que os testes passam e os critérios de conclusão são atendidos
3. **Use o prompt de fechamento**: Sempre entregue o resumo final

---

## Padrões de implementação

### Cache Implementation

```typescript
// Exemplo de implementação de cache seguro
const cache = new Map<string, any>();

function getCachedData(key: string, loader: () => Promise<any>): Promise<any> {
  if (cache.has(key)) {
    return Promise.resolve(cache.get(key));
  }
  
  return loader().then(data => {
    cache.set(key, data);
    return data;
  });
}
```

### Timeout Implementation

```typescript
// Exemplo de timeout com limpeza de timer
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Timeout after ${ms}ms`));
    }, ms);
    
    promise
      .then(result => {
        clearTimeout(timeout);
        resolve(result);
      })
      .catch(error => {
        clearTimeout(timeout);
        reject(error);
      });
  });
}
```

### AbortController Implementation

```typescript
// Exemplo de cancelamento com AbortController
async function fetchWithCancellation(url: string, signal?: AbortSignal): Promise<any> {
  const controller = new AbortController();
  const { signal: abortSignal } = controller;
  
  if (signal) {
    signal.addEventListener('abort', () => controller.abort());
  }
  
  try {
    const response = await fetch(url, { signal: abortSignal });
    return response.json();
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Request was cancelled');
    }
    throw error;
  }
}
```

---

## Comandos de validação comuns

### Testes unitários
```bash
npx vitest run tests/unit/[arquivo].test.ts
```

### Testes de integração
```bash
npx vitest run tests/integration/[arquivo].test.ts
```

### Linting
```bash
npm run lint
```

### Complexidade
```bash
npm run complexity:check
```

### Qualidade geral
```bash
npm run quality:gate
```

---

## Contato e suporte

Para dúvidas sobre este documento ou sugestões de melhoria:

- **Arquitetura**: Consulte `docs/architecture/`
- **Backlog**: Consulte `docs/architecture/strategic-backlog-by-cycle.md`
- **Validação**: Consulte `VALIDATION-COMPLETE.md`

---

## Histórico de versões

- **v1.0**: Versão inicial alinhada ao backlog procedural
- **v1.1**: Adicionada estruturação por ciclos e níveis de complexidade
- **v1.2**: Incluídos padrões de implementação e fluxo de trabalho recomendado
</final_file_content>

IMPORTANT: For any future changes to this file, use the final_file_content shown above as your reference. This content reflects the current state of the file, including any auto-formatting (e.g., if you used single quotes but the formatter converted them to double quotes). Always base your SEARCH/REPLACE operations on this final version to ensure accuracy.

 <environment_details>
# Cline CLI - Node.js Visible Files
(No visible files)

# Cline CLI - Node.js Open Tabs
(No open tabs)

# Current Time
09/03/2026, 6:08:06 p.m. (America/Sao_Paulo, UTC-3:00)

# Context Window Usage
44 536 / 256K tokens used (17%)

# Current Mode
ACT MODE
