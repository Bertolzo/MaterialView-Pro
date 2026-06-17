// services/core/invariants/GeometryIntegrityValidator.ts
import { InvariantValidationResult } from '../types';

export class GeometryIntegrityValidator {
  async validate(originalAnalysis: any, modifiedAnalysis: any): Promise<InvariantValidationResult> {
    // Compara as análises estruturais das duas imagens
    const wallConsistency = this.validateWallConsistency(originalAnalysis.walls, modifiedAnalysis.walls);
    const ceilingConsistency = this.validateCeilingConsistency(originalAnalysis.ceiling, modifiedAnalysis.ceiling);
    const doorConsistency = this.validateDoorConsistency(originalAnalysis.doors, modifiedAnalysis.doors);
    const windowConsistency = this.validateWindowConsistency(originalAnalysis.windows, modifiedAnalysis.windows);
    
    const isValid = wallConsistency && ceilingConsistency && doorConsistency && windowConsistency;
    
    return {
      isValid,
      score: isValid ? 1.0 : 0.0, // Binário para elementos estruturais
      details: {
        wallConsistency,
        ceilingConsistency, 
        doorConsistency,
        windowConsistency
      }
    };
  }
  
  private validateWallConsistency(originalWalls: any[], modifiedWalls: any[]): boolean {
    if (originalWalls.length !== modifiedWalls.length) return false;
    
    // Verifica que cada parede mantém posição e orientação similares
    for (let i = 0; i < originalWalls.length; i++) {
      const original = originalWalls[i];
      const modified = modifiedWalls[i];
      
      // Tolerância de 5% na posição e orientação
      const positionDiff = this.calculatePositionDifference(original.position, modified.position);
      const orientationDiff = Math.abs(original.orientation - modified.orientation);
      
      if (positionDiff > 0.05 || orientationDiff > 18) { // 18 graus = 5% de 360
        return false;
      }
    }
    
    return true;
  }
  
  private validateCeilingConsistency(originalCeiling: any, modifiedCeiling: any): boolean {
    if (!originalCeiling || !modifiedCeiling) return true; // Pode não ser detectado
    
    const heightDiff = Math.abs(originalCeiling.height - modifiedCeiling.height) / originalCeiling.height;
    const areaDiff = Math.abs(originalCeiling.area - modifiedCeiling.area) / originalCeiling.area;
    
    return heightDiff <= 0.05 && areaDiff <= 0.05; // 5% de tolerância
  }
  
  private validateDoorConsistency(originalDoors: any[], modifiedDoors: any[]): boolean {
    // Portas podem ter quantidade diferente (abertas/fechadas), mas posição deve ser consistente
    const matchedDoors = this.matchSimilarDoors(originalDoors, modifiedDoors);
    
    // Pelo menos 80% das portas devem ter correspondência
    return matchedDoors >= Math.min(originalDoors.length, modifiedDoors.length) * 0.8;
  }
  
  private validateWindowConsistency(originalWindows: any[], modifiedWindows: any[]): boolean {
    // Janelas não podem ser adicionadas/removidas arbitrariamente
    const countDiff = Math.abs(originalWindows.length - modifiedWindows.length);
    if (countDiff > 0) return false; // Zero tolerância para adição/remoção
    
    // Verifica posição e tamanho consistentes
    for (let i = 0; i < originalWindows.length; i++) {
      const original = originalWindows[i];
      const modified = modifiedWindows[i];
      
      const positionDiff = this.calculatePositionDifference(original.position, modified.position);
      const sizeDiff = Math.abs(original.size - modified.size) / original.size;
      
      if (positionDiff > 0.03 || sizeDiff > 0.1) { // 3% posição, 10% tamanho
        return false;
      }
    }
    
    return true;
  }
  
  private calculatePositionDifference(pos1: {x: number, y: number}, pos2: {x: number, y: number}): number {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
  
  private matchSimilarDoors(doors1: any[], doors2: any[]): number {
    let matches = 0;
    const matchedIndices = new Set<number>();
    
    for (const door1 of doors1) {
      for (let j = 0; j < doors2.length; j++) {
        if (!matchedIndices.has(j)) {
          const door2 = doors2[j];
          const positionDiff = this.calculatePositionDifference(door1.position, door2.position);
          
          if (positionDiff <= 0.08) { // 8% de tolerância para portas
            matches++;
            matchedIndices.add(j);
            break;
          }
        }
      }
    }
    
    return matches;
  }
}