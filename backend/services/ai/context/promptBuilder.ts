import { MaterialSpecs, RoomContext } from '../shared/types';

export function buildFloorReplacementPrompt(material: MaterialSpecs, context: RoomContext): string {
  return `
    Replace ONLY the floor in this image with ${material.type} in ${material.color}, dimensions ${material.dimensions}.
    
    INVARIANTS (MUST PRESERVE):
    - All shadows, reflections, and lighting must remain exactly as original.
    - Do not move, add, or remove any furniture, objects, or people.
    - Walls, corners, and ceiling geometry must stay intact.
    - Maintain perspective and scale of the original image.
    - The new floor must appear photorealistic and seamlessly integrated.
    
    Room context: ${context.type}, shape: ${context.shape}, obstacles: ${context.hasObstacles}, lighting: ${context.lighting}.
    
    Return the edited image in base64 format.
  `;
}

export function buildRoomAnalysisPrompt(): string {
  return `
    Analyze this room image and return JSON only with:
    - type: one of [living, kitchen, bathroom, bedroom, corridor, complex]
    - shape: one of [rectangular, l-shape, t-shape, irregular]
    - hasObstacles: boolean
    - floorPlaneDetected: boolean
    - lighting: one of [bright, dim, mixed]
    - confidence: number between 0 and 1
    Do not add any extra text. Return valid JSON.
  `;
}