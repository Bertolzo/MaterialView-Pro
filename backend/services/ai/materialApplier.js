// backend/services/ai/materialApplier.js
import { requestSimulation } from '../gateway/index.js';

/**
 * Aplica o material à imagem usando o gateway com cascata de provedores.
 * Cascata: WaveSpeedAI → Zhipu CogView → fallback local textual.
 * @param {string} imageBase64
 * @param {{ type: string, color: string, dimensions: string }} material
 * @param {object} context - RoomContext
 * @returns {Promise<{ editedImageBase64: string|null, fidelity: number, context: object|null, fallback?: boolean, fallbackDescription?: string, provider?: string }>}
 */
export async function applyMaterial(imageBase64, material, context) {
  const result = await requestSimulation(imageBase64, material, context);

  if (result.fallback) {
    return {
      editedImageBase64: null,
      fidelity: 0.0,
      context: null,
      fallback: true,
      fallbackDescription: result.fallbackDescription,
    };
  }

  return {
    editedImageBase64: result.editedImageBase64,
    fidelity: result.fidelity,
    context,
    fallback: false,
    provider: result.provider,
  };
}
