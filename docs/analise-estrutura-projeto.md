# 🏗️ Análise de Estrutura do Projeto - PisoRealView

**Data:** 22 de Fevereiro de 2026  
**Projeto:** PisoRealView (React + TypeScript + Vite)  
**Tipo de Análise:** Arquitetura e Organização de Código  
**Modo:** Planejamento (sem modificações)

---

## 📊 Resumo Executivo

| Métrica | Valor |
|---------|-------|
| Total de arquivos TypeScript | ~50 arquivos |
| Linhas de código total | ~7,184 linhas |
| Maior arquivo | geminiService.server.ts (706 linhas) |
| Média por arquivo | ~143 linhas |
| Arquivos críticos (>300 linhas) | 7 arquivos (32% do código) |

---

## 🎯 Pontos Fortes da Organização Atual

### ✅ 1. Separação Clara de Responsabilidades

A estrutura do projeto segue uma separação lógica bem definida:

```
├── api/           → Serverless functions (Vercel)
├── components/    → Componentes UI React
├── hooks/         → Custom hooks reutilizáveis
├── services/      → Lógica de negócio e integrações
├── types/         → Definições de tipos TypeScript
└── utils/         → Funções utilitárias
```

**Benefícios:**
- Fácil navegação para novos desenvolvedores
- Responsabilidades bem delimitadas
- Facilita manutenção e testes

### ✅ 2. Arquitetura de Serviços Bem Estruturada

Os serviços estão organizados por domínio funcional:

- **AI/ML Services:** `geminiService`, `hfAnalysisService`, `renderWithSelfAuditService`
- **Validação:** `regressionService`, `forensicStorage`, `integrityCertificate`
- **Infraestrutura:** `telemetryService`, `materialService`, `vtaSentryBridge`
- **Análise:** `pixelDiffAnalyzer`, `riskMapAnalyzer`, `materialIntelligenceService`

**Benefícios:**
- Alta coesão dentro de cada serviço
- Baixo acoplamento entre domínios diferentes
- Facilita testes unitários isolados

### ✅ 3. Componentização React Adequada

Os componentes seguem o princípio de responsabilidade única:

- **Componentes de Layout:** `ResultViewer`, `MaterialSelector`
- **Componentes de Input:** `ImageUploader`
- **Componentes Modais:** `ScaleCalibrationModal`, `ManualMaskingModal`
- **Componentes de Visualização:** `ForensicViewer`, `AnalysisPanel`

**Benefícios:**
- Componentes reutilizáveis
- Fácil manutenção individual
- Boa testabilidade

### ✅ 4. Uso de Custom Hooks

O projeto utiliza hooks personalizados para abstrair lógica complexa:

- `useSimulationFlow` - Gerencia fluxo de simulação
- `useTelemetryShortcuts` - Atalhos de telemetria
- `useObjectURL` - Gerenciamento de ObjectURLs

**Benefícios:**
- Reutilização de lógica stateful
- Separação de concerns
- Testabilidade melhorada

### ✅ 5. Tipagem TypeScript Forte

O projeto possui:
- Arquivo `types.ts` centralizado com ~170 linhas
- Tipos específicos em `types/gemini.ts` e `types/vta.ts`
- Interfaces bem definidas para props de componentes

**Benefícios:**
- Type safety em tempo de desenvolvimento
- Documentação implícita via tipos
- Melhor autocomplete e IntelliSense

### ✅ 6. Configuração Serverless Adequada

Estrutura de API routes otimizada para Vercel:
- `api/analyze.ts` - Análise de imagem
- `api/render.ts` - Renderização
- `api/health.ts` - Health check

**Benefícios:**
- Escalabilidade automática
- Deploy simplificado
- Isolamento de funções

---

## ⚠️ Áreas de Melhoria

### 🔴 1. Arquivos Muito Grandes (Crítico)

#### Problema:
7 arquivos excedem 300 linhas, violando o princípio de Single Responsibility.

| Arquivo | Linhas | Problema Principal |
|---------|--------|-------------------|
| `geminiService.server.ts` | 706 | Múltiplas responsabilidades: API Key Management, Room Detection, Rendering, Fallback |
| `renderWithSelfAuditService.ts` | 517 | Renderização + Auditoria + Validação em um único arquivo |
| `App.tsx` | 392 | Componente "God" com muita lógica de estado |
| `telemetryService.ts` | 354 | Telemetria + Logging + Reporting misturados |
| `ResultViewer.tsx` | 325 | UI + Lógica de comparação + Animação |
| `utils.ts` | 318 | Coleção desordenada de utilitários não relacionados |
| `materialService.ts` | 300 | Fetch + Cache + Transformação em um só lugar |

#### Impacto:
- ❌ Difícil manutenção
- ❌ Testes complexos
- ❌ Potencial para bugs
- ❌ Violação de SRP (Single Responsibility Principle)

### 🟡 2. Pasta `services/` com Muitos Arquivos

#### Problema:
17 arquivos na pasta `services/` sem suborganização.

#### Sugestão de Reorganização:

```
services/
├── ai/                    # AI/ML Related
│   ├── gemini/
│   │   ├── apiKeyManager.ts
│   │   ├── roomDetection.ts
│   │   ├── rendering.ts
│   │   └── index.ts
│   ├── huggingface/
│   │   ├── analysisService.ts
│   │   ├── hfService.ts
│   │   └── index.ts
│   └── rendering/
│       ├── selfAudit.ts
│       ├── inpainting.ts
│       └── index.ts
│
├── validation/            # Validation & Quality
│   ├── regression.ts
│   ├── forensicStorage.ts
│   ├── integrityCertificate.ts
│   ├── pixelDiffAnalyzer.ts
│   └── riskMapAnalyzer.ts
│
├── infrastructure/        # Core Infrastructure
│   ├── telemetry/
│   │   ├── logger.ts
│   │   ├── reporter.ts
│   │   └── shortcuts.ts
│   ├── sentry/
│   │   ├── vtaBridge.client.ts
│   │   ├── vtaBridge.server.ts
│   │   └── config.ts
│   └── materialService.ts
│
└── analysis/              # Analysis Tools
    ├── materialIntelligence.ts
    └── auditPrompts.ts
```

#### Benefícios:
- ✅ Navegação mais intuitiva
- ✅ Responsabilidades mais claras
- ✅ Facilita onboarding de novos devs

### 🟡 3. Duplicação de Utilidades

#### Problema:
Existem 4 locais diferentes para utilitários:

```
utils.ts             (318 linhas - raiz)
utils.server.ts      (149 linhas - raiz)
utils/               (pasta nova)
src/utils/           (pasta legada?)
```

#### Confusão:
- Onde colocar novos utilitários?
- Qual a diferença entre `utils.ts` e `utils/`?
- `src/utils/` está sendo usado?

#### Sugestão:

```
utils/
├── client/
│   ├── image.ts        # optimizeImage, compressImage
│   ├── validation.ts   # parseSimulationParams
│   └── formatting.ts   # Formatação de dados
│
├── server/
│   ├── image.ts        # optimizeImageServer
│   └── crypto.ts       # Hash, encryption
│
└── shared/
    ├── http.ts         # fetchWithTimeout
    └── types.ts        # Type guards, validators
```

### 🟡 4. Componentes Grandes Sem Subcomponentes

#### `ResultViewer.tsx` (325 linhas)

**Responsabilidades atuais:**
- Renderização de comparação antes/depois
- Lógica de slider
- Animação automática
- Validação de badges
- Compartilhamento

**Sugestão de quebra:**

```tsx
// components/ResultViewer/
├── ResultViewer.tsx          (Orquestrador - 80 linhas)
├── ComparisonSlider.tsx      (Slider logic - 100 linhas)
├── ValidationBadge.tsx       (Badges - 40 linhas)
├── ShareButton.tsx           (Compartilhamento - 30 linhas)
└── AutoCompareAnimation.tsx  (Animação - 60 linhas)
```

#### `MaterialSelector.tsx` (269 linhas)

**Responsabilidades atuais:**
- Lista de materiais
- Lazy loading de imagens
- Filtros e busca
- Seleção de item

**Sugestão de quebra:**

```tsx
// components/MaterialSelector/
├── MaterialSelector.tsx      (Orquestrador - 60 linhas)
├── MaterialList.tsx          (Lista - 80 linhas)
├── MaterialCard.tsx          (Card individual - 60 linhas)
├── MaterialFilters.tsx       (Filtros - 40 linhas)
└── LazyImage.tsx             (Já existe, mover - 30 linhas)
```

#### `ForensicViewer.tsx` (211 linhas)

**Responsabilidades atuais:**
- Overlay de erros
- Visualização de imagem forense
- Gráfico de confiança de drift

**Sugestão de quebra:**

```tsx
// components/ForensicViewer/
├── ForensicViewer.tsx        (Orquestrador - 50 linhas)
├── ErrorOverlay.tsx          (Já exportado separado)
├── ForensicImageViewer.tsx   (Já exportado separado)
└── DriftConfidenceChart.tsx  (Já exportado separado)
```

**Nota:** Este componente já está bem estruturado internamente com exports separados. Apenas falta mover para subpasta.

### 🟡 5. `App.tsx` Como Componente "God"

#### Problema:
`App.tsx` tem 392 linhas e gerencia:
- Estado global da aplicação
- Lógica de upload
- Inicialização de URL params
- Toast notifications
- Modal management
- Material catalog loading

#### Sugestão de refatoração:

```tsx
// App.tsx (Orquestrador - 150 linhas)
import { useAppInitialization } from './hooks/useAppInitialization';
import { useToastManager } from './hooks/useToastManager';
import { useModalManager } from './hooks/useModalManager';

const App = () => {
  const { materials, analysis, selectedMaterial } = useAppInitialization();
  const { toasts, showToast } = useToastManager();
  const { modals, openModal, closeModal } = useModalManager();
  
  // Render lógico simplificado
};

// hooks/useAppInitialization.ts (~100 linhas)
// hooks/useToastManager.ts (~40 linhas)
// hooks/useModalManager.ts (~50 linhas)
```

### 🟡 6. Tipos Fragmentados

#### Problema:
Tipos espalhados em 3 locais:

```
types.ts         (170 linhas - tipos globais)
types/gemini.ts  (Tipos Gemini)
types/vta.ts     (Tipos VTA)
```

Além disso, `types.ts` contém tipos muito diversos:
- `ImageAnalysis`
- `Material`
- `ProcessingState`
- `ValidationResult`
- `Point`
- `SimulationHistory`
- etc.

#### Sugestão de organização:

```
types/
├── index.ts              # Re-export tudo
├── domain/
│   ├── material.ts       # Material, MaterialCategory
│   ├── image.ts          # ImageAnalysis, Point
│   └── validation.ts     # ValidationResult
│
├── state/
│   ├── processing.ts     # ProcessingState
│   └── simulation.ts     # SimulationHistory
│
├── api/
│   ├── gemini.ts         # Já existe
│   └── vta.ts            # Já existe
│
└── ui/
    └── components.ts     # Props de componentes compartilhados
```

---

## 🔍 Análise Detalhada dos Arquivos Críticos

### 1. `geminiService.server.ts` (706 linhas) 🔴

**Responsabilidades Atuais:**
1. API Key Management (APIKeyManager class - ~60 linhas)
2. Room Context Detection (`detectRoomContext` - ~150 linhas)
3. Inpainting Prompt Building (`buildInpaintingPromptWithMask` - ~100 linhas)
4. Rendering Logic (`renderFlooring` - ~300 linhas)
5. Fallback to HuggingFace
6. Security Circuit Breaking
7. Telemetry integration

**Complexidade:**
- 12 funções exportadas
- 13 imports
- 40 condicionais (if/switch)
- Múltiplos try/catch aninhados

**Proposta de Refatoração:**

```
services/ai/gemini/
├── index.ts                    # Re-exports
├── apiKeyManager.ts            # APIKeyManager class (~80 linhas)
├── roomDetection.ts            # detectRoomContext (~180 linhas)
├── promptBuilder.ts            # buildInpaintingPromptWithMask (~120 linhas)
├── rendering.ts                # renderFlooring (~250 linhas)
├── fallbackStrategies.ts       # HF fallback logic (~100 linhas)
└── config.ts                   # Constantes e configuração
```

**Benefícios:**
- ✅ Cada arquivo com responsabilidade única
- ✅ Fácil testar individualmente
- ✅ Reduz complexidade cognitiva
- ✅ Facilita code review

---

### 2. `renderWithSelfAuditService.ts` (517 linhas) 🔴

**Responsabilidades Atuais:**
1. Schema de resposta de auditoria
2. Renderização com auditoria (`renderWithSelfAudit` - ~250 linhas)
3. Renderização otimizada (`renderWithSelfAuditOptimized` - ~200 linhas)
4. Validação de resposta
5. Parsing de JSON
6. Telemetria

**Complexidade:**
- 10 funções/constantes exportadas
- 10 imports
- 39 condicionais

**Proposta de Refatoração:**

```
services/ai/rendering/
├── index.ts                    # Re-exports
├── selfAudit.ts                # renderWithSelfAudit (~200 linhas)
├── selfAuditOptimized.ts       # renderWithSelfAuditOptimized (~180 linhas)
├── schemas.ts                  # SELF_AUDIT_RESPONSE_SCHEMA (~40 linhas)
├── validators.ts               # Validação de resposta (~60 linhas)
└── parsers.ts                  # JSON parsing helpers (~40 linhas)
```

---

### 3. `App.tsx` (392 linhas) 🔴

**Responsabilidades Atuais:**
1. Toast management
2. State management (materials, analysis, selectedMaterial)
3. URL parameter initialization
4. Manual upload handling
5. Image click handling
6. Share functionality
7. Modal management (scale, mask)
8. Material catalog loading

**Complexidade:**
- 5 componentes/funções
- 12 imports
- 24 condicionais
- Muitos `useState` e `useEffect`

**Proposta de Refatoração:**

```
App.tsx (~150 linhas - apenas orquestração)

hooks/
├── useAppInitialization.ts     # URL params + catalog (~100 linhas)
├── useToastManager.ts          # Toast logic (~50 linhas)
├── useModalManager.ts          # Modal management (~60 linhas)
└── useImageUpload.ts           # handleManualUpload (~80 linhas)

components/
└── ToastContainer.tsx          # Extrair de App.tsx (~40 linhas)
```

---

### 4. `telemetryService.ts` (354 linhas) ⚠️

**Responsabilidades Atuais:**
1. Telemetry data collection
2. Logging
3. Reporting
4. Performance tracking
5. Error tracking

**Proposta de Refatoração:**

```
services/infrastructure/telemetry/
├── index.ts                    # Re-exports
├── collector.ts                # Data collection (~120 linhas)
├── logger.ts                   # Logging logic (~80 linhas)
├── reporter.ts                 # Reporting (~80 linhas)
├── performance.ts              # Performance tracking (~60 linhas)
└── types.ts                    # Telemetry types (~20 linhas)
```

---

### 5. `utils.ts` (318 linhas) ⚠️

**Problema:**
Coleção desordenada de funções não relacionadas:
- `optimizeImage` - Otimização de imagem
- `toBlob` - Conversão de canvas
- `fileToBase64` - Conversão de arquivo
- `urlToBase64` - Fetch de URL
- `parseSimulationParams` - Parse de query params

**Proposta de Refatoração:**

```
utils/client/
├── image.ts                    # optimizeImage, toBlob (~150 linhas)
├── conversion.ts               # fileToBase64, urlToBase64 (~100 linhas)
└── url.ts                      # parseSimulationParams (~60 linhas)
```

---

## 📋 Checklist de Melhorias Sugeridas

### 🔴 Prioridade CRÍTICA (Alto Impacto)

- [ ] **Refatorar `geminiService.server.ts`**
  - [ ] Extrair `APIKeyManager` para arquivo separado
  - [ ] Separar `detectRoomContext` em módulo próprio
  - [ ] Separar `renderFlooring` em módulo próprio
  - [ ] Criar `promptBuilder.ts` para lógica de prompts

- [ ] **Refatorar `renderWithSelfAuditService.ts`**
  - [ ] Separar em `selfAudit.ts` e `selfAuditOptimized.ts`
  - [ ] Extrair schemas para arquivo separado
  - [ ] Criar módulo de validação separado

- [ ] **Refatorar `App.tsx`**
  - [ ] Extrair `ToastContainer` como componente separado
  - [ ] Criar hooks: `useAppInitialization`, `useToastManager`, `useModalManager`
  - [ ] Mover lógica de upload para hook dedicado

### 🟡 Prioridade ALTA (Melhora Organização)

- [ ] **Reorganizar pasta `services/`**
  - [ ] Criar subpastas: `ai/`, `validation/`, `infrastructure/`, `analysis/`
  - [ ] Mover arquivos para subpastas apropriadas
  - [ ] Criar `index.ts` em cada subpasta para re-exports

- [ ] **Consolidar utilitários**
  - [ ] Reorganizar `utils.ts` em `utils/client/`
  - [ ] Mover `utils.server.ts` para `utils/server/`
  - [ ] Migrar `src/utils/` para estrutura padronizada

- [ ] **Quebrar componentes grandes**
  - [ ] `ResultViewer.tsx` → subpasta com 5 arquivos
  - [ ] `MaterialSelector.tsx` → subpasta com 4 arquivos
  - [ ] `ForensicViewer.tsx` → apenas mover para subpasta (já bem estruturado)

### 🔵 Prioridade MÉDIA (Organização de Tipos)

- [ ] **Reorganizar tipos**
  - [ ] Criar subpastas em `types/`: `domain/`, `state/`, `api/`, `ui/`
  - [ ] Distribuir tipos de `types.ts` nas subpastas
  - [ ] Criar `types/index.ts` com re-exports

- [ ] **Melhorar documentação**
  - [ ] Adicionar JSDoc em funções complexas
  - [ ] Criar README em cada subpasta de `services/`
  - [ ] Documentar contratos de API

### 🟢 Prioridade BAIXA (Refinamentos)

- [ ] **Padronizar nomenclatura**
  - [ ] Renomear `.server.ts` para `.server.ts` (já está padronizado)
  - [ ] Padronizar exports: named vs default

- [ ] **Adicionar barrel exports**
  - [ ] Criar `index.ts` em cada pasta de componentes
  - [ ] Facilitar imports: `import { Component } from '@/components'`

---

## 🎯 Sugestões de Refatoração por Prioridade

### FASE 1: Arquivos Críticos (Semana 1-2)

**Objetivo:** Reduzir complexidade dos arquivos mais problemáticos

1. **`geminiService.server.ts` (706→4×~150 linhas)**
   - Tempo estimado: 8-12 horas
   - Risco: Médio
   - Benefício: Alto

2. **`renderWithSelfAuditService.ts` (517→3×~150 linhas)**
   - Tempo estimado: 6-8 horas
   - Risco: Médio
   - Benefício: Alto

3. **`App.tsx` (392→150 linhas + hooks)**
   - Tempo estimado: 4-6 horas
   - Risco: Baixo
   - Benefício: Médio-Alto

### FASE 2: Reorganização de Estrutura (Semana 3-4)

**Objetivo:** Melhorar navegabilidade e organização

1. **Reorganizar `services/`**
   - Tempo estimado: 3-4 horas
   - Risco: Baixo (apenas mover arquivos)
   - Benefício: Médio

2. **Consolidar `utils/`**
   - Tempo estimado: 2-3 horas
   - Risco: Baixo
   - Benefício: Médio

3. **Reorganizar `types/`**
   - Tempo estimado: 2-3 horas
   - Risco: Baixo
   - Benefício: Médio

### FASE 3: Componentização (Semana 5-6)

**Objetivo:** Melhorar reusabilidade e testabilidade

1. **Quebrar `ResultViewer.tsx`**
   - Tempo estimado: 4-5 horas
   - Risco: Baixo
   - Benefício: Médio

2. **Quebrar `MaterialSelector.tsx`**
   - Tempo estimado: 3-4 horas
   - Risco: Baixo
   - Benefício: Médio

3. **Organizar `ForensicViewer.tsx`**
   - Tempo estimado: 1-2 horas
   - Risco: Muito Baixo
   - Benefício: Baixo

---

## 📊 Métricas Esperadas Pós-Refatoração

| Métrica | Atual | Esperado | Melhoria |
|---------|-------|----------|----------|
| Arquivos >300 linhas | 7 | 0 | 100% |
| Arquivos >200 linhas | 13 | 3-5 | 62% |
| Média de linhas/arquivo | 143 | ~90 | 37% |
| Profundidade de pastas | 1-2 níveis | 2-3 níveis | +50% organização |
| Arquivos sem responsabilidade única | 7 | 0 | 100% |
| Componentes reutilizáveis | 7 | ~15 | +114% |

---

## 🛠️ Estratégia de Implementação

### Princípios:

1. **Incremental:** Refatorar arquivo por arquivo, não tudo de uma vez
2. **Testável:** Garantir que testes existentes continuem passando
3. **Reversível:** Usar Git branches para cada refatoração
4. **Documentado:** Atualizar documentação conforme refatora

### Processo Recomendado:

```bash
# Para cada arquivo a refatorar:

1. Criar branch: git checkout -b refactor/gemini-service
2. Criar testes (se não existirem)
3. Refatorar mantendo interface pública
4. Rodar testes: npm run lint && npm run build
5. Code review
6. Merge
7. Deploy incremental

# Repetir para próximo arquivo
```

### Validação:

- ✅ TypeScript compila sem erros
- ✅ Testes unitários passam
- ✅ Build de produção funciona
- ✅ Vercel deploy bem-sucedido
- ✅ Smoke tests manuais

---

## 💡 Recomendações Arquiteturais de Longo Prazo

### 1. Considerar Feature-Based Organization

Para projetos que crescem além de ~100 arquivos, considere organização por feature:

```
features/
├── image-analysis/
│   ├── components/
│   ├── hooks/
│   ├── services/
│   └── types/
│
├── material-selection/
│   ├── components/
│   ├── hooks/
│   ├── services/
│   └── types/
│
└── rendering/
    ├── components/
    ├── hooks/
    ├── services/
    └── types/
```

### 2. Implementar Design System

Criar biblioteca de componentes reutilizáveis:

```
design-system/
├── atoms/        # Button, Input, Badge
├── molecules/    # Card, Modal, Dropdown
└── organisms/    # Navbar, Footer, ComplexForms
```

### 3. Adicionar Camada de State Management

Para escalar além do estado local, considere:
- Zustand (leve e simples)
- Jotai (atomic state)
- Redux Toolkit (se precisar de DevTools)

### 4. Implementar Testes Automatizados

```
__tests__/
├── unit/         # Funções puras
├── integration/  # Fluxos completos
└── e2e/          # Playwright/Cypress
```

---

## 🎓 Conclusão

### Pontos Fortes (Manter):
✅ Separação clara de concerns (api, components, services)  
✅ Uso de TypeScript e tipagem forte  
✅ Custom hooks bem implementados  
✅ Arquitetura serverless adequada  
✅ Alguns componentes já bem estruturados

### Pontos a Melhorar (Agir):
⚠️ Arquivos muito grandes (>300 linhas)  
⚠️ Pasta `services/` desorganizada (17 arquivos soltos)  
⚠️ Duplicação de utilitários (4 locais diferentes)  
⚠️ Componentes grandes sem subcomponentes  
⚠️ `App.tsx` como componente "God"  
⚠️ Tipos fragmentados sem organização clara

### Próximos Passos:
1. ✅ **Ler este relatório** e priorizar melhorias
2. 📅 **Planejar FASE 1** (refatoração de arquivos críticos)
3. 🔧 **Criar branch** para primeira refatoração
4. 🧪 **Implementar testes** antes de refatorar
5. 🚀 **Executar refatoração incremental**

---

**Relatório gerado por:** Rovo Dev  
**Modo:** Análise sem modificações (Planning Mode)  
**Próxima ação recomendada:** Discutir prioridades com a equipe e iniciar FASE 1

