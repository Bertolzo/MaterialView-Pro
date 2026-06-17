import { MaterialSpecs, SurfaceContext } from '../shared/types';

const surfaceLabels: Record<string, string> = {
  floor: 'floor', wall: 'wall', ceiling: 'ceiling',
  'car-body': 'car body', furniture: 'furniture surface'
};

export function buildMaterialApplicationPrompt(material: MaterialSpecs, context: SurfaceContext): string {
  const surfaceLabel = surfaceLabels[context.surfaceType] || 'surface';
  return `
    Apply ${material.type} in ${material.color}, dimensions ${material.dimensions} to the ${surfaceLabel} in this image.
    
    INVARIANTS (MUST PRESERVE):
    - All shadows, reflections, and lighting must remain exactly as original.
    - Do not move, add, or remove any objects, or people.
    - All non-target surfaces must stay intact.
    - Maintain perspective and scale of the original image.
    - The new material must appear photorealistic and seamlessly integrated.
    
    Context: ${context.type}, shape: ${context.shape}, obstacles: ${context.hasObstacles}, lighting: ${context.lighting}, surface: ${context.surfaceType}.
    
    Return the edited image in base64 format.
  `;
}

export function buildSurfaceAnalysisPrompt(): string {
  return `
    Analyze this image and return JSON only with:
    - type: one of [living, kitchen, bathroom, bedroom, corridor, complex, garage]
    - shape: one of [rectangular, l-shape, t-shape, irregular]
    - hasObstacles: boolean
    - surfaceDetected: boolean
    - surfaceType: one of [floor, wall, ceiling, car-body, furniture]
    - lighting: one of [bright, dim, mixed]
    - confidence: number between 0 and 1
    Do not add any extra text. Return valid JSON.
  `;
}
