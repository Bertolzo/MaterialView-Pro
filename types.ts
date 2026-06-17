// types.ts - Tipos básicos para viabilizar execução
export interface ImageAnalysis {
  id: string;
  url: string;
  dimensions: { width: number; height: number };
  confidence: number;
}

export interface Material {
  id: string;
  name: string;
  category: string;
  imageUrl: string;
  price: number;
}

export interface Point {
  x: number;
  y: number;
}

export type ProcessingState = 'idle' | 'uploading' | 'analyzing' | 'ready' | 'error';

export interface SimulationHistory {
  id: string;
  timestamp: number;
  material: Material;
  originalImage: string;
  resultImage: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}