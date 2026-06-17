// services/core/invariants/index.ts
export { ShadowPreservationValidator } from './ShadowPreservationValidator';
export { GeometryIntegrityValidator } from './GeometryIntegrityValidator';
export { ObjectConsistencyValidator } from './ObjectConsistencyValidator';
export { CompositeInvariantValidator } from './CompositeInvariantValidator';
export type { InvariantValidationResult, IInvariantValidator, InvariantConfig } from './types';