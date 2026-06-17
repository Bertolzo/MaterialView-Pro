// services/core/invariants/ObjectConsistencyValidator.ts
import { InvariantValidationResult } from '../types';

export class ObjectConsistencyValidator {
  async validate(originalObjects: any[], modifiedObjects: any[]): Promise<InvariantValidationResult> {
    const objectMatchResult = this.matchObjects(originalObjects, modifiedObjects);
    const scaleConsistency = this.validateScaleConsistency(originalObjects, modifiedObjects);
    const positionConsistency = this.validatePositionConsistency(originalObjects, modifiedObjects);
    
    const isValid = objectMatchResult.missingCount === 0 && 
                   objectMatchResult.addedCount === 0 &&
                   scaleConsistency && 
                   positionConsistency;
    
    return {
      isValid,
      score: this.calculateObjectConsistencyScore(objectMatchResult, scaleConsistency, positionConsistency),
      details: {
        originalObjectCount: originalObjects.length,
        modifiedObjectCount: modifiedObjects.length,
        missingObjects: objectMatchResult.missingObjects,
        addedObjects: objectMatchResult.addedObjects,
        scaleConsistency,
        positionConsistency
      }
    };
  }
  
  private matchObjects(original: any[], modified: any[]): {
    matches: number,
    missingCount: number,
    missingObjects: string[],
    addedCount: number,
    addedObjects: string[]
  } {
    const originalTypes = original.map(obj => obj.type || obj.class);
    const modifiedTypes = modified.map(obj => obj.type || obj.class);
    
    const missingObjects = originalTypes.filter(type => !modifiedTypes.includes(type));
    const addedObjects = modifiedTypes.filter(type => !originalTypes.includes(type));
    
    return {
      matches: Math.min(original.length, modified.length) - missingObjects.length,
      missingCount: missingObjects.length,
      missingObjects,
      addedCount: addedObjects.length,
      addedObjects
    };
  }
  
  private validateScaleConsistency(original: any[], modified: any[]): boolean {
    if (original.length === 0 || modified.length === 0) return true;
    
    // Calcula a média de escala dos objetos correspondentes
    let totalScaleDiff = 0;
    let validPairs = 0;
    
    for (const origObj of original) {
      const matchingModObj = modified.find(modObj => 
        (modObj.type || modObj.class) === (origObj.type || origObj.class)
      );
      
      if (matchingModObj && origObj.size && matchingModObj.size) {
        const scaleDiff = Math.abs(origObj.size - matchingModObj.size) / origObj.size;
        totalScaleDiff += scaleDiff;
        validPairs++;
      }
    }
    
    if (validPairs === 0) return true;
    
    const avgScaleDiff = totalScaleDiff / validPairs;
    return avgScaleDiff <= 0.1; // 10% de tolerância média
  }
  
  private validatePositionConsistency(original: any[], modified: any[]): boolean {
    if (original.length === 0 || modified.length === 0) return true;
    
    let totalPositionDiff = 0;
    let validPairs = 0;
    
    for (const origObj of original) {
      const matchingModObj = modified.find(modObj => 
        (modObj.type || modObj.class) === (origObj.type || origObj.class)
      );
      
      if (matchingModObj && origObj.position && matchingModObj.position) {
        const positionDiff = this.calculatePositionDifference(origObj.position, matchingModObj.position);
        totalPositionDiff += positionDiff;
        validPairs++;
      }
    }
    
    if (validPairs === 0) return true;
    
    const avgPositionDiff = totalPositionDiff / validPairs;
    return avgPositionDiff <= 0.05; // 5% de tolerância média na posição
  }
  
  private calculateObjectConsistencyScore(
    matchResult: any, 
    scaleConsistency: boolean, 
    positionConsistency: boolean
  ): number {
    let score = 1.0;
    
    // Penaliza objetos faltantes/adiccionados
    if (matchResult.missingCount > 0) score -= 0.3;
    if (matchResult.addedCount > 0) score -= 0.3;
    
    // Penaliza inconsistências de escala/posição
    if (!scaleConsistency) score -= 0.2;
    if (!positionConsistency) score -= 0.2;
    
    return Math.max(0, score);
  }
  
  private calculatePositionDifference(pos1: {x: number, y: number}, pos2: {x: number, y: number}): number {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
}