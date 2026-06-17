import { MaterialSpecs } from './ai/shared/types';

export const materialService = {
  fetchMaterials: async (): Promise<MaterialSpecs[]> => {
    return [
      { 
        id: '1', 
        name: 'Cerâmica Bege', 
        type: 'ceramic', 
        color: 'bege', 
        dimensions: '60x60', 
        price: 45,
        texture: 'matte',
        pattern: 'solid'
      },
      { 
        id: '2', 
        name: 'Porcelanato Branco', 
        type: 'porcelain', 
        color: 'white', 
        dimensions: '60x60', 
        price: 65,
        texture: 'glossy',
        pattern: 'marble'
      },
      { 
        id: '3', 
        name: 'Madeira Clara', 
        type: 'wood', 
        color: 'light-wood', 
        dimensions: '20x120', 
        price: 85,
        texture: 'wood-grain',
        pattern: 'striped'
      }
    ];
  },
  getMaterials: () => Promise.resolve([]),
  applyMaterial: (material: any, image: string) => Promise.resolve(image),
  getMaterialsByCategory: (category: string) => Promise.resolve({ materials: [] }),
  searchMaterials: (query: string) => Promise.resolve({ materials: [] })
};
