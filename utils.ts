export function parseSimulationParams(params: any) {
  // Por enquanto, apenas retorna os parâmetros sem modificação
  return params;
}

export function optimizeImage(imageData: string | File): Promise<string> {
  return new Promise((resolve) => {
    if (typeof imageData === 'string') {
      resolve(imageData);
    } else {
      const url = URL.createObjectURL(imageData);
      resolve(url);
    }
  });
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function urlToBase64(url: string): Promise<string> {
  // Mock temporário para não quebrar
  return Promise.resolve(`data:image/jpeg;base64,mock-base64-${Date.now()}`);
}