import { gatewayOrchestrator } from '../../../../src/services/gateway';
import { buildFloorReplacementPrompt } from '../context/promptBuilder';
import { MaterialSpecs, RoomContext } from '../shared/types';
import { optimizeImage } from '../shared/imageOptimizer';
import { classifyFidelity } from './fidelityClassifier';
import { CompositeInvariantValidator } from '../../core/invariants/CompositeInvariantValidator';

export async function applyMaterial(
  imageBase64: string,
  material: MaterialSpecs,
  roomContext: RoomContext
): Promise<{ editedImageBase64: string; fidelity: any }> {
  const invariantValidator = new CompositeInvariantValidator();
  
  // Otimiza imagem original para validação
  const originalOptimized = await optimizeImage(imageBase64);
  const prompt = buildFloorReplacementPrompt(material, roomContext);
  
  // Chama gateway para processamento
  const result = await gatewayOrchestrator.callWithFallback({
    image: Buffer.from(imageBase64, 'base64'),
    prompt,
    maxTokens: 500
  });
  
  let editedImageBase64 = result.text;
  if (editedImageBase64.startsWith('http')) {
    const resp = await fetch(editedImageBase64);
    const arrayBuffer = await resp.arrayBuffer();
    editedImageBase64 = Buffer.from(arrayBuffer).toString('base64');
  }
  
  // 🆕 Valida invariantes antes de retornar
  try {
    const compliance = await invariantValidator.validateAll(
      originalOptimized,
      editedImageBase64,
      roomContext,
      roomContext, // análise modificada será igual por enquanto (mock)
      [], // mock de objetos originais
      []  // mock de objetos modificados
    );
    
    if (!compliance.overall.isValid) {
      console.warn('[Invariant] Violation detected:', compliance);
      throw new Error(`Invariant violation detected. Score: ${compliance.overall.score}`);
    }
    
    console.log('[Invariant] Validation passed with score:', compliance.overall.score);
  } catch (error) {
    console.warn('[Invariant] Validation skipped due to error:', error.message);
  }
  
  // Classificação de fidelidade tradicional
  const fidelity = await classifyFidelity(originalOptimized, editedImageBase64);
  
  return { editedImageBase64, fidelity };
}