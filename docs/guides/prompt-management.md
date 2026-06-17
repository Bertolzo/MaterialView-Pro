# Prompt Management Guide

## Overview

Este guia documenta o sistema de gerenciamento de prompts externalizado implementado na Fase 1 da refatoração multi-provider. Prompts são armazenados em arquivos YAML versionados com templates Handlebars, permitindo:

- ✅ Versionamento independente de código
- ✅ A/B testing sem rebuild
- ✅ Edição sem deploy
- ✅ Suporte a localização
- ✅ Interpolação de variáveis dinâmicas

**Requirements**: 5.1 (Externalização de Prompts), 5.2 (Template Interpolation)

---

## Table of Contents

1. [Directory Structure](#directory-structure)
2. [YAML Format](#yaml-format)
3. [Handlebars Syntax](#handlebars-syntax)
4. [Loading Prompts](#loading-prompts)
5. [Rendering Templates](#rendering-templates)
6. [Best Practices](#best-practices)
7. [Examples](#examples)
8. [Troubleshooting](#troubleshooting)

---

## Directory Structure

```
prompts/
├── gemini/                    # Provider name
│   └── v1/                    # Version
│       ├── analysis.yaml      # Image analysis prompt
│       ├── render.yaml        # Main rendering prompt
│       ├── self-audit.yaml    # Quality validation prompt
│       └── negative-constraints.yaml  # Negative prompt constraints
├── deepseek/                  # Future provider (Fase 2)
│   └── v1/
│       └── ...
└── README.md                  # Documentation
```

### Naming Convention

**Pattern**: `prompts/{provider}/{version}/{type}.yaml`

- **provider**: Nome do provedor de IA (gemini, deepseek, qwen)
- **version**: Versão do prompt (v1, v2, v3)
- **type**: Tipo de prompt (analysis, render, self-audit, etc.)

**Examples**:
- `prompts/gemini/v1/analysis.yaml`
- `prompts/gemini/v2/render.yaml`
- `prompts/deepseek/v1/analysis.yaml`

---

## YAML Format

### Basic Structure

```yaml
version: "1.0"                 # Versão do formato YAML
provider: "gemini"             # Provedor de IA
type: "render"                 # Tipo de prompt
description: "Brief description of what this prompt does"

template: |                    # Template Handlebars (multiline)
  Your prompt text here with {{variables}}.
  
  {{#if condition}}
  Conditional content
  {{/if}}

parameters:                    # Parâmetros do modelo
  temperature: 0.7
  maxTokens: 4000
  model: "gemini-2.0-flash"

variables:                     # Documentação de variáveis
  variableName: type
  anotherVariable: type
```

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `version` | string | Versão do formato YAML (ex: "1.0") |
| `provider` | string | Nome do provedor (gemini, deepseek, qwen) |
| `type` | string | Tipo de prompt (analysis, render, self-audit) |
| `description` | string | Descrição breve do propósito do prompt |
| `template` | string | Template Handlebars com o conteúdo do prompt |

### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `parameters` | object | Parâmetros do modelo (temperature, maxTokens, etc.) |
| `variables` | object | Documentação das variáveis esperadas |
| `constraints` | array | Lista de restrições (para negative prompts) |

### Example: Analysis Prompt

```yaml
version: "1.0"
provider: "gemini"
type: "analysis"
description: "Prompt para análise de contexto de ambiente"

template: |
  Analyze this room image and provide detailed context:
  
  1. Room Type: Identify the space (living room, kitchen, bedroom, etc.)
  2. Lighting Conditions: Assess natural and artificial lighting
  3. Furniture Detection: List all visible furniture with positions
  4. Geometry: Detect room shape (rectangular, L-shaped, irregular)
  
  Return JSON format:
  {
    "roomType": string,
    "lighting": "bright" | "moderate" | "dim",
    "furniture": Array<{name: string, position: string}>,
    "geometry": {
      "shape": string
    }
  }

parameters:
  temperature: 0.3
  maxTokens: 2000
  model: "gemini-2.0-flash"
```

---

## Handlebars Syntax

Handlebars é uma linguagem de templates que permite interpolação de variáveis e lógica condicional.

### Variable Interpolation

**Syntax**: `{{variableName}}`

```yaml
template: |
  Transform this room by replacing the flooring with {{materialName}}.
  The material has dimensions of {{materialDimensions}}.
```

**Usage**:
```typescript
const variables = {
  materialName: "Oak Hardwood",
  materialDimensions: "20x120cm"
};

// Output: "Transform this room by replacing the flooring with Oak Hardwood.
//          The material has dimensions of 20x120cm."
```

### Conditionals

**Syntax**: `{{#if condition}}...{{else}}...{{/if}}`

```yaml
template: |
  {{#if hasLShape}}
  L-SHAPE CONTINUITY:
  - Ensure seamless transition at corner: {{lShapeCorners}}
  {{else}}
  STANDARD GEOMETRY:
  - Apply uniform tiling pattern
  {{/if}}
```

**Usage**:
```typescript
const variables = {
  hasLShape: true,
  lShapeCorners: "[(10, 20), (90, 20)]"
};

// Output: "L-SHAPE CONTINUITY:
//          - Ensure seamless transition at corner: [(10, 20), (90, 20)]"
```

### Loops

**Syntax**: `{{#each array}}...{{/each}}`

```yaml
template: |
  FURNITURE PRESERVATION:
  {{#each furniture}}
  - {{name}} at {{position}}: DO NOT MODIFY
  {{/each}}
```

**Usage**:
```typescript
const variables = {
  furniture: [
    { name: "Sofa", position: "left wall" },
    { name: "Coffee Table", position: "center" }
  ]
};

// Output: "FURNITURE PRESERVATION:
//          - Sofa at left wall: DO NOT MODIFY
//          - Coffee Table at center: DO NOT MODIFY"
```

### Nested Properties

**Syntax**: `{{object.property}}`

```yaml
template: |
  Scale calibration: {{scaleAnchor.object}} is {{scaleAnchor.pixelWidth}}px wide.
```

**Usage**:
```typescript
const variables = {
  scaleAnchor: {
    object: "door",
    pixelWidth: 120
  }
};

// Output: "Scale calibration: door is 120px wide."
```

### Comments

**Syntax**: `{{! comment }}`

```yaml
template: |
  {{! This is a comment and won't appear in output }}
  Transform this room...
```

### Escaping

Para incluir `{{` literalmente no texto, use `\{{`:

```yaml
template: |
  Use the syntax \{{variableName}} to interpolate variables.
```

---

## Loading Prompts

### Using promptLoader

```typescript
import { loadPrompt, renderPrompt } from './services/promptLoader.js';

// Load prompt from YAML file
const promptTemplate = loadPrompt('gemini', 'v1', 'render');

// promptTemplate structure:
// {
//   version: "1.0",
//   provider: "gemini",
//   type: "render",
//   description: "...",
//   template: "...",
//   parameters: { temperature: 0.7, maxTokens: 4000 },
//   variables: { materialName: "string", ... }
// }
```

### Error Handling

```typescript
try {
  const prompt = loadPrompt('gemini', 'v1', 'render');
} catch (error) {
  if (error.code === 'ENOENT') {
    console.error('Prompt file not found');
    // Fallback to default prompt
  } else {
    console.error('Failed to parse YAML:', error);
  }
}
```

---

## Rendering Templates

### Basic Rendering

```typescript
import { loadPrompt, renderPrompt } from './services/promptLoader.js';

const template = loadPrompt('gemini', 'v1', 'render');

const variables = {
  materialName: "Oak Hardwood",
  materialDimensions: "20x120cm",
  materialPhysics: "SURFACE: Matte/Diffuse. Soft light scattering.",
  geometryNotes: "L-shaped room with corridor",
  lightingType: "natural",
  hasObstacles: true,
  obstacles: "sofa, coffee table, rug"
};

const renderedPrompt = renderPrompt(template, variables);
// Returns: Complete prompt string with all variables interpolated
```

### With Conditionals

```typescript
const variables = {
  materialName: "Marble Tile",
  hasLShape: true,
  lShapeCorners: "[(10, 20), (90, 20)]",
  hasUserPoint: false,
  isFallback: false,
  hasScaleAnchor: true,
  scaleAnchorObject: "door",
  scaleAnchorPixelWidth: 120,
  scaleAnchorCmPerPixel: 0.75
};

const renderedPrompt = renderPrompt(template, variables);
// Conditionals are evaluated and appropriate sections included
```

### With Arrays

```typescript
const variables = {
  materialName: "Porcelain Tile",
  furniture: [
    { name: "Sofa", position: "left wall" },
    { name: "Coffee Table", position: "center" },
    { name: "TV Stand", position: "right wall" }
  ]
};

const renderedPrompt = renderPrompt(template, variables);
// Each furniture item is rendered in the loop
```

---

## Best Practices

### 1. Variable Naming

**Use descriptive, camelCase names**:
```yaml
✅ Good:
  materialName: string
  hasLShape: boolean
  scaleAnchorPixelWidth: number

❌ Bad:
  mat: string
  l: boolean
  w: number
```

### 2. Documentation

**Always document variables**:
```yaml
variables:
  materialName: string          # Name of the flooring material
  materialDimensions: string    # Dimensions in format "WxHcm"
  hasLShape: boolean            # Whether room has L-shaped geometry
```

### 3. Default Values

**Provide fallbacks for optional variables**:
```yaml
template: |
  Obstacles: {{#if hasObstacles}}{{obstacles}}{{else}}None detected{{/if}}
```

### 4. Validation

**Validate required variables before rendering**:
```typescript
function validateVariables(template: PromptTemplate, variables: Record<string, any>) {
  const required = Object.keys(template.variables || {});
  const missing = required.filter(key => !(key in variables));
  
  if (missing.length > 0) {
    throw new Error(`Missing required variables: ${missing.join(', ')}`);
  }
}
```

### 5. Version Management

**Use semantic versioning**:
- `v1`: Initial version
- `v2`: Major changes (breaking)
- `v1.1`: Minor improvements (non-breaking)

**Create new versions instead of modifying existing**:
```bash
# Don't modify v1/render.yaml
# Create v2/render.yaml instead
cp prompts/gemini/v1/render.yaml prompts/gemini/v2/render.yaml
# Edit v2/render.yaml
```

### 6. Testing

**Test prompts with property-based testing**:
```typescript
import fc from 'fast-check';

it('rendered prompts should be valid strings', () => {
  fc.assert(
    fc.property(
      fc.record({
        materialName: fc.string(),
        hasLShape: fc.boolean()
      }),
      (variables) => {
        const template = loadPrompt('gemini', 'v1', 'render');
        const rendered = renderPrompt(template, variables);
        
        expect(typeof rendered).toBe('string');
        expect(rendered.length).toBeGreaterThan(0);
      }
    ),
    { numRuns: 100 }
  );
});
```

### 7. Multiline Strings

**Use YAML multiline syntax**:
```yaml
✅ Good:
template: |
  Line 1
  Line 2
  Line 3

❌ Bad:
template: "Line 1\nLine 2\nLine 3"
```

---

## Examples

### Example 1: Simple Analysis Prompt

**File**: `prompts/gemini/v1/analysis.yaml`

```yaml
version: "1.0"
provider: "gemini"
type: "analysis"
description: "Basic room analysis"

template: |
  Analyze this room image:
  
  1. Room Type: {{roomType}}
  2. Lighting: {{lighting}}
  
  Provide detailed analysis in JSON format.

parameters:
  temperature: 0.3
  maxTokens: 2000

variables:
  roomType: string
  lighting: string
```

**Usage**:
```typescript
const template = loadPrompt('gemini', 'v1', 'analysis');
const prompt = renderPrompt(template, {
  roomType: "living room",
  lighting: "natural"
});
```

### Example 2: Conditional Rendering

**File**: `prompts/gemini/v1/render.yaml`

```yaml
version: "1.0"
provider: "gemini"
type: "render"
description: "Rendering with conditional L-shape handling"

template: |
  Transform this room with {{materialName}}.
  
  {{#if hasLShape}}
  SPECIAL INSTRUCTIONS FOR L-SHAPED ROOM:
  - Ensure continuity at corners: {{lShapeCorners}}
  - Follow perspective lines into extension
  {{else}}
  STANDARD ROOM:
  - Apply uniform tiling pattern
  {{/if}}

parameters:
  temperature: 0.7
  maxTokens: 4000

variables:
  materialName: string
  hasLShape: boolean
  lShapeCorners: string
```

**Usage**:
```typescript
const template = loadPrompt('gemini', 'v1', 'render');

// L-shaped room
const prompt1 = renderPrompt(template, {
  materialName: "Oak Hardwood",
  hasLShape: true,
  lShapeCorners: "[(10, 20), (90, 20)]"
});

// Standard room
const prompt2 = renderPrompt(template, {
  materialName: "Oak Hardwood",
  hasLShape: false,
  lShapeCorners: ""
});
```

### Example 3: Array Iteration

**File**: `prompts/gemini/v1/self-audit.yaml`

```yaml
version: "1.0"
provider: "gemini"
type: "self-audit"
description: "Quality validation with furniture list"

template: |
  Validate the rendering quality:
  
  FURNITURE PRESERVATION CHECK:
  {{#each furniture}}
  - {{name}} at {{position}}: Verify unchanged
  {{/each}}
  
  Return validation result in JSON.

parameters:
  temperature: 0.2
  maxTokens: 1500

variables:
  furniture: array
```

**Usage**:
```typescript
const template = loadPrompt('gemini', 'v1', 'self-audit');
const prompt = renderPrompt(template, {
  furniture: [
    { name: "Sofa", position: "left wall" },
    { name: "Coffee Table", position: "center" }
  ]
});
```

### Example 4: Negative Constraints

**File**: `prompts/gemini/v1/negative-constraints.yaml`

```yaml
version: "1.0"
provider: "gemini"
type: "constraints"
description: "Negative prompt constraints"

constraints:
  - "no human figures or body parts"
  - "no faces or anatomical features"
  - "no text or signage modifications"
  - "no furniture alterations"
  - "no wall color changes"

template: |
  STRICTLY AVOID:
  {{#each constraints}}
  - {{this}}
  {{/each}}
```

**Usage**:
```typescript
const template = loadPrompt('gemini', 'v1', 'negative-constraints');
const prompt = renderPrompt(template, {
  constraints: template.constraints
});
```

---

## Troubleshooting

### Issue: "Prompt file not found"

**Cause**: Incorrect path or file doesn't exist

**Solution**:
```typescript
// Check file exists
import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'prompts', 'gemini', 'v1', 'render.yaml');
if (!fs.existsSync(filePath)) {
  console.error('File not found:', filePath);
}
```

### Issue: "YAML parsing error"

**Cause**: Invalid YAML syntax

**Solution**:
```bash
# Validate YAML syntax
npm install -g js-yaml
js-yaml prompts/gemini/v1/render.yaml
```

**Common YAML errors**:
```yaml
❌ Bad: Inconsistent indentation
template: |
  Line 1
   Line 2  # Wrong indentation

✅ Good: Consistent indentation
template: |
  Line 1
  Line 2
```

### Issue: "Variable not interpolated"

**Cause**: Variable name mismatch or missing

**Solution**:
```typescript
// Debug: Log variables before rendering
console.log('Variables:', JSON.stringify(variables, null, 2));

const rendered = renderPrompt(template, variables);

// Check if variable appears in output
if (!rendered.includes(variables.materialName)) {
  console.error('Variable not interpolated:', 'materialName');
}
```

### Issue: "Conditional not working"

**Cause**: Boolean value not properly set

**Solution**:
```typescript
// Ensure boolean values are actual booleans
const variables = {
  hasLShape: true,  // ✅ Boolean
  // hasLShape: "true",  // ❌ String (won't work)
};
```

### Issue: "Loop not rendering items"

**Cause**: Array is empty or not an array

**Solution**:
```typescript
// Validate array before rendering
if (!Array.isArray(variables.furniture)) {
  console.error('furniture must be an array');
}

if (variables.furniture.length === 0) {
  console.warn('furniture array is empty');
}
```

---

## A/B Testing

### Setup

```typescript
// Load different versions
const v1Template = loadPrompt('gemini', 'v1', 'render');
const v2Template = loadPrompt('gemini', 'v2', 'render');

// Randomly select version
const template = Math.random() < 0.5 ? v1Template : v2Template;

const prompt = renderPrompt(template, variables);

// Log version for analytics
console.log('Using prompt version:', template.version);
```

### Metrics Collection

```typescript
interface PromptMetrics {
  version: string;
  successRate: number;
  avgLatency: number;
  qualityScore: number;
}

async function testPromptVersion(version: string, testCases: any[]) {
  const template = loadPrompt('gemini', version, 'render');
  const results = [];
  
  for (const testCase of testCases) {
    const start = Date.now();
    const prompt = renderPrompt(template, testCase.variables);
    const result = await renderWithPrompt(prompt, testCase.image);
    const latency = Date.now() - start;
    
    results.push({
      success: result.success,
      latency,
      qualityScore: result.qualityScore
    });
  }
  
  return {
    version,
    successRate: results.filter(r => r.success).length / results.length,
    avgLatency: results.reduce((sum, r) => sum + r.latency, 0) / results.length,
    qualityScore: results.reduce((sum, r) => sum + r.qualityScore, 0) / results.length
  };
}
```

---

## Future Enhancements (Fase 2)

- [ ] Prompt caching in memory
- [ ] Hot reload of prompts without restart
- [ ] Localization support (en, pt, es)
- [ ] Prompt versioning with git integration
- [ ] Visual prompt editor
- [ ] Prompt analytics dashboard

---

## References

- **Requirements**: `.kiro/specs/multi-provider-ai-architecture/requirements.md` (5.1-5.6)
- **Design**: `.kiro/specs/multi-provider-ai-architecture/design.md`
- **ADR**: `docs/adr/001-phase1-refactoring.md`
- **Handlebars Docs**: https://handlebarsjs.com/
- **YAML Spec**: https://yaml.org/spec/1.2/spec.html

---

## Support

Para questões ou problemas:
- Consulte exemplos em `prompts/gemini/v1/`
- Veja testes em `tests/unit/promptLoader.test.ts`
- Leia ADR 001: `docs/adr/001-phase1-refactoring.md`
