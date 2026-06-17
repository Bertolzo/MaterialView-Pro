
import React, { useState, useEffect, useRef } from 'react';
import { Material } from '../types';

// Componente interno para Lazy Loading via Intersection Observer
// Otimiza a performance evitando carregar todas as texturas de uma vez
const LazyImage: React.FC<{ src: string; alt: string; className?: string }> = ({ src, alt, className }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Fallback se o browser não suportar IntersectionObserver
    if (!('IntersectionObserver' in window)) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect(); // Carrega apenas uma vez
        }
      },
      {
        rootMargin: '100px', // Inicia o carregamento um pouco antes de aparecer
        threshold: 0.01
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div ref={containerRef} className={`relative overflow-hidden bg-brand-dark ${className || 'w-full h-full'}`}>
      {isVisible && (
        <img
          src={src}
          alt={alt}
          className={`w-full h-full object-cover transition-opacity duration-500 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setIsLoaded(true)}
          loading="lazy" // Fallback nativo
        />
      )}
      {(!isVisible || !isLoaded) && (
         <div className="absolute inset-0 flex items-center justify-center bg-brand-card">
             <div className="w-3 h-3 border-2 border-brand-muted/20 border-t-brand-accent/50 rounded-full animate-spin"></div>
         </div>
      )}
    </div>
  );
};

interface MaterialSelectorProps {
  materials: Material[];
  selectedMaterial: Material | null;
  onSelect: (material: Material) => void;
  disabled?: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

const MaterialSelector: React.FC<MaterialSelectorProps> = React.memo(({ 
  materials,
  selectedMaterial, 
  onSelect, 
  disabled,
  isExpanded,
  onToggleExpand
}) => {
  const [hoveredState, setHoveredState] = useState<{ material: Material, rect: DOMRect } | null>(null);

  const getCategoryIcon = (category: string) => {
    switch(category) {
      case 'madeira': return 'fa-tree';
      case 'pedra': return 'fa-gem';
      case 'ceramica': return 'fa-square';
      case 'vinilico': return 'fa-layer-group';
      default: return 'fa-box';
    }
  };

  const handleSelect = (mat: Material) => {
    if (disabled || !mat.inStock) return;
    onSelect(mat);
  };

  return (
    <div className={`flex flex-col relative transition-all duration-300 w-full ${isExpanded ? 'h-full' : 'h-auto'}`}>
      
      {/* HEADER COMPACTO */}
      <div 
        className="flex items-center justify-between cursor-pointer group py-2 px-3 border-b border-brand-muted/10 hover:bg-brand-muted/5 transition-colors"
        onClick={onToggleExpand}
      >
        <h3 className="text-xs font-bold text-brand-text flex items-center gap-2 uppercase tracking-wide">
          <i className="fas fa-layer-group text-brand-accent"></i> 
          <span className="hidden sm:inline">Catálogo</span>
        </h3>
        <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-brand-muted bg-brand-dark px-1.5 rounded border border-brand-muted/20">
            {materials.length}
            </span>
            <i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'} text-[10px] text-brand-muted`}></i>
        </div>
      </div>

      {/* LISTA COMPACTA (Ultra-Slim) */}
      <div className={`
        flex-1 overflow-y-auto custom-scrollbar transition-all duration-300 origin-top
        ${isExpanded ? 'opacity-100 max-h-[calc(100vh-200px)]' : 'max-h-0 overflow-hidden opacity-0'}
      `}>
        <div className="flex flex-col">
        {materials.length === 0 ? (
           <div className="p-4 text-center text-xs text-brand-muted">
             <i className="fas fa-spinner fa-spin mr-2"></i>
           </div>
        ) : (
          materials.map((mat) => {
            const isSelected = selectedMaterial?.id === mat.id;
            const isOutOfStock = !mat.inStock;
            
            return (
              <div
                key={mat.id}
                onClick={(e) => { e.stopPropagation(); handleSelect(mat); }}
                onMouseEnter={(e) => {
                    if (!disabled) {
                        setHoveredState({ 
                            material: mat, 
                            rect: e.currentTarget.getBoundingClientRect() 
                        });
                    }
                }}
                onMouseLeave={() => setHoveredState(null)}
                className={`
                  group flex items-center gap-3 py-2 px-3 cursor-pointer border-b border-brand-muted/5 transition-all duration-150 relative
                  ${isSelected 
                    ? 'bg-brand-accent/10 border-l-2 border-l-brand-accent' 
                    : isOutOfStock
                        ? 'hover:bg-transparent border-l-2 border-l-transparent opacity-50 cursor-not-allowed'
                        : 'hover:bg-brand-card border-l-2 border-l-transparent'
                  }
                  ${disabled ? 'opacity-50 pointer-events-none' : ''}
                `}
              >
                {/* Micro Thumbnail with Observer Lazy Loading */}
                <div className="w-8 h-8 rounded bg-brand-dark overflow-hidden flex-shrink-0 border border-brand-muted/10 relative">
                  <LazyImage src={mat.textureUrl} alt={mat.name} className={isOutOfStock ? "grayscale" : ""} />
                  {isSelected && (
                    <div className="absolute inset-0 bg-brand-accent/50 flex items-center justify-center backdrop-blur-[1px] z-10">
                      <i className="fas fa-check text-white text-[8px]"></i>
                    </div>
                  )}
                  {isOutOfStock && !isSelected && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10">
                          <i className="fas fa-ban text-red-500 text-[10px]"></i>
                      </div>
                  )}
                </div>

                {/* Minimal Info */}
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <h4 className={`text-xs truncate ${isSelected ? 'font-bold text-white' : 'font-medium text-brand-text/90'} ${isOutOfStock ? 'line-through text-brand-muted' : ''}`}>
                      {mat.name}
                    </h4>
                </div>
                
                {/* Icon Category */}
                <div className="w-6 flex justify-end text-brand-muted/50 group-hover:text-brand-muted transition-colors">
                     <i className={`fas ${getCategoryIcon(mat.category)} text-xs`}></i>
                </div>
              </div>
            );
          })
        )}
        </div>
      </div>

      {/* ENHANCED FLOATING TOOLTIP (SIDE PANEL STYLE) */}
      {hoveredState && (
         <div 
            className="fixed z-50 w-96 bg-brand-dark border border-brand-muted/20 rounded-xl shadow-[0_30px_80px_rgba(0,0,0,0.9)] overflow-hidden hidden lg:block animate-fade-in pointer-events-none ring-1 ring-white/10"
            style={{
                top: hoveredState.rect.top + (hoveredState.rect.height / 2),
                right: window.innerWidth - hoveredState.rect.left + 16,
                transform: 'translateY(-50%)'
            }}
         >
            {/* Header com Textura Grande */}
            <div className="relative h-64 w-full bg-black">
                 {/* Tooltip image keeps native lazy as it appears on viewport hover */}
                 <img 
                    src={hoveredState.material.textureUrl} 
                    className={`w-full h-full object-cover opacity-90 ${!hoveredState.material.inStock ? 'grayscale' : ''}`} 
                    alt="" 
                    loading="lazy"
                 />
                 <div className="absolute inset-0 bg-gradient-to-t from-brand-dark via-brand-dark/10 to-transparent"></div>
                 
                 <div className="absolute bottom-5 left-5 right-5">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-brand-accent text-white shadow-sm border border-brand-accent/20">
                            {hoveredState.material.category}
                        </span>
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono bg-black/40 text-brand-muted border border-white/10 backdrop-blur-sm">
                            {hoveredState.material.sku}
                        </span>
                    </div>
                    <h3 className="text-white font-bold text-xl leading-tight shadow-black drop-shadow-md">
                        {hoveredState.material.name}
                    </h3>
                 </div>
            </div>

            {/* Especificações Detalhadas */}
            <div className="p-5 bg-brand-card/95 backdrop-blur-md space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <div className="text-[10px] text-brand-muted uppercase tracking-wider font-semibold">Acabamento</div>
                        <div className="text-sm font-medium text-brand-text flex items-center gap-2">
                             <i className="fas fa-fill-drip text-brand-accent/60 text-xs"></i>
                             {hoveredState.material.finish}
                        </div>
                    </div>
                    <div className="space-y-1">
                        <div className="text-[10px] text-brand-muted uppercase tracking-wider font-semibold">Dimensões</div>
                        <div className="text-sm font-medium text-brand-text flex items-center gap-2">
                             <i className="fas fa-ruler-combined text-brand-accent/60 text-xs"></i>
                             {hoveredState.material.dimensions}
                        </div>
                    </div>
                </div>
                
                {/* Visual Description / Technical Prompt */}
                <div className="pt-3 border-t border-brand-muted/10">
                    <div className="text-[10px] text-brand-muted uppercase tracking-wider font-semibold mb-1.5">Descrição Técnica</div>
                    <p className="text-xs text-brand-muted/80 leading-relaxed italic border-l-2 border-brand-accent/30 pl-2">
                        "{hoveredState.material.prompt}"
                    </p>
                </div>

                <div className="pt-2">
                    {hoveredState.material.inStock ? (
                        <div className="text-brand-success bg-brand-success/5 border border-brand-success/10 rounded-lg py-2 px-3 flex items-center justify-between gap-2 text-xs font-bold uppercase tracking-wide">
                             <span className="flex items-center gap-2"><i className="fas fa-check-circle"></i> Disponível</span>
                             <span className="text-brand-text font-mono">{hoveredState.material.stockQuantity}m²</span>
                        </div>
                    ) : (
                        <div className="text-red-400 bg-red-500/5 border border-red-500/10 rounded-lg py-2 px-3 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wide">
                             <i className="fas fa-times-circle"></i> Indisponível (Sem Estoque)
                        </div>
                    )}
                </div>
            </div>
         </div>
      )}
    </div>
  );
});

export default MaterialSelector;
