# renderCoreService API Documentation

## Overview

`renderCoreService.ts` é o módulo centralizado de funcionalidades compartilhadas entre serviços de renderização. Foi criado na Fase 1 da refatoração multi-provider para eliminar código duplicado (~280 linhas) e facilitar testes unitários.

**Localização**: `services/renderCoreService.ts`

**Propósito**:
- Consolidar código duplicado entre `geminiService` e `renderWithSelfAuditService`
- Fornecer utilitários reutilizáveis para gerenciamento de API, retry logic e cálculos de física de materiais
- Preparar base para abstração de provedores (Fase 2)

**Requirements**: 3.1 (Eliminação de Código Duplicado), 3.5 (Preservação de Comportamento)

---

## Table of Contents

1. [APIKeyManager](#apikeymanager)
2. [withRetry()](#withretry)
3. [withTimeout()](#withtimeout)
4. [deriveMaterialPhysics()](#derivematerialphysics)
5. [buildInpaintingPromptWithMask()](#buildinpaintingpromptwithmask)
6. [buildStabilizedPrompt()](#buildstabilizedprompt)
7. [Usage Examples](#usage-examples)

---

## APIKeyManager

Gerenciador de múltiplas chaves de API com rotação automática para load balancing e failover.

### Constructor

```typescript
constructor()
```

Cria uma nova instância do APIKeyManager. As chaves são carregadas lazy (na primeira chamada a `getClient()` ou `rotate()`).

**Carregamento de chaves**:
- Lê `GEMINI_API_KEY` (chave primária)
- Descobre chaves secundárias: `GEMINI_API_KEY_2`, `GEMINI_API_KEY_3`, etc.
- Remove duplicatas automaticamente

### Methods

#### `getClient(): GoogleGenAI`

Retorna um cliente Google GenAI configurado com a chave atual.

**Returns**: `GoogleGenAI` - Cliente configurado

**Throws**: `Error` - Se nenhuma chave estiver disponível

**Example**:
```typescript
const manager = new APIKeyManager();
const client = manager.getClient();
const model = client.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
```

#### `rotate(): boolean`

Rotaciona para a próxima chave disponível. Útil em caso de rate limiting ou quota exceeded.

**Returns**: `boolean` - `true` se rotação foi bem-sucedida, `false` se há apenas uma chave

**Example**:
```typescript
const manager = new APIKeyManager();
try {
  const result = await callAPI();
} catch (error) {
  if (error.message.includes('429')) {
    if (manager.rotate()) {
      // Retry com nova chave
      const result = await callAPI();
    }
  }
}
```

#### `getKeyCount(): number`

Retorna o número de chaves carregadas. Útil para testes unitários e monitoramento.

**Returns**: `number` - Quantidade de chaves disponíveis

**Example**:
```typescript
const manager = new APIKeyManager();
console.log(`Loaded ${manager.getKeyCount()} API keys`);
```

### Environment Variables

```bash
# Chave primária
GEMINI_API_KEY=your-primary-key

# Chaves secundárias (opcional)
GEMINI_API_KEY_2=your-secondary-key
GEMINI_API_KEY_3=your-tertiary-key
```

---

## withRetry()

Executa uma função com retry automático em caso de erros recuperáveis.

### Signature

```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  retries?: number,
  delay?: number
): Promise<T>
```

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `fn` | `() => Promise<T>` | - | Função assíncrona a ser executada |
| `retries` | `number` | `1` | Número de tentativas adicionais |
| `delay` | `number` | `500` | Delay inicial em ms (aumenta exponencialmente) |

### Returns

`Promise<T>` - Resultado da função

### Throws

`Error` - Último erro após todas as tentativas falharem

### Behavior

**Erros recuperáveis** (retry automático):
- 429 (Rate Limit)
- 503 (Service Unavailable)
- Timeout
- Erros de rede temporários

**Erros não-recuperáveis** (fail fast):
- 401 (Unauthorized)
- 400 (Invalid Request)
- Erros contendo "invalid" ou "unauthorized"

**Backoff strategy**: Delay aumenta linearmente: `delay * (attempt + 1)`
- Tentativa 1: 500ms
- Tentativa 2: 1000ms
- Tentativa 3: 1500ms

### Example

```typescript
import { withRetry } from './renderCoreService.js';

// Retry automático em caso de erro recuperável
const result = await withRetry(
  async () => {
    const response = await fetch('https://api.example.com/data');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  },
  3,  // 3 retries
  1000 // 1 segundo de delay inicial
);
```

---

## withTimeout()

Adiciona timeout a uma Promise.

### Signature

```typescript
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T>
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `promise` | `Promise<T>` | Promise a ser executada |
| `ms` | `number` | Timeout em milissegundos |

### Returns

`Promise<T>` - Resultado da promise ou erro de timeout

### Throws

`Error` - "Timeout after {ms}ms" se o timeout for excedido

### Example

```typescript
import { withTimeout } from './renderCoreService.js';

// Timeout de 30 segundos
const result = await withTimeout(
  fetch('https://api.example.com/slow-endpoint'),
  30000
);
```

### Combining with withRetry

```typescript
import { withRetry, withTimeout } from './renderCoreService.js';

const result = await withRetry(
  () => withTimeout(
    fetch('https://api.example.com/data'),
    10000 // 10 segundos
  ),
  3 // 3 retries
);
```

---

## deriveMaterialPhysics()

Deriva propriedades físicas de materiais baseado em análise de imagem e material selecionado.

### Signature

```typescript
function deriveMaterialPhysics(
  analysis: ImageAnalysis,
  material: Material
): string
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `analysis` | `ImageAnalysis` | Análise da imagem contendo informações de iluminação e cena |
| `material` | `Material` | Material selecionado com propriedades (finish, dimensions, etc.) |

### Returns

`string` - Descrição textual das propriedades físicas para uso em prompts

### Calculated Properties

1. **Surface characteristics**:
   - Polished/Glossy: "High specularity. Sharp reflections. Glass-like finish."
   - Matte/Diffuse: "Soft light scattering. Visible texture grain."

2. **Exposure compensation**:
   - Ajusta brilho em cenas escuras

3. **Tile dimensions**:
   - Extrai dimensões do material (ex: "20x120cm")
   - Calcula escala apropriada para renderização

4. **Format classification**:
   - Large format: ≥100cm ou ≥80cm (2-4 grout lines per meter)
   - Small format: ≤15cm (dense pattern, herringbone)
   - Extra-large slab: 1x1m (monolithic appearance)
   - Standard: outros tamanhos

### Example

```typescript
import { deriveMaterialPhysics } from './renderCoreService.js';

const analysis: ImageAnalysis = {
  lightingType: 'natural',
  isDarkScene: false,
  floorObstacles: ['sofa', 'coffee table'],
  geometryNotes: 'L-shaped room'
};

const material: Material = {
  id: '1',
  name: 'Oak Hardwood',
  finish: 'Polido',
  dimensions: '20x120cm',
  prompt: 'Natural oak wood texture'
};

const physics = deriveMaterialPhysics(analysis, material);
// Output: "SURFACE: High specularity. Sharp reflections. Glass-like finish. 
//          TILE DIMENSIONS: Each tile is 20cm x 120cm. Tile accordingly in perspective. 
//          FORMAT: Large format plank/tile. 2-4 visible grout lines per meter."
```

---

## buildInpaintingPromptWithMask()

Constrói prompt de inpainting com máscara manual definida pelo usuário.

### Signature

```typescript
function buildInpaintingPromptWithMask(
  material: Material,
  maskPoints: Array<{ x: number; y: number }>
): string
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `material` | `Material` | Material selecionado |
| `maskPoints` | `Array<{x: number, y: number}>` | Pontos da máscara poligonal (coordenadas normalizadas 0-100) |

### Returns

`string` - Prompt formatado com instruções de máscara, ou string vazia se não houver pontos

### Example

```typescript
import { buildInpaintingPromptWithMask } from './renderCoreService.js';

const material: Material = {
  id: '1',
  name: 'Marble Tile',
  // ... outras propriedades
};

const maskPoints = [
  { x: 10, y: 20 },
  { x: 90, y: 20 },
  { x: 90, y: 80 },
  { x: 10, y: 80 }
];

const prompt = buildInpaintingPromptWithMask(material, maskPoints);
// Output: Prompt com instruções para aplicar textura apenas dentro do polígono definido
```

---

## buildStabilizedPrompt()

Constrói prompt estabilizado completo para renderização de piso. Este é o prompt principal usado para gerar renderizações de alta qualidade.

### Signature

```typescript
function buildStabilizedPrompt(
  material: Material,
  textureResult: { base64: string; isFallback: boolean },
  analysis: ImageAnalysis,
  userPoint?: { x: number; y: number }
): string
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `material` | `Material` | Material selecionado |
| `textureResult` | `{base64: string, isFallback: boolean}` | Resultado da busca de textura |
| `analysis` | `ImageAnalysis` | Análise completa da imagem |
| `userPoint` | `{x: number, y: number}` (optional) | Ponto de ancoragem definido pelo usuário |

### Returns

`string` - Prompt completo formatado com todas as instruções

### Prompt Components

O prompt gerado inclui:

1. **System Mode**: Define o papel do modelo (High-Fidelity Texture Projection Engine)

2. **Integrity Philosophy**: "Hydraulic Flow & Hard Stops"
   - Floor como domínio fluido
   - Objetos como barreiras sólidas

3. **Shadow Physics Rule**: Instruções para lidar com sombras no piso

4. **Scene Manifest**:
   - Geometria (L-shapes, corredores)
   - Iluminação
   - Obstáculos (móveis, tapetes)
   - Ancoragem espacial

5. **Target Material**:
   - Nome e dimensões
   - Propriedades físicas (via `deriveMaterialPhysics()`)
   - Instruções de textura

6. **Scale Calibration** (se disponível):
   - Objeto de referência
   - Ratio cm/pixel
   - Instruções de precisão B2B

7. **Execution Protocol**:
   - Continuidade geométrica (L-shapes)
   - Preservação de objetos
   - Integridade de realidade

### Example

```typescript
import { buildStabilizedPrompt } from './renderCoreService.js';

const material: Material = {
  id: '1',
  name: 'Oak Hardwood',
  dimensions: '20x120cm',
  finish: 'Matte',
  prompt: 'Natural oak wood texture'
};

const textureResult = {
  base64: 'data:image/jpeg;base64,...',
  isFallback: false
};

const analysis: ImageAnalysis = {
  lightingType: 'natural',
  isDarkScene: false,
  floorObstacles: ['sofa', 'coffee table'],
  geometryNotes: 'L-shaped room with corridor',
  scaleAnchor: {
    object: 'door',
    pixelWidth: 120,
    estimatedCmPerPixel: 0.75
  }
};

const userPoint = { x: 50, y: 70 }; // Centro do piso

const prompt = buildStabilizedPrompt(material, textureResult, analysis, userPoint);
// Output: Prompt completo de ~100 linhas com todas as instruções
```

---

## Usage Examples

### Complete Rendering Flow

```typescript
import {
  APIKeyManager,
  withRetry,
  withTimeout,
  deriveMaterialPhysics,
  buildStabilizedPrompt
} from './renderCoreService.js';

// 1. Setup API Key Manager
const apiManager = new APIKeyManager();

// 2. Analyze image
const analysis = await withRetry(
  () => withTimeout(
    analyzeImage(base64Image),
    30000 // 30s timeout
  ),
  3 // 3 retries
);

// 3. Build prompt with material physics
const textureResult = await fetchTexture(material);
const prompt = buildStabilizedPrompt(material, textureResult, analysis);

// 4. Render with retry and rotation
let result;
for (let attempt = 0; attempt < 3; attempt++) {
  try {
    const client = apiManager.getClient();
    result = await withTimeout(
      renderWithClient(client, prompt, base64Image),
      60000 // 60s timeout
    );
    break;
  } catch (error) {
    if (error.message.includes('429') && apiManager.rotate()) {
      console.log('Rate limited, rotating to next key...');
      continue;
    }
    throw error;
  }
}
```

### Testing with Mocks

```typescript
import { withRetry, deriveMaterialPhysics } from './renderCoreService.js';

describe('renderCoreService', () => {
  it('should retry on recoverable errors', async () => {
    const mockFn = jest.fn()
      .mockRejectedValueOnce(new Error('503'))
      .mockResolvedValue('success');
    
    const result = await withRetry(mockFn, 3, 10);
    
    expect(result).toBe('success');
    expect(mockFn).toHaveBeenCalledTimes(2);
  });
  
  it('should calculate material physics correctly', () => {
    const analysis = {
      lightingType: 'bright',
      isDarkScene: false,
      floorObstacles: [],
      geometryNotes: 'rectangular'
    };
    
    const material = {
      name: 'Porcelain Tile',
      finish: 'Polido',
      dimensions: '60x60cm'
    };
    
    const physics = deriveMaterialPhysics(analysis, material);
    
    expect(physics).toContain('High specularity');
    expect(physics).toContain('60cm x 60cm');
  });
});
```

---

## Migration Notes

### From Duplicated Code

**Before** (geminiService.server.ts):
```typescript
// Código duplicado em geminiService
class APIKeyManager { /* ... */ }
async function withRetry() { /* ... */ }
function deriveMaterialPhysics() { /* ... */ }
```

**After**:
```typescript
// Import centralizado
import {
  APIKeyManager,
  withRetry,
  deriveMaterialPhysics
} from './renderCoreService.js';
```

### Breaking Changes

Nenhuma breaking change na API pública. Todas as funções mantêm assinaturas compatíveis.

---

## Performance Considerations

1. **APIKeyManager**: Lazy loading de chaves (primeira chamada)
2. **withRetry**: Backoff linear (pode ser otimizado para exponencial em Fase 2)
3. **deriveMaterialPhysics**: Operação síncrona, ~1ms
4. **buildStabilizedPrompt**: Operação síncrona, ~2-3ms

---

## Future Enhancements (Fase 2)

- [ ] Exponential backoff com jitter em `withRetry()`
- [ ] Circuit breaker pattern em `APIKeyManager`
- [ ] Cache de prompts gerados
- [ ] Telemetria integrada
- [ ] Suporte a múltiplos provedores (DeepSeek, Qwen)

---

## References

- **Requirements**: `.kiro/specs/multi-provider-ai-architecture/requirements.md`
- **Design**: `.kiro/specs/multi-provider-ai-architecture/design.md`
- **Tests**: `tests/unit/renderCoreService.test.ts`
- **ADR**: `docs/adr/001-phase1-refactoring.md`

---

## Support

Para questões ou problemas, consulte:
- Design Document: `.kiro/specs/multi-provider-ai-architecture/design.md`
- ADR 001: `docs/adr/001-phase1-refactoring.md`
- Unit Tests: `tests/unit/` (exemplos de uso)
