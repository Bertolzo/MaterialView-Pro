export async function optimizeImage(input: File | string): Promise<string> {
  if (typeof input === 'string') {
    // Se já é base64, apenas retorna
    return input.replace(/^data:image\/[^;]+;base64,/, '');
  }
  
  // Para arquivos, converte para base64
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.replace(/^data:image\/[^;]+;base64,/, ''));
    };
    reader.onerror = reject;
    reader.readAsDataURL(input);
  });
}