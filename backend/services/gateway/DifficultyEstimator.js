// DifficultyEstimator.js
// Estima a dificuldade de uma requisição de simulação de piso.
// Inspirado no conceito DAAO: classificar tarefas por complexidade
// para rotear para o provedor mais adequado.

/**
 * Níveis de dificuldade:
 * - 'low'    → imagem pequena, prompt simples → provedor gratuito (costTier 0)
 * - 'medium' → imagem média, prompt moderado → provedor intermediário (costTier 1)
 * - 'high'   → imagem grande, prompt complexo → provedor de maior qualidade (costTier 2+)
 */

const THRESHOLDS = {
  // Tamanho do base64 em caracteres (aprox. 4/3 do tamanho em bytes)
  IMAGE_SMALL: 200_000,   // ~150KB
  IMAGE_LARGE: 800_000,   // ~600KB

  // Comprimento do prompt gerado
  PROMPT_SHORT: 80,
  PROMPT_LONG: 200,
};

/**
 * Estima a dificuldade de uma requisição.
 * @param {string} imageBase64
 * @param {{ type: string, color: string, dimensions: string }} material
 * @param {object} context - RoomContext
 * @returns {{ difficulty: 'low'|'medium'|'high', score: number, reasons: string[] }}
 */
export function estimateDifficulty(imageBase64, material, context) {
  const reasons = [];
  let score = 0;

  // Fator 1: tamanho da imagem
  const imageSize = imageBase64.length;
  if (imageSize > THRESHOLDS.IMAGE_LARGE) {
    score += 2;
    reasons.push(`large_image(${Math.round(imageSize / 1000)}KB)`);
  } else if (imageSize > THRESHOLDS.IMAGE_SMALL) {
    score += 1;
    reasons.push(`medium_image(${Math.round(imageSize / 1000)}KB)`);
  }

  // Fator 2: complexidade do material (dimensões não-padrão = mais difícil)
  const dims = material.dimensions || '';
  const isNonStandard = !['60x60cm', '30x30cm', '90x90cm'].includes(dims);
  if (isNonStandard) {
    score += 1;
    reasons.push(`non_standard_dimensions(${dims})`);
  }

  // Fator 3: número de objetos no contexto (mais objetos = cena mais complexa)
  const objectCount = context?.objects?.length || 0;
  if (objectCount > 5) {
    score += 2;
    reasons.push(`complex_scene(${objectCount}_objects)`);
  } else if (objectCount > 2) {
    score += 1;
    reasons.push(`moderate_scene(${objectCount}_objects)`);
  }

  // Fator 4: iluminação desconhecida = mais difícil de preservar invariantes
  if (context?.lighting?.direction === 'unknown') {
    score += 1;
    reasons.push('unknown_lighting');
  }

  // Classificação final
  let difficulty;
  if (score <= 1) {
    difficulty = 'low';
  } else if (score <= 3) {
    difficulty = 'medium';
  } else {
    difficulty = 'high';
  }

  return { difficulty, score, reasons };
}

/**
 * Retorna o costTier mínimo recomendado para a dificuldade estimada.
 * Tarefas difíceis preferem provedores de maior qualidade (costTier mais alto).
 * Tarefas fáceis preferem provedores gratuitos (costTier 0).
 */
export function getMinCostTierForDifficulty(difficulty) {
  switch (difficulty) {
    case 'high':   return 1; // Pula provedores gratuitos para tarefas difíceis
    case 'medium': return 0; // Tenta gratuitos primeiro, mas aceita pagos
    case 'low':
    default:       return 0; // Sempre tenta gratuitos primeiro
  }
}
