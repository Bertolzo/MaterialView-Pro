export interface RoomContext {
  type: 'living' | 'kitchen' | 'bathroom' | 'bedroom' | 'corridor' | 'complex';
  shape: 'rectangular' | 'l-shape' | 't-shape' | 'irregular';
  hasObstacles: boolean;
  floorPlaneDetected: boolean;
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