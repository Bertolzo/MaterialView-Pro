# Feature Flags Guide

## Overview

Este guia documenta o sistema centralizado de feature flags implementado na Fase 1 da refatoração multi-provider. Feature flags permitem habilitar/desabilitar funcionalidades sem modificar código, facilitando:

- ✅ Rollback rápido em caso de problemas
- ✅ A/B testing de funcionalidades
- ✅ Deploy gradual (canary releases)
- ✅ Configuração por ambiente (dev, staging, production)
- ✅ Type safety com TypeScript

**Requirements**: 6.1 (Centralização de Feature Flags), 6.2 (Carregamento de Configuração)

---

## Table of Contents

1. [Available Flags](#available-flags)
2. [Configuration](#configuration)
3. [Usage](#usage)
4. [Best Practices](#best-practices)
5. [Examples](#examples)
6. [Troubleshooting](#troubleshooting)

---

## Available Flags

### USE_SELF_AUDIT

**Type**: `boolean`  
**Default**: `false`  
**Environment Variable**: `ENABLE_SELF_AUDIT`

Habilita o pipeline de auto-auditoria de qualidade. Quando habilitado, cada renderização passa por validação automática que verifica:
- Integridade estrutural (sem artefatos anatômicos)
- Preservação de móveis
- Precisão de material
- Continuidade geométrica

**When to enable**:
- Production: Para garantir qualidade máxima
- Staging: Para testar pipeline de auditoria
- Development: Opcional (aumenta latência)

**Impact**:
- ⏱️ Latência: +30-40% (análise adicional)
- ✅ Qualidade: +15-20% (menos erros)
- 💰 Custo: +50% (chamadas extras de API)

**Example**:
```bash
# Enable self-audit
ENABLE_SELF_AUDIT=true

# Disable self-audit (default)
ENABLE_SELF_AUDIT=false
# or omit the variable
```

---

### GATEWAY_MODE

**Type**: `'gemini' | 'hf' | 'hybrid'`  
**Default**: `'gemini'`  
**Environment Variable**: `GATEWAY_MODE`

Define o modo de roteamento de provedores de IA:

#### `gemini` (Default)
Usa Google Gemini como provedor único.

**Characteristics**:
- ✅ Melhor qualidade geral
- ✅ Suporte a L-shapes
- ✅ Preservação de móveis
- ⚠️ Custo médio-alto
- ⚠️ Rate limits mais restritivos

**Use cases**:
- Production padrão
- Casos que requerem alta qualidade
- Geometrias complexas (L-shapes)

#### `hf` (Hugging Face)
Usa Hugging Face como provedor único.

**Characteristics**:
- ✅ Custo mais baixo
- ✅ Rate limits mais flexíveis
- ⚠️ Qualidade inferior em L-shapes
- ⚠️ Menos preciso em preservação de móveis

**Use cases**:
- Desenvolvimento e testes
- Casos de uso simples (geometria retangular)
- Quando custo é prioridade

#### `hybrid` (Future - Fase 2)
Combina múltiplos provedores com fallback automático.

**Characteristics**:
- ✅ Melhor disponibilidade
- ✅ Fallback automático
- ✅ Load balancing
- ⚠️ Complexidade adicional
- ⚠️ Ainda não implementado (Fase 2)

**Example**:
```bash
# Use Gemini (default)
GATEWAY_MODE=gemini

# Use Hugging Face
GATEWAY_MODE=hf

# Use hybrid mode (Fase 2)
GATEWAY_MODE=hybrid
```

---

### USE_HF_PRIMARY

**Type**: `boolean`  
**Default**: `false`  
**Environment Variable**: Derived from `GATEWAY_MODE`

Flag derivada automaticamente de `GATEWAY_MODE`. Não deve ser configurada diretamente.

**Value**:
- `true` quando `GATEWAY_MODE=hf`
- `false` caso contrário

**Usage**:
```typescript
const flags = getFeatureFlags();
if (flags.USE_HF_PRIMARY) {
  // Hugging Face é o provedor primário
}
```

---

### USE_LEGACY_MODE

**Type**: `boolean`  
**Default**: `false`  
**Environment Variable**: `USE_LEGACY_MODE`

Habilita implementação legada (pré-refatoração). Usado para rollback rápido em caso de problemas.

**When to enable**:
- 🚨 Emergência: Problemas críticos em production
- 🧪 Comparação: A/B testing entre versões
- 🔄 Rollback: Reverter para código original

**Impact**:
- ⏱️ Latência: Baseline (código original)
- ✅ Estabilidade: Código testado em production
- ⚠️ Manutenção: Código duplicado (temporário)

**Example**:
```bash
# Use refactored code (default)
USE_LEGACY_MODE=false

# Use legacy code (rollback)
USE_LEGACY_MODE=true
```

**Rollback procedure**:
```bash
# 1. Set flag
export USE_LEGACY_MODE=true

# 2. Restart service (if needed)
pm2 restart app

# 3. Verify
curl https://api.example.com/health
```

---

## Configuration

### Environment Variables

Feature flags são configuradas via variáveis de ambiente. Crie um arquivo `.env` na raiz do projeto:

```bash
# .env

# Self-Audit Pipeline
ENABLE_SELF_AUDIT=true

# Gateway Mode
GATEWAY_MODE=gemini

# Legacy Mode (for rollback)
USE_LEGACY_MODE=false
```

### Per-Environment Configuration

#### Development

```bash
# .env.development
ENABLE_SELF_AUDIT=false    # Faster iteration
GATEWAY_MODE=hf            # Lower cost
USE_LEGACY_MODE=false
```

#### Staging

```bash
# .env.staging
ENABLE_SELF_AUDIT=true     # Test quality pipeline
GATEWAY_MODE=gemini        # Production-like
USE_LEGACY_MODE=false
```

#### Production

```bash
# .env.production
ENABLE_SELF_AUDIT=true     # Maximum quality
GATEWAY_MODE=gemini        # Best quality
USE_LEGACY_MODE=false      # Use refactored code
```

### Validation

Feature flags são validados na inicialização:

```typescript
// Invalid values are replaced with defaults
GATEWAY_MODE=invalid  // → defaults to 'gemini'
ENABLE_SELF_AUDIT=yes // → defaults to false (must be 'true')
```

### Caching

Feature flags são cacheadas na primeira leitura para performance:

```typescript
// First call: reads from process.env
const flags1 = getFeatureFlags();

// Subsequent calls: returns cached value
const flags2 = getFeatureFlags(); // Same object reference
```

**Note**: Mudanças em `process.env` após a primeira leitura não terão efeito. Requer restart do serviço.

---

## Usage

### Basic Usage

```typescript
import { getFeatureFlags } from '../config/featureFlags.js';

const flags = getFeatureFlags();

if (flags.USE_SELF_AUDIT) {
  // Use self-audit pipeline
  const result = await renderWithSelfAudit(image, material);
} else {
  // Use standard rendering
  const result = await renderStandard(image, material);
}
```

### Check Single Flag

```typescript
import { isFeatureEnabled } from '../config/featureFlags.js';

if (isFeatureEnabled('USE_SELF_AUDIT')) {
  console.log('Self-audit is enabled');
}
```

### Get Gateway Mode

```typescript
import { getGatewayMode } from '../config/featureFlags.js';

const mode = getGatewayMode();

switch (mode) {
  case 'gemini':
    return useGeminiProvider();
  case 'hf':
    return useHuggingFaceProvider();
  case 'hybrid':
    return useHybridProvider();
}
```

### In geminiService

```typescript
// services/geminiService.server.ts
import { getFeatureFlags } from '../config/featureFlags.js';

export const renderFlooring = async (
  base64Image: string,
  material: Material,
  options?: RenderOptions
): Promise<RenderResult> => {
  const flags = getFeatureFlags();
  
  if (flags.USE_SELF_AUDIT) {
    // Import dynamically to avoid circular dependency
    const { renderWithSelfAuditOptimized } = await import('./renderWithSelfAuditService.js');
    return renderWithSelfAuditOptimized({
      base64Image,
      material,
      options,
      renderFunction: renderFlooring
    });
  }
  
  // Standard rendering
  // ...
};
```

### In API Routes

```typescript
// api/render.ts
import { getFeatureFlags, getGatewayMode } from '../config/featureFlags.js';

export default async function handler(req, res) {
  const flags = getFeatureFlags();
  const mode = getGatewayMode();
  
  // Log configuration
  console.log('Feature Flags:', {
    selfAudit: flags.USE_SELF_AUDIT,
    gatewayMode: mode,
    legacyMode: flags.USE_LEGACY_MODE
  });
  
  // Route based on flags
  if (flags.USE_LEGACY_MODE) {
    return legacyRenderHandler(req, res);
  }
  
  return refactoredRenderHandler(req, res);
}
```

---

## Best Practices

### 1. Use Type-Safe Access

**✅ Good**:
```typescript
import { getFeatureFlags } from '../config/featureFlags.js';

const flags = getFeatureFlags();
if (flags.USE_SELF_AUDIT) { /* ... */ }
```

**❌ Bad**:
```typescript
// Direct process.env access (no type safety)
if (process.env.ENABLE_SELF_AUDIT === 'true') { /* ... */ }
```

### 2. Cache Flags at Module Level

**✅ Good**:
```typescript
// Cache once at module initialization
const flags = getFeatureFlags();

export function myFunction() {
  if (flags.USE_SELF_AUDIT) { /* ... */ }
}
```

**❌ Bad**:
```typescript
// Re-read on every call (unnecessary)
export function myFunction() {
  const flags = getFeatureFlags(); // Called repeatedly
  if (flags.USE_SELF_AUDIT) { /* ... */ }
}
```

### 3. Document Flag Dependencies

```typescript
/**
 * Renders flooring with optional self-audit.
 * 
 * @param base64Image - Base64 encoded image
 * @param material - Material to apply
 * @returns Render result
 * 
 * @featureFlag USE_SELF_AUDIT - Enables quality validation
 * @featureFlag GATEWAY_MODE - Determines provider routing
 */
export async function renderFlooring(
  base64Image: string,
  material: Material
): Promise<RenderResult> {
  // ...
}
```

### 4. Log Flag State

```typescript
// At application startup
const flags = getFeatureFlags();
console.log('🚩 Feature Flags:', {
  USE_SELF_AUDIT: flags.USE_SELF_AUDIT,
  GATEWAY_MODE: flags.GATEWAY_MODE,
  USE_HF_PRIMARY: flags.USE_HF_PRIMARY,
  USE_LEGACY_MODE: flags.USE_LEGACY_MODE
});
```

### 5. Test with Different Configurations

```typescript
// tests/unit/featureFlags.test.ts
import { getFeatureFlags, _resetCache } from '../config/featureFlags.js';

describe('Feature Flags', () => {
  beforeEach(() => {
    _resetCache(); // Reset cache before each test
  });
  
  it('should enable self-audit when env var is true', () => {
    process.env.ENABLE_SELF_AUDIT = 'true';
    const flags = getFeatureFlags();
    expect(flags.USE_SELF_AUDIT).toBe(true);
  });
  
  it('should default to gemini mode', () => {
    delete process.env.GATEWAY_MODE;
    const flags = getFeatureFlags();
    expect(flags.GATEWAY_MODE).toBe('gemini');
  });
});
```

### 6. Gradual Rollout

```typescript
// Canary release: 10% of traffic uses new feature
const flags = getFeatureFlags();
const useNewFeature = flags.USE_SELF_AUDIT && Math.random() < 0.1;

if (useNewFeature) {
  // 10% of traffic
  return newImplementation();
} else {
  // 90% of traffic
  return oldImplementation();
}
```

---

## Examples

### Example 1: Simple Flag Check

```typescript
import { isFeatureEnabled } from '../config/featureFlags.js';

export async function processRequest(req) {
  if (isFeatureEnabled('USE_SELF_AUDIT')) {
    console.log('Using self-audit pipeline');
    return processWithAudit(req);
  } else {
    console.log('Using standard pipeline');
    return processStandard(req);
  }
}
```

### Example 2: Gateway Mode Routing

```typescript
import { getGatewayMode } from '../config/featureFlags.js';

export async function analyzeImage(base64Image: string) {
  const mode = getGatewayMode();
  
  switch (mode) {
    case 'gemini':
      return analyzeWithGemini(base64Image);
    
    case 'hf':
      return analyzeWithHuggingFace(base64Image);
    
    case 'hybrid':
      // Try Gemini first, fallback to HF
      try {
        return await analyzeWithGemini(base64Image);
      } catch (error) {
        console.warn('Gemini failed, falling back to HF');
        return analyzeWithHuggingFace(base64Image);
      }
    
    default:
      throw new Error(`Unknown gateway mode: ${mode}`);
  }
}
```

### Example 3: Legacy Mode Rollback

```typescript
import { getFeatureFlags } from '../config/featureFlags.js';

export async function renderFlooring(
  base64Image: string,
  material: Material
): Promise<RenderResult> {
  const flags = getFeatureFlags();
  
  if (flags.USE_LEGACY_MODE) {
    console.warn('⚠️ Using legacy implementation');
    return legacyRenderFlooring(base64Image, material);
  }
  
  // Use refactored implementation
  return refactoredRenderFlooring(base64Image, material);
}
```

### Example 4: Conditional Logging

```typescript
import { getFeatureFlags } from '../config/featureFlags.js';

const flags = getFeatureFlags();

export function log(message: string, level: 'info' | 'warn' | 'error') {
  const prefix = flags.USE_LEGACY_MODE ? '[LEGACY]' : '[REFACTORED]';
  console.log(`${prefix} [${level.toUpperCase()}] ${message}`);
}
```

### Example 5: A/B Testing

```typescript
import { getFeatureFlags } from '../config/featureFlags.js';

export async function renderWithABTest(
  base64Image: string,
  material: Material,
  userId: string
): Promise<RenderResult> {
  const flags = getFeatureFlags();
  
  // Assign users to groups based on ID
  const useNewFeature = flags.USE_SELF_AUDIT && 
                        parseInt(userId, 16) % 2 === 0;
  
  const result = useNewFeature
    ? await renderWithSelfAudit(base64Image, material)
    : await renderStandard(base64Image, material);
  
  // Log for analytics
  console.log('A/B Test:', {
    userId,
    variant: useNewFeature ? 'self-audit' : 'standard',
    success: result.success
  });
  
  return result;
}
```

---

## Troubleshooting

### Issue: "Flag changes not taking effect"

**Cause**: Flags are cached after first read

**Solution**:
```bash
# Restart the service to reload flags
pm2 restart app

# Or in development
npm run dev
```

### Issue: "Invalid GATEWAY_MODE value"

**Cause**: Typo or unsupported value

**Solution**:
```bash
# Check current value
echo $GATEWAY_MODE

# Valid values: gemini, hf, hybrid
export GATEWAY_MODE=gemini
```

### Issue: "Self-audit not working"

**Cause**: Flag not set correctly

**Solution**:
```bash
# Must be exactly 'true' (lowercase)
export ENABLE_SELF_AUDIT=true

# These won't work:
# ENABLE_SELF_AUDIT=True
# ENABLE_SELF_AUDIT=1
# ENABLE_SELF_AUDIT=yes
```

### Issue: "Flags different in tests"

**Cause**: Cache not reset between tests

**Solution**:
```typescript
import { _resetCache } from '../config/featureFlags.js';

describe('My Tests', () => {
  beforeEach(() => {
    _resetCache(); // Reset cache before each test
  });
  
  it('should work with flag enabled', () => {
    process.env.ENABLE_SELF_AUDIT = 'true';
    // Test code
  });
});
```

### Issue: "How to check current flags in production?"

**Solution**:
```bash
# Add health endpoint that returns flags
curl https://api.example.com/health

# Response:
# {
#   "status": "ok",
#   "flags": {
#     "USE_SELF_AUDIT": true,
#     "GATEWAY_MODE": "gemini",
#     "USE_LEGACY_MODE": false
#   }
# }
```

---

## Monitoring

### Health Check Endpoint

```typescript
// api/health.ts
import { getFeatureFlags } from '../config/featureFlags.js';

export default function handler(req, res) {
  const flags = getFeatureFlags();
  
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    flags: {
      USE_SELF_AUDIT: flags.USE_SELF_AUDIT,
      GATEWAY_MODE: flags.GATEWAY_MODE,
      USE_HF_PRIMARY: flags.USE_HF_PRIMARY,
      USE_LEGACY_MODE: flags.USE_LEGACY_MODE
    }
  });
}
```

### Metrics Collection

```typescript
import { getFeatureFlags } from '../config/featureFlags.js';

export function collectMetrics() {
  const flags = getFeatureFlags();
  
  return {
    'feature_flag.self_audit': flags.USE_SELF_AUDIT ? 1 : 0,
    'feature_flag.gateway_mode': flags.GATEWAY_MODE,
    'feature_flag.legacy_mode': flags.USE_LEGACY_MODE ? 1 : 0
  };
}
```

---

## Future Enhancements (Fase 2)

- [ ] Hot reload without restart
- [ ] Per-user feature flags
- [ ] Percentage-based rollouts
- [ ] Feature flag dashboard
- [ ] Automatic rollback on errors
- [ ] Flag expiration dates
- [ ] Audit log of flag changes

---

## References

- **Requirements**: `.kiro/specs/multi-provider-ai-architecture/requirements.md` (6.1-6.5)
- **Design**: `.kiro/specs/multi-provider-ai-architecture/design.md`
- **ADR**: `docs/adr/001-phase1-refactoring.md`
- **Tests**: `tests/unit/featureFlags.test.ts`
- **Implementation**: `config/featureFlags.ts`

---

## Support

Para questões ou problemas:
- Consulte testes em `tests/unit/featureFlags.test.ts`
- Leia ADR 001: `docs/adr/001-phase1-refactoring.md`
- Veja implementação em `config/featureFlags.ts`
