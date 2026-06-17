import { gatewayOrchestrator } from '../../../../src/services/gateway';
import { buildRoomAnalysisPrompt } from './promptBuilder';
import { RoomContext } from '../shared/types';
import { optimizeImage } from '../shared/imageOptimizer';

export async function analyzeRoom(imageBase64: string): Promise<RoomContext> {
  const optimizedBuffer = await optimizeImage(Buffer.from(imageBase64, 'base64'));
  const prompt = buildRoomAnalysisPrompt();
  
  const result = await gatewayOrchestrator.callWithFallback({
    image: optimizedBuffer,
    prompt,
    maxTokens: 300
  });
  
  try {
    const jsonMatch = result.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as RoomContext;
    }
    throw new Error('No JSON found');
  } catch (error) {
    console.warn('[RoomAnalyzer] Fallback to default context', error);
    return {
      type: 'complex',
      shape: 'irregular',
      hasObstacles: true,
      floorPlaneDetected: false,
      lighting: 'mixed',
      confidence: 0.5
    };
  }
}
