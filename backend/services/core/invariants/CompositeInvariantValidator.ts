// services/core/invariants/CompositeInvariantValidator.ts
import { ShadowPreservationValidator } from './ShadowPreservationValidator';
import { GeometryIntegrityValidator } from './GeometryIntegrityValidator';
import { ObjectConsistencyValidator } from './ObjectConsistencyValidator';
import { InvariantValidationResult } from '../types';

export class CompositeInvariantValidator {
  private shadowValidator = new ShadowPreservationValidator();
  private geometryValidator = new GeometryIntegrityValidator();
  private objectValidator = new ObjectConsistencyValidator();

  async validateAll(
    originalImage: string,
    modifiedImage: string,
    originalAnalysis: any,
    modifiedAnalysis: any,
    originalObjects: any[],
    modifiedObjects: any[]
  ): Promise<{
    overall: InvariantValidationResult;
    shadow: InvariantValidationResult;
    geometry: InvariantValidationResult;
    object: InvariantValidationResult;
  }> {
    const [shadowResult, geometryResult, objectResult] = await Promise.all([
      this.shadowValidator.validate(originalImage, modifiedImage),
      this.geometryValidator.validate(originalAnalysis, modifiedAnalysis),
      this.objectValidator.validate(originalObjects, modifiedObjects)
    ]);

    const overallResult = this.combineResults([shadowResult, geometryResult, objectResult]);

    return {
      overall: overallResult,
      shadow: shadowResult,
      geometry: geometryResult,
      object: objectResult
    };
  }

  private combineResults(results: InvariantValidationResult[]): InvariantValidationResult {
    const isValid = results.every(result => result.isValid);
    
    // Score combinado (média ponderada)
    const weights = [0.4, 0.4, 0.2]; // shadow, geometry, object
    const weightedScore = results.reduce((total, result, index) => {
      return total + (result.score * weights[index]);
    }, 0);

    return {
      isValid,
      score: weightedScore,
      details: {
        individualResults: results.map((result, index) => ({
          validator: ['shadow', 'geometry', 'object'][index],
          isValid: result.isValid,
          score: result.score
        })),
        passingValidators: results.filter(r => r.isValid).length,
        totalValidators: results.length
      }
    };
  }

  // Método para validação rápida (apenas verifica se todas as invariantes são respeitadas)
  async validateQuick(
    originalImage: string,
    modifiedImage: string,
    originalAnalysis: any,
    modifiedAnalysis: any,
    originalObjects: any[],
    modifiedObjects: any[]
  ): Promise<boolean> {
    const result = await this.validateAll(
      originalImage, modifiedImage, originalAnalysis, modifiedAnalysis, originalObjects, modifiedObjects
    );
    return result.overall.isValid;
  }

  // Método para obter detalhes da violação (útil para debugging)
  async getViolationDetails(
    originalImage: string,
    modifiedImage: string,
    originalAnalysis: any,
    modifiedAnalysis: any,
    originalObjects: any[],
    modifiedObjects: any[]
  ): Promise<{
    violatedInvariants: string[];
    suggestions: string[];
  }> {
    const result = await this.validateAll(
      originalImage, modifiedImage, originalAnalysis, modifiedAnalysis, originalObjects, modifiedObjects
    );

    const violatedInvariants: string[] = [];
    const suggestions: string[] = [];

    if (!result.shadow.isValid) {
      violatedInvariants.push('Preservação de Sombras/Iluminação');
      suggestions.push('Ajustar prompt para manter direção e intensidade das sombras originais');
    }

    if (!result.geometry.isValid) {
      violatedInvariants.push('Integridade Geométrica');
      suggestions.push('Reforçar prompt sobre manutenção de paredes, teto e janelas');
    }

    if (!result.object.isValid) {
      violatedInvariants.push('Consistência de Objetos');
      suggestions.push('Adicionar restrição explícita sobre não adicionar/remover móveis');
    }

    return {
      violatedInvariants,
      suggestions
    };
  }
}