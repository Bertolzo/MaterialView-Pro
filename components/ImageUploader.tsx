
import React, { useRef, useState, useEffect } from 'react';

interface ImageUploaderProps {
  onImageSelected: (file: File) => void;
  isLoading?: boolean;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageSelected, isLoading }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cleanup preview URL on unmount or change
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isLoading) setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (isLoading) return;
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processImage(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isLoading) return;
    if (e.target.files && e.target.files.length > 0) {
      processImage(e.target.files[0]);
    }
    e.target.value = '';
  };

  // FUNÇÃO SIMPLIFICADA: Aceita qualquer imagem
  const processImage = (file: File) => {
    if (!file.type.startsWith('image/')) {
      console.warn("Formato não suportado (apenas imagens):", file.type);
      return;
    }
    
    // Cria preview imediato (UI responsiva)
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    
    // Passa direto para processamento (sem validação bloqueante)
    onImageSelected(file);
  };

  return (
    <div
      className={`relative border-2 border-dashed rounded-xl p-8 transition-all duration-300 flex flex-col items-center justify-center min-h-[300px] cursor-pointer group
      ${isDragging 
        ? 'border-brand-accent bg-brand-accent/10' 
        : 'border-brand-muted/30 hover:border-brand-accent/50 hover:bg-brand-card'
      }
      ${isLoading ? 'opacity-50 pointer-events-none' : ''}
      `}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => !isLoading && fileInputRef.current?.click()}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/*"
        disabled={isLoading}
      />
      
      {previewUrl ? (
        // PREVIEW DA IMAGEM
        <div className="relative w-full max-w-lg h-64 flex flex-col items-center">
          <img 
            src={previewUrl} 
            alt="Pré-visualização" 
            className="w-full h-full object-contain rounded-lg shadow-lg bg-black/40"
          />
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 rounded-b-lg">
            <p className="text-white text-sm text-center font-medium">
              <i className="fas fa-check-circle text-green-400 mr-2"></i>
              Imagem carregada. Clique para trocar.
            </p>
          </div>
        </div>
      ) : (
        // ESTADO VAZIO
        <>
          <div className="bg-brand-dark p-4 rounded-full mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300 border border-brand-muted/10">
            <i className="fas fa-camera text-3xl text-brand-accent"></i>
          </div>
          
          <h3 className="text-xl font-semibold mb-2 text-brand-text text-center">
            Envie a foto do ambiente
          </h3>
          <p className="text-brand-muted text-center max-w-md text-sm">
            Arraste e solte sua imagem aqui ou clique para buscar.
            <br/>
            <span className="text-xs opacity-60 mt-1 block">
              Qualquer qualidade funciona!
            </span>
          </p>
        </>
      )}

      {isLoading && (
        <div className="absolute inset-0 bg-brand-dark/80 backdrop-blur-sm flex items-center justify-center rounded-xl z-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-brand-muted/30 border-t-brand-accent mb-3 mx-auto"></div>
            <p className="text-brand-accent font-medium">Processando...</p>
            <p className="text-xs text-brand-muted mt-1">Analisando geometria</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageUploader;
