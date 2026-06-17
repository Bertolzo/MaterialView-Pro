# Plano de Implementacao: Domains Rendering + Quality Gates + Cloud Run

## Objetivo

Implementar o proximo ciclo arquitetural apos a refatoracao do pipeline de rendering, com tres frentes coordenadas:

1. validacao automatica de complexidade e contratos no CI
2. migracao incremental para `src/domains/rendering/`
3. otimizacoes operacionais especificas para Cloud Run

## Estado atual do repositorio

Situacao real observada:

- o pipeline refatorado esta em `services/`
- existe `src/`, mas hoje ele ainda nao organiza os dominios principais
- ja existem testes de contrato e regressao para rendering
- ha apenas um workflow em `.github/workflows/secret-scan.yml`

Conclusao:

O plano precisa ser incremental, preservando compatibilidade com imports existentes e evitando uma migracao "big bang".

## Metas

### Meta 1: qualidade automatizada

- falhar PR quando complexidade exceder o threshold definido
- falhar PR quando contratos semanticos quebrarem
- manter cobertura minima do dominio critico

### Meta 2: consolidacao arquitetural

- mover o pipeline refatorado para `src/domains/rendering/`
- separar `application`, `domain`, `infrastructure` e `interface`
- reduzir dependencia direta de `services/` em novos fluxos

### Meta 3: preparo para Cloud Run

- reduzir cold start e custo de chamadas desnecessarias
- deixar o pipeline mais previsivel em latencia
- preparar base para processamento assincrono quando necessario

## Principios de implementacao

- migracao por strangler pattern
- nenhum corte de contrato sem teste cobrindo o comportamento
- nenhuma troca massiva de imports sem camada de compatibilidade
- otimizar Cloud Run com base no fluxo atual, nao em uma arquitetura hipotetica

## Arquitetura alvo proposta

```text
src/
  domains/
    rendering/
      application/
        analyzeRoom.ts
        renderPipeline.ts
        index.ts
      domain/
        generation/
          buildPrompts.ts
          buildSpatialGuidance.ts
          materialPhysics.ts
          index.ts
        validation/
          classifyIntegrity.ts
          calculateScore.ts
          semanticContracts.ts
          index.ts
        shared/
          integrityProfile.ts
          renderJob.ts
          validationResult.ts
          index.ts
        index.ts
      infrastructure/
        ai/
          geminiClient.ts
          huggingfaceFallback.ts
          promptLoader.ts
          index.ts
        persistence/
          groundTruthCache.ts
          forensicStorage.ts
          index.ts
        telemetry/
          sentryIntegration.ts
          vtaTracer.ts
          index.ts
        index.ts
      interface/
        http/
          analysisController.ts
          renderController.ts
          index.ts
        events/
          renderCompleted.ts
          index.ts
        index.ts
      index.ts
  shared/
    infrastructure/
    types/
    utils/
```

## Regras de dependencia

- `domain/` nao depende de infraestrutura
- `application/` depende de `domain/`
- `infrastructure/` implementa adaptadores para `application/` e `domain/`
- `interface/` expoe entradas HTTP e eventos
- `shared/` concentra tipos e utilitarios realmente transversais

## Roadmap por fases

## Fase 0: preparar quality gates

### Objetivo

Colocar freios automatizados antes da migracao estrutural.

### Entregaveis

- `.github/workflows/quality-gates.yml`
- scripts de qualidade no `package.json`
- thresholds documentados

### Tarefas

1. adicionar scripts:
   - `complexity:check`
   - `complexity:report`
   - `test:contracts`
   - `test:regression`
   - `quality:gate`
2. escolher ferramenta de complexidade compatível com TypeScript e CI
3. criar workflow com:
   - `npm ci`
   - `tsc --noEmit`
   - checagem de complexidade
   - testes semanticos
   - testes de regressao de rendering
   - coverage minima do dominio critico
4. adicionar regra para paths atuais:
   - `services/**`
   - `tests/unit/render*`
   - `tests/regression/renderWithSelfAudit.test.ts`

### Criterio de aceite

- qualquer regressao de complexidade ou contrato falha no PR

## Fase 1: criar estrutura de dominio sem mover comportamento

### Objetivo

Criar a arvore `src/domains/rendering/` e seus barrels sem alterar fluxos existentes.

### Entregaveis

- estrutura de pastas
- `index.ts` em cada nivel necessario
- `tsconfig.json` com paths aliases

### Tarefas

1. criar:
   - `src/domains/rendering/application`
   - `src/domains/rendering/domain/generation`
   - `src/domains/rendering/domain/validation`
   - `src/domains/rendering/domain/shared`
   - `src/domains/rendering/infrastructure/ai`
   - `src/domains/rendering/infrastructure/persistence`
   - `src/domains/rendering/infrastructure/telemetry`
   - `src/domains/rendering/interface/http`
   - `src/domains/rendering/interface/events`
2. adicionar barrel exports
3. configurar aliases:
   - `@domains/*`
   - `@shared/*`
4. manter `services/` intacto nesta fase

### Criterio de aceite

- a nova estrutura existe
- build continua passando
- nenhum import atual quebra

## Fase 2: mover o dominio puro primeiro

### Objetivo

Mover primeiro o que tem menos dependencia externa e maior estabilidade semantica.

### Ordem recomendada

1. `services/semanticValidationService.ts`
2. partes puras de `services/renderCoreService.ts`
3. builders puros de prompt

### Mapeamento inicial

- `services/semanticValidationService.ts`
  -> `src/domains/rendering/domain/validation/classifyIntegrity.ts`
  -> `src/domains/rendering/domain/validation/calculateScore.ts`
- funcoes de fisica e prompt puro em `renderCoreService.ts`
  -> `src/domains/rendering/domain/generation/materialPhysics.ts`
  -> `src/domains/rendering/domain/generation/buildSpatialGuidance.ts`
  -> `src/domains/rendering/domain/generation/buildPrompts.ts`

### Estrategia

- mover com `git mv` quando viavel
- deixar reexports de compatibilidade em `services/`
- nao remover os wrappers antigos nesta fase

### Criterio de aceite

- todos os testes existentes continuam verdes
- novos imports internos podem usar `@domains/rendering`

## Fase 3: mover a orquestracao para application

### Objetivo

Transferir o fluxo principal de rendering para a camada `application/`.

### Mapeamento

- `renderWithSelfAudit`
- `renderWithSelfAuditOptimized`
- `detectRoomContext`

### Arquivos alvo

- `src/domains/rendering/application/renderPipeline.ts`
- `src/domains/rendering/application/analyzeRoom.ts`

### Estrategia

- mover primeiro a implementacao
- manter facades em `services/renderWithSelfAuditService.ts` e `services/geminiService.server.ts`
- atualizar chamadores aos poucos

### Criterio de aceite

- os endpoints e chamadas existentes continuam funcionando
- o dominio passa a ser a fonte principal das exportacoes novas

## Fase 4: extrair infraestrutura

### Objetivo

Separar adaptadores externos de IA, prompt loading, telemetria e persistencia.

### Extracoes alvo

- cliente Gemini lazy load
- fallback Hugging Face
- prompt loader YAML
- integracao Sentry
- cache de ground truth

### Arquivos alvo

- `src/domains/rendering/infrastructure/ai/geminiClient.ts`
- `src/domains/rendering/infrastructure/ai/huggingfaceFallback.ts`
- `src/domains/rendering/infrastructure/ai/promptLoader.ts`
- `src/domains/rendering/infrastructure/telemetry/sentryIntegration.ts`
- `src/domains/rendering/infrastructure/persistence/groundTruthCache.ts`

### Criterio de aceite

- `application/` nao instancia SDK externo diretamente
- dependencias externas ficam centralizadas

## Fase 5: atualizar interface HTTP

### Objetivo

Conectar os handlers HTTP ao novo dominio.

### Tarefas

1. localizar o ponto atual de entrada de render e analise
2. criar controllers em:
   - `src/domains/rendering/interface/http/renderController.ts`
   - `src/domains/rendering/interface/http/analysisController.ts`
3. manter adaptadores temporarios se a API atual estiver em `api/`

### Criterio de aceite

- a interface HTTP passa a chamar `application/`
- o transporte nao conhece regras internas do dominio

## Fase 6: eliminar legados e consolidar imports

### Objetivo

Trocar definitivamente os imports do projeto e reduzir `services/` a facades residuais ou removiveis.

### Tarefas

1. atualizar imports internos para `@domains/rendering`
2. validar ausencia de circulares
3. remover wrappers antigos quando nao houver mais referencias
4. revisar cobertura e complexidade pos-migracao

### Criterio de aceite

- os arquivos de dominio sao a fonte canonical
- `services/` deixa de ser o ponto principal do pipeline

## Workstream paralelo: Cloud Run

## Fase CR-1: reduzir cold start

### Objetivo

Melhorar tempo de resposta inicial sem refazer toda a plataforma.

### Acoes

- lazy loading real do cliente Gemini e dependencias pesadas
- evitar importar modulos pesados no bootstrap do servidor
- revisar uso de `sharp` e imports de IA para carregamento sob demanda

### Indicadores

- menor tempo do primeiro request
- menor memoria inicial do container

## Fase CR-2: configuracao operacional do servico

### Objetivo

Melhorar estabilidade de latencia e throughput no Cloud Run.

### Recomendacoes

- definir `min-instances` para reduzir cold start em horario comercial
- revisar `concurrency` conforme perfil de CPU e uso de `sharp`
- definir timeouts coerentes com o pipeline de IA
- configurar variaveis de ambiente e secrets fora da imagem

### Criterio de aceite

- p95 de render reduzido ou mais previsivel
- menos falhas por timeout em pico

## Fase CR-3: cache e deduplicacao

### Objetivo

Evitar processamento desnecessario em cargas repetidas.

### Acoes

- cachear analises repetidas por hash de imagem
- cachear prompts renderizados quando aplicavel
- avaliar Upstash Redis para `groundTruthCache`

### Criterio de aceite

- menor numero de chamadas externas por imagem repetida

## Fase CR-4: pipeline assincrono opcional

### Objetivo

Preparar evolucao para workloads mais longos ou burst elevado.

### Acoes

- desenhar uso de Cloud Tasks para renderizacoes de alta latencia
- manter modo sincrono para requests simples
- definir contrato de callback ou polling

### Criterio de aceite

- existe desenho tecnico aprovado, mesmo que nao implementado de imediato

## Quality Gates propostos

## CI minimo recomendado

- `tsc --noEmit`
- `npm test -- tests/unit/renderSemanticContracts.test.ts`
- `npm test -- tests/unit/renderPromptContracts.test.ts`
- `npm test -- tests/regression/renderWithSelfAudit.test.ts`
- checagem de complexidade com threshold maximo 12

## Scripts propostos

```json
{
  "scripts": {
    "complexity:check": "ts-complexity --max-complexity 12 --paths 'services/**/*.ts' 'src/domains/rendering/**/*.ts'",
    "complexity:report": "ts-complexity --format html --output complexity-report.html",
    "test:contracts": "vitest run tests/unit/renderSemanticContracts.test.ts tests/unit/renderPromptContracts.test.ts",
    "test:regression": "vitest run tests/regression/renderWithSelfAudit.test.ts",
    "quality:gate": "npm run lint && npm run complexity:check && npm run test:contracts && npm run test:regression"
  }
}
```

## Workflow GitHub Actions proposto

Arquivo alvo:

- `.github/workflows/quality-gates.yml`

Jobs:

1. `quality-gates`
   - checkout
   - setup node
   - `npm ci`
   - `npm run lint`
   - `npm run complexity:check`
   - `npm run test:contracts`
   - `npm run test:regression`
2. `build-check`
   - `npm run build`

Observacao:

Na fase inicial, os paths do workflow devem apontar para `services/**` e `tests/**`. Depois da migracao, ajustar para `src/domains/rendering/**`.

## Mudancas necessarias no tsconfig

Adicionar:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@domains/*": ["src/domains/*"],
      "@shared/*": ["src/shared/*"],
      "@ui/*": ["src/ui/*"]
    }
  }
}
```

Tambem sera necessario expandir `include` para cobrir `src/domains/**/*` e `src/shared/**/*`.

## Riscos e mitigacoes

### Risco 1: migracao quebrar imports silenciosamente

Mitigacao:

- usar wrappers temporarios em `services/`
- migrar por modulo, nao por pacote inteiro

### Risco 2: DDD superficial sem ganho real

Mitigacao:

- mover primeiro somente o que ja esta semanticamente coeso
- evitar criar camada vazia sem responsabilidade concreta

### Risco 3: CI ficar lento demais

Mitigacao:

- separar testes criticos dos testes completos
- rodar suite expandida so em merge ou nightly, se necessario

### Risco 4: Cloud Run otimizado cedo demais

Mitigacao:

- comecar por lazy loading e configuracao de instancia
- adiar Cloud Tasks ate haver evidencia operacional

## Ordem recomendada de execucao

1. Fase 0
2. Fase 1
3. Fase 2
4. Fase 3
5. Fase 4
6. Fase 5
7. Fase 6
8. CR-1
9. CR-2
10. CR-3
11. CR-4

## Definition of Done

O plano sera considerado concluido quando:

- houver workflow de quality gate ativo no GitHub Actions
- `src/domains/rendering/` for a fonte principal do pipeline
- contratos semanticos continuarem protegidos por teste
- imports legados de `services/` deixarem de ser centrais
- houver pelo menos as optimizacoes basicas de Cloud Run aplicadas e documentadas

## Proximas entregas recomendadas

### Entrega 1

Implementar Fase 0 integralmente:

- scripts no `package.json`
- workflow `.github/workflows/quality-gates.yml`

### Entrega 2

Implementar Fase 1 e Fase 2:

- estrutura `src/domains/rendering/`
- migracao do dominio puro com wrappers de compatibilidade

### Entrega 3

Implementar CR-1 e CR-2:

- lazy loading
- ajustes iniciais de Cloud Run
