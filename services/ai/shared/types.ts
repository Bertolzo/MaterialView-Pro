export type SurfaceType = 'floor' | 'wall' | 'ceiling' | 'car-body' | 'furniture';

export interface SurfaceContext {
  type: 'living' | 'kitchen' | 'bathroom' | 'bedroom' | 'corridor' | 'complex' | 'garage' | 'exterior';
  shape: 'rectangular' | 'l-shape' | 't-shape' | 'irregular';
  hasObstacles: boolean;
  surfaceDetected: boolean;
  surfaceType: SurfaceType;
  lighting: 'bright' | 'dim' | 'mixed';
  confidence: number;
}

export interface MaterialSpecs {
  type: string;
  color: string;
  dimensions: string;
  finish?: string;
}

export interface FidelityReport {
  level: 0 | 1 | 2 | 3;
  details: string;
  confidence: number;
}