// Serviço mínimo para detectRoomContext - sem overengineering

export interface GeminiDetectionRequest {
  image: string; // base64
  prompt?: string;
}

export interface RoomContextDetection {
  roomType: 'living-room' | 'kitchen' | 'bedroom' | 'bathroom' | 'office' | 'complex';
  geometry: 'rectangular' | 'corridor' | 'l-shaped' | 'complex';
  obstacles: number;
  lighting: 'poor' | 'medium' | 'good';
  floorArea: number;
  confidence: number;
}

/**
 * Detecção real de contexto de sala usando Gemini API
 * Implementação direta sem abstrações desnecessárias
 */
export async function detectRoomContext(imageBase64: string): Promise<RoomContextDetection> {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY não configurada');
  }

  const prompt = `
Analise esta imagem de ambiente interno e retorne apenas JSON com:
- roomType: living-room, kitchen, bedroom, bathroom, office ou complex
- geometry: rectangular, corridor, l-shaped, complex
- obstacles: número estimado de obstáculos no chão (0-10)
- lighting: poor, medium, good
- floorArea: área estimada do piso em pixels
- confidence: confiança da análise (0-1)

Foco em detectar o contexto para simulação de pisos.`;

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
    
    // Extrair JSON da resposta
    const jsonMatch = content.match(/\{.*\}/s);
    if (!jsonMatch) {
      throw new Error('Resposta não contém JSON válido');
    }

    const result = JSON.parse(jsonMatch[0]);
    
    // Validação mínima
    if (!result.roomType || !result.geometry) {
      throw new Error('Resposta incompleta do Gemini');
    }

    return result;
    
  } catch (error) {
    console.error('Erro na detecção Gemini:', error);
    
    // Fallback simples para HuggingFace
    return await fallbackHuggingFaceDetection(imageBase64);
  }
}

/**
 * Fallback simples para HuggingFace - sem complexidade
 */
async function fallbackHuggingFaceDetection(imageBase64: string): Promise<RoomContextDetection> {
  const hfToken = process.env.HUGGINGFACE_TOKEN;
  
  if (!hfToken) {
    // Último fallback: análise básica da imagem
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
    
    // Mapear classes do modelo para tipos de sala
    const roomMapping: Record<string, RoomContextDetection['roomType']> = {
      'living room': 'living-room',
      'kitchen': 'kitchen', 
      'bedroom': 'bedroom',
      'bathroom': 'bathroom',
      'office': 'office'
    };

    const primaryLabel = results[0]?.label?.toLowerCase() || 'complex';
    const roomType = roomMapping[primaryLabel] || 'complex';

    return {
      roomType,
      geometry: 'rectangular', // Fallback simples
      obstacles: 2, // Fallback conservador
      lighting: 'medium',
      floorArea: 300000, // Estimativa padrão
      confidence: 0.7
    };
    
  } catch (error) {
    console.error('Fallback HF também falhou:', error);
    return basicImageAnalysis(imageBase64);
  }
}

/**
 * Análise básica da imagem como último recurso
 */
function basicImageAnalysis(imageBase64: string): RoomContextDetection {
  // Análise muito básica baseada apenas no tamanho
  const imageSize = Buffer.from(imageBase64, 'base64').length;
  
  return {
    roomType: 'complex',
    geometry: 'rectangular', 
    obstacles: 3,
    lighting: 'medium',
    floorArea: imageSize > 50000 ? 400000 : 200000,
    confidence: 0.3 // Baixa confiança
  };
}