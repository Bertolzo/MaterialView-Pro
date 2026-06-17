# Plano de Refatoração do Pipeline de Rendering

## Objetivo

Reduzir a complexidade ciclomática e o risco de regressão semântica no pipeline de rendering, priorizando funções que controlam:

- preservação de integridade estrutural
- classificação de violações semânticas
- montagem de instruções críticas para o modelo
- fallback entre auditoria nativa e validação externa

## Escopo analisado

- [services/renderWithSelfAuditService.ts](/home/vector/Transferências/pisosrealview-pro/services/renderWithSelfAuditService.ts)
- [services/renderCoreService.ts](/home/vector/Transferências/pisosrealview-pro/services/renderCoreService.ts)

## Priorização por risco

1. `renderWithSelfAudit`
2. `processValidation`
3. `buildStabilizedPrompt`
4. `buildRenderPrompt`
5. `deriveMaterialPhysics`
6. `withRetry`

## Estratégia

Refatorar em etapas curtas, preservando comportamento observável a cada fase. O fluxo principal deve ser dividido primeiro nos pontos em que:

- há múltiplos caminhos de decisão com efeito semântico
- o código mistura orquestração, política de integridade e infraestrutura
- uma regressão pode aprovar render inválido ou rejeitar render válido

Cada etapa abaixo deve ser concluída com testes de regressão antes de avançar.

## Etapa 0: Congelar comportamento atual com testes

### Objetivo

Criar uma rede mínima de segurança antes de mover responsabilidades.

### Ações

- adicionar testes unitários para `processValidation`
- adicionar testes unitários para `deriveMaterialPhysics`
- adicionar testes unitários para `withRetry`
- adicionar testes de composição textual para `buildRenderPrompt`
- adicionar testes de composição textual para `buildStabilizedPrompt`
- adicionar testes de fluxo para `renderWithSelfAudit` com mocks de:
  - `materialService`
  - `validateStructuralIntegrity`
  - `telemetryService`
  - `reportVTAEvent`
  - cliente Gemini

### Casos mínimos obrigatórios

- `humanPreservation = distorted` deve produzir `severity = critical` e `approved = false`
- `nonFloorImmutability = critical_failure` deve produzir falha crítica
- `minor_bleed` não deve virar falha crítica
- parse JSON inválido deve cair em fallback estrutural
- retry semântico deve ocorrer apenas quando a validação crítica falhar e ainda houver tentativa disponível
- `buildStabilizedPrompt` deve incluir regras de shadow floor, hard lock e scale calibration quando aplicável

### Critério de saída

Existe cobertura suficiente para refatorar sem alterar o contrato sem perceber.

## Estrategia de testes: preservacao de integridade semantica

### Suite 1: contratos semanticos

Arquivo sugerido no estado atual:

- `tests/unit/renderSemanticContracts.test.ts`

Contrato protegido:

- anatomia humana distorcida sempre reprova
- bleed critico em paredes ou moveis sempre reprova
- under-render conservador pode aprovar
- problema de iluminacao gera aviso, nao bloqueio

### Suite 2: snapshots semanticos de prompt

Arquivo sugerido no estado atual:

- `tests/unit/renderPromptContracts.test.ts`

Contrato protegido:

- regras de `HYDRAULIC FLOW & HARD STOPS` nao podem sumir
- `SHADOW PHYSICS RULE` nao pode ser removida
- negative constraints contra wall bleed devem continuar presentes
- calibracao de escala deve aparecer quando houver `scaleAnchor`

### Suite 3: fluxo do orquestrador

Arquivo sugerido no estado atual:

- `tests/regression/renderWithSelfAudit.test.ts`

Contrato protegido:

- falha semantica critica com tentativa restante deve gerar retry
- violacao de seguranca nao deve entrar em retry
- parse invalido da auto-auditoria deve cair em `validateStructuralIntegrity`

### Suite 4: guard rails do core

Arquivo sugerido no estado atual:

- `tests/unit/renderCoreSemantics.test.ts`

Contrato protegido:

- derivacao fisica deve manter heuristicas de escala e exposicao
- retry generico nao deve reexecutar erros invalidos
- retry generico deve recuperar falhas transitivas

## Etapa 1: Extrair política de classificação semântica

### Alvo

`processValidation`

### Problema atual

A função mistura:

- classificação de severidade
- decisão de aprovação
- cálculo de score
- mutação do array de issues recebido

Isso aumenta o risco de regressão silenciosa no contrato de aprovação.

### Refatoração

Extrair para um módulo dedicado, por exemplo:

- `classifyIntegrityProfile(profile)`
- `buildValidationIssues(profile, existingIssues)`
- `buildValidationResult(rawValidation)`

### Regras

- não mutar `rawValidation.issues`
- tornar a ordem de precedência explícita
- manter o cálculo de score desacoplado da classificação

### Critério de saída

- `processValidation` vira uma casca fina ou é substituída por função mais coesa
- todos os cenários críticos continuam equivalentes

## Etapa 2: Separar orquestração do ciclo de renderização

### Alvo

`renderWithSelfAudit`

### Problema atual

A função concentra:

- preparação de entrada
- cálculo de hash
- montagem do request
- chamada ao modelo
- extração da imagem gerada
- parse da resposta de auditoria
- fallback para regressão estrutural
- retry semântico
- telemetria
- política de erro

Esse acoplamento torna a função a principal fonte de risco de integridade semântica.

### Refatoração

Extrair as seguintes unidades:

- `prepareRenderContext`
- `buildGenerationParts`
- `generateSelfAuditedCandidate`
- `extractGeneratedBase64`
- `parseSelfAuditResponse`
- `runAuditFallbackIfNeeded`
- `shouldRetrySemanticFailure`
- `finalizeRenderTelemetry`

### Forma desejada

`renderWithSelfAudit` deve ficar restrita a:

1. preparar contexto
2. executar tentativa
3. decidir retry
4. retornar resultado final

### Critério de saída

- complexidade da função principal cai substancialmente
- cada ramo crítico passa a ter teste dedicado
- o loop de retry fica legível sem lógica de parsing interna

## Etapa 3: Isolar a política de retry semântico

### Alvo

Trecho de retry dentro de `renderWithSelfAudit`

### Problema atual

O retry depende de convenção textual (`"Semantic Retry"`) e mistura controle de fluxo com mensagens de erro.

### Refatoração

Substituir por contrato explícito, por exemplo:

- tipo de erro dedicado para retry semântico
- helper `isSemanticRetryableError`
- helper `handleCriticalValidationFailure`

### Regras

- evitar controle de fluxo baseado em substring
- preservar diferença entre violação de segurança e falha recuperável

### Critério de saída

O fluxo de reexecução depende de tipos e políticas explícitas, não de parsing de mensagem.

## Etapa 4: Quebrar a montagem de prompts críticos

### Alvos

- `buildStabilizedPrompt`
- `buildRenderPrompt`

### Problema atual

As duas funções concentram regras de domínio semanticamente sensíveis em blocos monolíticos de template string.

### Refatoração

Extrair blocos semânticos independentes:

- `buildSpatialGuidance`
- `buildTextureInstructions`
- `buildScaleCalibration`
- `buildShadowPhysicsRules`
- `buildIntegrityRules`
- `buildSceneManifest`
- `buildAuditVariables`
- `buildRenderVariables`

### Regras

- cada bloco deve ter responsabilidade única
- conteúdo textual crítico deve ficar fácil de comparar em teste
- variáveis condicionais devem ser montadas em helpers puros

### Critério de saída

- prompts continuam equivalentes no conteúdo essencial
- mudanças futuras em continuidade, máscara e hard-stop ficam localizadas

## Etapa 5: Normalizar derivação física de material

### Alvo

`deriveMaterialPhysics`

### Problema atual

A função mistura:

- classificação de acabamento
- compensação de iluminação
- parsing de dimensão
- heurística de escala visual

### Refatoração

Extrair helpers puros:

- `classifyMaterialFinish`
- `parseMaterialDimensions`
- `describeTileFormat`
- `describeExposureCompensation`

### Regras

- centralizar heurísticas dimensionais
- remover parsing repetido e branches implícitos

### Critério de saída

Heurísticas físicas ficam explícitas e testáveis sem depender do prompt completo.

## Etapa 6: Tornar a política de retry genérica explícita

### Alvo

`withRetry`

### Problema atual

A classificação de erro recuperável ainda está embutida e implícita.

### Refatoração

Extrair:

- `isNonRetryableError`
- `computeRetryDelay`

Opcionalmente aceitar estratégia por parâmetro:

- `withRetry(fn, { retries, delay, shouldRetry })`

### Critério de saída

O comportamento operacional fica previsível e reaproveitável sem contaminar a semântica do domínio.

## Sequência recomendada de implementação

1. Etapa 0
2. Etapa 1
3. Etapa 2
4. Etapa 3
5. Etapa 4
6. Etapa 5
7. Etapa 6

## Critérios de aceite globais

- nenhuma refatoração pode alterar o contrato de aprovação sem ajuste correspondente nos testes
- falhas críticas de integridade devem continuar bloqueando retorno aprovado
- fallback estrutural deve continuar disponível quando a auto-auditoria falhar
- o conteúdo crítico dos prompts deve permanecer semanticamente equivalente
- a função `renderWithSelfAudit` deve deixar de ser o maior concentrador de decisão do módulo

## Metas técnicas sugeridas

- `renderWithSelfAudit` com complexidade ciclomática abaixo de 12
- `processValidation` com complexidade abaixo de 5
- `buildStabilizedPrompt` e `buildRenderPrompt` compostas por helpers puros
- cobertura unitária forte nos ramos críticos de severidade, fallback e retry

## Entregáveis

- código refatorado em etapas pequenas
- suíte de testes cobrindo regressões semânticas prioritárias
- documentação curta do novo fluxo de rendering e auditoria

## Risco principal a evitar

Refatorar “só pela complexidade” sem preservar o contrato semântico. Neste pipeline, a prioridade não é estética do código; é impedir regressões como:

- piso subindo em parede
- objetos protegidos sendo texturizados
- continuidade de piso sendo interrompida
- aprovação incorreta de distorção humana
- fallback deixando de executar quando a auto-auditoria quebra
