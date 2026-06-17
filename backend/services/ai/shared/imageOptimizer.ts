export async function optimizeImage(
  input: string | File,
  maxSize = 1536
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let width = img.width;
      let height = img.height;
      if (width > maxSize) {
        height = (height * maxSize) / width;
        width = maxSize;
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      // Retorna apenas o base64 sem o prefixo "data:image/jpeg;base64,"
      const base64 = canvas.toDataURL('image/jpeg', 0.9).split(',')[1];
      resolve(base64);
    };
    img.onerror = reject;
    if (typeof input === 'string') {
      img.src = input.startsWith('data:') ? input : `data:image/jpeg;base64,${input}`;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => (img.src = e.target?.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(input);
    }
  });
}