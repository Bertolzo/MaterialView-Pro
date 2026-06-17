import { FidelityReport } from '../shared/types';

export async function classifyFidelity(original: string, rendered: string): Promise<FidelityReport> {
  const originalHash = await getPerceptualHash(original);
  const renderedHash = await getPerceptualHash(rendered);
  const difference = hammingDistance(originalHash, renderedHash);
  
  if (difference < 10) return { level: 0, details: 'High fidelity', confidence: 0.9 };
  if (difference < 25) return { level: 1, details: 'Moderate fidelity', confidence: 0.7 };
  if (difference < 50) return { level: 2, details: 'Low fidelity', confidence: 0.5 };
  return { level: 3, details: 'Rejected - possible hallucination', confidence: 0.3 };
}

async function getPerceptualHash(imageData: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 8;
      canvas.height = 8;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Could not create canvas context'));
        return;
      }
      
      // Redimensiona para 8x8
      ctx.drawImage(img, 0, 0, 8, 8);
      
      // Converte para escala de cinza
      const imageData = ctx.getImageData(0, 0, 8, 8);
      const grayscaleData = new Array(64);
      
      for (let i = 0; i < 64; i++) {
        const r = imageData.data[i * 4];
        const g = imageData.data[i * 4 + 1];
        const b = imageData.data[i * 4 + 2];
        // Fórmula de luminância padrão
        grayscaleData[i] = 0.299 * r + 0.587 * g + 0.114 * b;
      }
      
      // Calcula a média
      const avg = grayscaleData.reduce((a, b) => a + b, 0) / 64;
      
      // Gera o hash
      let hash = '';
      for (let i = 0; i < 64; i++) {
        hash += grayscaleData[i] > avg ? '1' : '0';
      }
      
      resolve(hash);
    };
    img.onerror = reject;
    img.src = imageData.startsWith('data:') ? imageData : `data:image/jpeg;base64,${imageData}`;
  });
}

function hammingDistance(a: string, b: string): number {
  let dist = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) dist++;
  }
  return dist;
}