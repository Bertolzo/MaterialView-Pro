export interface ValidationResult {
  valid: boolean;
  error?: string;
  dimensions?: { width: number; height: number };
  fileSize?: number;
  aspectRatio?: number;
}

export async function validateInputImage(buffer: Buffer, format: 'jpeg' | 'png'): Promise<ValidationResult> {
  try {
    // Verificar tamanho máximo (10MB)
    if (buffer.length > 10 * 1024 * 1024) {
      return { valid: false, error: 'Imagem muito grande (máximo 10MB)' };
    }

    // Verificar se o buffer é válido
    if (!buffer || buffer.length === 0) {
      return { valid: false, error: 'Buffer de imagem vazio ou inválido' };
    }

    // Mock temporário para análise de imagem (substituir por sharp quando instalado)
    const mockMetadata = {
      width: 800,
      height: 600
    };

    // Dimensões mínimas e máximas
    if (mockMetadata.width < 400 || mockMetadata.height < 400) {
      return { valid: false, error: 'Imagem muito pequena (mínimo 400x400px)' };
    }

    if (mockMetadata.width > 4000 || mockMetadata.height > 4000) {
      return { valid: false, error: 'Imagem muito grande (máximo 4000x4000px)' };
    }

    const aspectRatio = mockMetadata.width / mockMetadata.height;
    if (aspectRatio < 0.5 || aspectRatio > 2.0) {
      return { valid: false, error: 'Proporção inválida (deve estar entre 0.5 e 2.0)' };
    }

    return {
      valid: true,
      dimensions: { width: mockMetadata.width, height: mockMetadata.height },
      fileSize: buffer.length,
      aspectRatio: aspectRatio
    };
    
  } catch (error) {
    return { 
      valid: false, 
      error: `Falha na validação: ${error instanceof Error ? error.message : 'Erro desconhecido'}` 
    };
  }
}

export function validateMaterialSpecs(specs: any): { valid: boolean; error?: string } {
  if (!specs || typeof specs !== 'object') {
    return { valid: false, error: 'Especificações do material inválidas' };
  }

  const required = ['id', 'name', 'category'];
  for (const field of required) {
    if (!specs[field] || typeof specs[field] !== 'string' || specs[field].trim().length === 0) {
      return { valid: false, error: `Campo obrigatório ausente: ${field}` };
    }
  }

  // Validações adicionais
  if (specs.scale !== undefined && (specs.scale <= 0 || specs.scale > 10)) {
    return { valid: false, error: 'Escala deve estar entre 0 e 10' };
  }

  if (specs.roughness !== undefined && (specs.roughness < 0 || specs.roughness > 1)) {
    return { valid: false, error: 'Rugosidade deve estar entre 0 e 1' };
  }

  if (specs.specularity !== undefined && (specs.specularity < 0 || specs.specularity > 1)) {
    return { valid: false, error: 'Especularidade deve estar entre 0 e 1' };
  }

  return { valid: true };
}