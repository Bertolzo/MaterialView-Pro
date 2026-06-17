// services/core/invariants/types.ts
export interface InvariantValidationResult {
  isValid: boolean;
  score: number; // 0.0 to 1.0
  details: Record<string, any>;
}

export interface IInvariantValidator {
  validate(...args: any[]): Promise<InvariantValidationResult>;
}

export interface InvariantConfig {
  shadowPreservation: {
    maxDirectionDiff: number; // graus
    maxIntensityDiff: number; // porcentagem
  };
  geometryIntegrity: {
    positionTolerance: number; // porcentagem
    orientationTolerance: number; // graus
    sizeTolerance: number; // porcentagem
  };
  objectConsistency: {
    allowObjectAddition: boolean;
    allowObjectRemoval: boolean;
    scaleTolerance: number; // porcentagem
    positionTolerance: number; // porcentagem
  };
}