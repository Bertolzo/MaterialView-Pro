export interface GeminiDetectionRequest {
  image: string;
  prompt?: string;
}

export type SurfaceType = 'floor' | 'wall' | 'ceiling' | 'car-body' | 'furniture';

export interface SurfaceContextDetection {
  roomType: 'living-room' | 'kitchen' | 'bedroom' | 'bathroom' | 'office' | 'garage' | 'complex';
  geometry: 'rectangular' | 'corridor' | 'l-shaped' | 'complex';
  obstacles: number;
  lighting: 'poor' | 'medium' | 'good';
  surfaceArea: number;
  targetSurface: SurfaceType;
  confidence: number;
}

export async function detectSurfaceContext(imageBase64: string): Promise<SurfaceContextDetection> {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY não configurada');
  }

  const prompt = `
Analise esta imagem e retorne apenas JSON com:
- roomType: living-room, kitchen, bedroom, bathroom, office, garage ou complex
- geometry: rectangular, corridor, l-shaped, complex
- obstacles: número estimado de obstáculos na superfície alvo (0-10)
- lighting: poor, medium, good
- surfaceArea: área estimada da superfície alvo em pixels
- targetSurface: floor, wall, ceiling, car-body ou furniture (qual superfície o usuário provavelmente quer modificar)
- confidence: confiança da análise (0-1)`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: 'image/jpeg',
                data: imageBase64
              }
            }
          ]
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.candidates[0].content.parts[0].text;
    
    const jsonMatch = content.match(/\{.*\}/s);
    if (!jsonMatch) {
      throw new Error('Resposta não contém JSON válido');
    }

    const result = JSON.parse(jsonMatch[0]);
    
    if (!result.roomType || !result.geometry) {
      throw new Error('Resposta incompleta do Gemini');
    }

    return result;
    
  } catch (error) {
    console.error('Erro na detecção Gemini:', error);
    return await fallbackHuggingFaceDetection(imageBase64);
  }
}

async function fallbackHuggingFaceDetection(imageBase64: string): Promise<SurfaceContextDetection> {
  const hfToken = process.env.HUGGINGFACE_TOKEN;
  
  if (!hfToken) {
    return basicImageAnalysis(imageBase64);
  }

  try {
    const response = await fetch(
      'https://api-inference.huggingface.co/models/google/vit-base-patch16-224',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${hfToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: imageBase64
        })
      }
    );

    if (!response.ok) {
      throw new Error(`HF API error: ${response.status}`);
    }

    const results = await response.json();
    
    const roomMapping: Record<string, SurfaceContextDetection['roomType']> = {
      'living room': 'living-room',
      'kitchen': 'kitchen', 
      'bedroom': 'bedroom',
      'bathroom': 'bathroom',
      'office': 'office',
      'garage': 'garage'
    };

    const primaryLabel = results[0]?.label?.toLowerCase() || 'complex';
    const roomType = roomMapping[primaryLabel] || 'complex';

    return {
      roomType,
      geometry: 'rectangular',
      obstacles: 2,
      lighting: 'medium',
      surfaceArea: 300000,
      targetSurface: 'floor',
      confidence: 0.7
    };
    
  } catch (error) {
    console.error('Fallback HF também falhou:', error);
    return basicImageAnalysis(imageBase64);
  }
}

function basicImageAnalysis(imageBase64: string): SurfaceContextDetection {
  const imageSize = Buffer.from(imageBase64, 'base64').length;
  
  return {
    roomType: 'complex',
    geometry: 'rectangular', 
    obstacles: 3,
    lighting: 'medium',
    surfaceArea: imageSize > 50000 ? 400000 : 200000,
    targetSurface: 'floor',
    confidence: 0.3
  };
}
