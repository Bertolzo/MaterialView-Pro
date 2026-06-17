// Core Types - Interfaces independentes de UI
export interface RenderRequest {
  imageBuffer: Buffer;
  imageFormat: 'jpeg' | 'png';
  materialSpecs: MaterialSpecs;
  timeoutMs?: number;
}

export interface MaterialSpecs {
  id: string;
  name: string;
  category: string;
  pattern?: string;
  scale?: number;
  roughness?: number; // 0-1
  specularity?: number; // 0-1
}

export interface RenderResult {
  success: boolean;
  imageBase64?: string;
  fidelityLevel: FidelityLevel;
  processingTimeMs: number;
  error?: {
    type: 'timeout' | 'api_error' | 'class_mutation' | 'validation_failed';
    message: string;
    details?: any;
  };
  metrics?: {
    roomDetectionTime: number;
    renderingTime: number;
    validationTime: number;
    cacheHit?: boolean;
  };
}

export type FidelityLevel = 0 | 1 | 2 | 3;

export type SurfaceType = 'floor' | 'wall' | 'ceiling' | 'car-body' | 'furniture';

export interface SurfaceAnalysis {
  geometry: 'rectangular' | 'l-shaped' | 'corridor' | 'complex';
  obstacles: number;
  lighting: 'good' | 'medium' | 'poor';
  surfaceArea: number;
  surfaceType: SurfaceType;
  mask?: string;
}

export interface BatchResult {
  total: number;
  successful: number;
  failed: number;
  averageTime: number;
  fidelityDistribution: Record<FidelityLevel, number>;
  errors: Array<{
    file: string;
    error: string;
    fidelity?: FidelityLevel;
  }>;
  details: RenderResult[];
}

export interface GatewayRenderResult {
  success: boolean;
  image?: string;
  error?: string;
  provider?: string;
}