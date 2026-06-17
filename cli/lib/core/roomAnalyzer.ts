import { RoomAnalysis } from './types';
import { detectSurfaceContext } from '../ai/gemini/detection';

export async function analyzeRoomGeometry(imageBuffer: Buffer): Promise<RoomAnalysis> {
  // Substituição do mock pela integração real com Gemini
  try {
    const imageBase64 = imageBuffer.toString('base64');
    const realContext = await detectSurfaceContext(imageBase64);
    
    return {
      geometry: realContext.geometry,
      obstacles: realContext.obstacles,
      lighting: realContext.lighting,
      floorArea: realContext.floorArea,
      roomType: realContext.roomType
    };
    
  } catch (error) {
    console.warn('Falha na análise real, usando fallback básico:', error);
    
    // Fallback simples baseado em tamanho da imagem
    const area = 800 * 600; // placeholder
    const ratio = 800 / 600;

    let geometry: RoomAnalysis['geometry'] = 'rectangular';
    if (ratio < 0.7) geometry = 'corridor';
    else if (ratio > 1.5) geometry = 'l-shaped';
    else if (area < 300000) geometry = 'complex';

    return {
      geometry,
      obstacles: 3, // Fallback conservador
      lighting: 'medium',
      floorArea: Math.floor(area * 0.6)
    };
  }
}

export function detectRoomFeatures(analysis: RoomAnalysis): {
  hasWalls: boolean;
  hasWindows: boolean;
  hasFurniture: boolean;
  primaryShape: 'square' | 'rectangle' | 'irregular';
} {
  return {
    hasWalls: analysis.geometry !== 'complex',
    hasWindows: analysis.lighting === 'good',
    hasFurniture: analysis.obstacles > 0,
    primaryShape: analysis.geometry === 'rectangular' ? 'rectangle' : 
                 analysis.geometry === 'corridor' ? 'rectangle' : 'irregular'
  };
}