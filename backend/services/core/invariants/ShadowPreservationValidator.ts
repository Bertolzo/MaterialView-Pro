// services/core/invariants/ShadowPreservationValidator.ts
import { InvariantValidationResult } from '../types';

export class ShadowPreservationValidator {
  async validate(original: string, modified: string): Promise<InvariantValidationResult> {
    const shadowDirectionDiff = await this.calculateShadowDirectionDifference(original, modified);
    const shadowIntensityDiff = await this.calculateShadowIntensityDifference(original, modified);
    
    const maxDirectionDiff = 15; // graus
    const maxIntensityDiff = 0.05; // 5%
    
    const isDirectionValid = shadowDirectionDiff <= maxDirectionDiff;
    const isIntensityValid = shadowIntensityDiff <= maxIntensityDiff;
    
    return {
      isValid: isDirectionValid && isIntensityValid,
      score: Math.max(0, 1 - (shadowDirectionDiff / maxDirectionDiff) - (shadowIntensityDiff / maxIntensityDiff)),
      details: {
        shadowDirectionDifference: shadowDirectionDiff,
        shadowIntensityDifference: shadowIntensityDiff,
        thresholdExceeded: !isDirectionValid ? 'direction' : !isIntensityValid ? 'intensity' : null
      }
    };
  }
  
  private async calculateShadowDirectionDifference(original: string, modified: string): Promise<number> {
    // Implementação simplificada baseada em análise de gradiente
    // Em produção, usar algoritmo de detecção de direção de sombras
    const originalGradient = await this.analyzeShadowGradient(original);
    const modifiedGradient = await this.analyzeShadowGradient(modified);
    
    const angleDiff = Math.abs(originalGradient.angle - modifiedGradient.angle);
    return Math.min(angleDiff, 180 - angleDiff); // Menor ângulo entre direções
  }
  
  private async calculateShadowIntensityDifference(original: string, modified: string): Promise<number> {
    const originalIntensity = await this.analyzeShadowIntensity(original);
    const modifiedIntensity = await this.analyzeShadowIntensity(modified);
    
    return Math.abs(originalIntensity - modifiedIntensity) / originalIntensity;
  }
  
  private async analyzeShadowGradient(imageData: string): Promise<{angle: number, magnitude: number}> {
    // Mock implementation - substituir por algoritmo real de detecção de gradiente
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        // Análise simplificada baseada no código do fidelityClassifier
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        
        // Simulação: analisa variação de brilho nos quadrantes
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const quadrantIntensities = this.getQuadrantIntensities(imageData);
        
        // Estimativa de direção baseada na diferença entre quadrantes
        const horizontalDiff = quadrantIntensities.right - quadrantIntensities.left;
        const verticalDiff = quadrantIntensities.bottom - quadrantIntensities.top;
        
        const angle = Math.atan2(verticalDiff, horizontalDiff) * (180 / Math.PI);
        const magnitude = Math.sqrt(horizontalDiff ** 2 + verticalDiff ** 2);
        
        resolve({ angle: (angle + 360) % 360, magnitude });
      };
      img.src = imageData.startsWith('data:') ? imageData : `data:image/jpeg;base64,${imageData}`;
    });
  }
  
  private async analyzeShadowIntensity(imageData: string): Promise<number> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const intensity = this.calculateAverageIntensity(imageData);
        resolve(intensity);
      };
      img.src = imageData.startsWith('data:') ? imageData : `data:image/jpeg;base64,${imageData}`;
    });
  }
  
  private getQuadrantIntensities(imageData: ImageData) {
    const width = imageData.width;
    const height = imageData.height;
    const halfWidth = Math.floor(width / 2);
    const halfHeight = Math.floor(height / 2);
    
    const quadrants = {
      top: this.getRegionIntensity(imageData, 0, 0, width, halfHeight),
      bottom: this.getRegionIntensity(imageData, 0, halfHeight, width, height),
      left: this.getRegionIntensity(imageData, 0, 0, halfWidth, height),
      right: this.getRegionIntensity(imageData, halfWidth, 0, width, height)
    };
    
    return quadrants;
  }
  
  private getRegionIntensity(imageData: ImageData, x: number, y: number, width: number, height: number): number {
    let total = 0;
    let count = 0;
    
    for (let i = y; i < height; i++) {
      for (let j = x; j < width; j++) {
        const index = (i * imageData.width + j) * 4;
        const r = imageData.data[index];
        const g = imageData.data[index + 1];
        const b = imageData.data[index + 2];
        const intensity = (r + g + b) / 3;
        total += intensity;
        count++;
      }
    }
    
    return count > 0 ? total / count : 0;
  }
  
  private calculateAverageIntensity(imageData: ImageData): number {
    let total = 0;
    for (let i = 0; i < imageData.data.length; i += 4) {
      const r = imageData.data[i];
      const g = imageData.data[i + 1];
      const b = imageData.data[i + 2];
      total += (r + g + b) / 3;
    }
    return total / (imageData.data.length / 4);
  }
}