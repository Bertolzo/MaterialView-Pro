/**
 * featureFlags.ts
 * 
 * Módulo centralizado de feature flags com validação de tipos.
 * 
 * Este módulo consolida todas as verificações de process.env espalhadas pelo código,
 * fornecendo uma interface type-safe para configuração de funcionalidades.
 * 
 * @module featureFlags
 * @see .kiro/specs/multi-provider-ai-architecture/design.md
 * 
 * Requirements: 6.1 - Centralização de Feature Flags
 */

'use strict';

/**
 * Interface que define todas as feature flags disponíveis no sistema.
 * 
 * @interface FeatureFlags
 * @property {boolean} USE_SELF_AUDIT - Habilita pipeline de auto-auditoria de qualidade
 * @property {'gemini' | 'hf' | 'hybrid'} GATEWAY_MODE - Modo de roteamento de provedores
 * @property {boolean} USE_HF_PRIMARY - Usa Hugging Face como provedor primário
 * @property {boolean} USE_LEGACY_MODE - Usa implementação legada (para rollback)
 */
export interface FeatureFlags {
  USE_SELF_AUDIT: boolean;
  GATEWAY_MODE: 'gemini' | 'hf' | 'hybrid';
  USE_HF_PRIMARY: boolean;
  USE_LEGACY_MODE: boolean;
}

/**
 * Valores padrão para feature flags quando não configuradas via env vars.
 */
const DEFAULT_FLAGS: FeatureFlags = {
  USE_SELF_AUDIT: false,
  GATEWAY_MODE: 'gemini',
  USE_HF_PRIMARY: false,
  USE_LEGACY_MODE: false
};

/**
 * Cache de flags para evitar leituras repetidas de process.env.
 * Inicializado como null e populado na primeira chamada de getFeatureFlags().
 */
let cachedFlags: FeatureFlags | null = null;

/**
 * Valida o valor de GATEWAY_MODE e retorna um valor válido.
 * 
 * @param mode - Valor a ser validado
 * @returns Valor validado ou valor padrão se inválido
 */
function validateGatewayMode(mode?: string): 'gemini' | 'hf' | 'hybrid' {
  if (mode === 'gemini' || mode === 'hf' || mode === 'hybrid') {
    return mode;
  }
  return DEFAULT_FLAGS.GATEWAY_MODE;
}

/**
 * Carrega e retorna todas as feature flags do sistema.
 * 
 * As flags são carregadas de variáveis de ambiente na primeira chamada
 * e então cacheadas para chamadas subsequentes.
 * 
 * Variáveis de ambiente lidas:
 * - ENABLE_SELF_AUDIT: 'true' para habilitar self-audit pipeline
 * - GATEWAY_MODE: 'gemini' | 'hf' | 'hybrid' para modo de roteamento
 * - USE_LEGACY_MODE: 'true' para usar implementação legada
 * 
 * @returns Objeto FeatureFlags com todas as flags configuradas
 * 
 * @example
 * ```typescript
 * const flags = getFeatureFlags();
 * if (flags.USE_SELF_AUDIT) {
 *   // Usar pipeline de self-audit
 * }
 * ```
 */
export function getFeatureFlags(): FeatureFlags {
  if (cachedFlags) return cachedFlags;
  
  const gatewayMode = validateGatewayMode(process.env.GATEWAY_MODE);
  
  const flags: FeatureFlags = {
    USE_SELF_AUDIT: process.env.ENABLE_SELF_AUDIT === 'true',
    GATEWAY_MODE: gatewayMode,
    USE_HF_PRIMARY: gatewayMode === 'hf',
    USE_LEGACY_MODE: process.env.USE_LEGACY_MODE === 'true'
  };
  
  cachedFlags = flags;
  return flags;
}

/**
 * Verifica se uma feature flag específica está habilitada.
 * 
 * @param flag - Nome da flag a verificar
 * @returns true se a flag está habilitada, false caso contrário
 * 
 * @example
 * ```typescript
 * if (isFeatureEnabled('USE_SELF_AUDIT')) {
 *   // Self-audit está habilitado
 * }
 * ```
 */
export function isFeatureEnabled(flag: keyof FeatureFlags): boolean {
  const flags = getFeatureFlags();
  return Boolean(flags[flag]);
}

/**
 * Retorna o modo de gateway configurado.
 * 
 * @returns Modo de gateway: 'gemini', 'hf' ou 'hybrid'
 * 
 * @example
 * ```typescript
 * const mode = getGatewayMode();
 * if (mode === 'hybrid') {
 *   // Usar modo híbrido
 * }
 * ```
 */
export function getGatewayMode(): 'gemini' | 'hf' | 'hybrid' {
  return getFeatureFlags().GATEWAY_MODE;
}

/**
 * Reseta o cache de flags.
 * 
 * Esta função é destinada apenas para uso em testes, permitindo
 * que os testes modifiquem process.env e recarreguem as flags.
 * 
 * @internal
 * @example
 * ```typescript
 * // Em um teste
 * process.env.ENABLE_SELF_AUDIT = 'true';
 * _resetCache();
 * const flags = getFeatureFlags(); // Recarrega com novo valor
 * ```
 */
export function _resetCache(): void {
  cachedFlags = null;
}
