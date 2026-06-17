
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ValidationResult } from '../types';

interface ResultViewerProps {
  originalImage: string;
  generatedImage: string;
  affinityBadge?: { text: string; color: string; icon: string } | null;
  consultantMode?: boolean;
  validationResult?: ValidationResult | null;
  qualityScore?: number;
  warnings?: string[];
  onShare?: () => void; // Nova prop para compartilhamento rápido
  autoCompare?: boolean; // Nova: animação automática de comparação
}

const ResultViewer: React.FC<ResultViewerProps> = ({ 
  originalImage, 
  generatedImage, 
  affinityBadge,
  consultantMode = false,
  validationResult,
  qualityScore = 80,
  warnings = [],
  onShare,
  autoCompare = false // Ativa animação automática
}) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isResizing, setIsResizing] = useState(false);
  const [isAutoComparing, setIsAutoComparing] = useState(autoCompare);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<NodeJS.Timeout | null>(null);

  // --- ANIMAÇÃO AUTOMÁTICA DE COMPARAÇÃO ---
  useEffect(() => {
    // Sincroniza estado interno com prop externa quando ela muda
    if (autoCompare) setIsAutoComparing(true);
  }, [autoCompare]);

  useEffect(() => {
    if (isAutoComparing) {
      let direction = 1; // 1 = direita, -1 = esquerda
      let position = 50;
      let frameCount = 0;
      
      const animate = () => {
        // Movimento senoidal suave ou linear
        position += direction * 0.5; 
        
        if (position >= 85 || position <= 15) {
          direction *= -1; // Inverte direção
        }
        
        setSliderPosition(position);
        
        // Continua a animação
        animationRef.current = setTimeout(animate, 16); // ~60fps
        
        // Opcional: Parar após X ciclos se não estiver em modo consultor
        frameCount++;
        if (!consultantMode && frameCount > 600) { // ~10 segundos
             setIsAutoComparing(false);
             setSliderPosition(50);
        }
      };
      
      animate();
      
      return () => {
        if (animationRef.current) clearTimeout(animationRef.current);
      };
    }
  }, [isAutoComparing, consultantMode]);

  // --- HANDLERS OTIMIZADOS ---
  const handleMouseDown = useCallback(() => {
    setIsResizing(true);
    if (isAutoComparing) setIsAutoComparing(false); // Interação humana para automação
  }, [isAutoComparing]);

  const handleMouseUp = useCallback(() => setIsResizing(false), []);
  
  const handleMouseMove = useCallback((e: React.MouseEvent | MouseEvent) => {
    if (!isResizing || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    setSliderPosition(Math.min(99, Math.max(1, x))); // Limites ajustados para não sumir a barra
  }, [isResizing]);

  // --- TOUCH SUPPORT (Mobile) ---
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const touch = e.touches[0];
    const x = ((touch.clientX - rect.left) / rect.width) * 100;
    setSliderPosition(Math.min(99, Math.max(1, x)));
    if (isAutoComparing) setIsAutoComparing(false);
  }, [isAutoComparing]);

  // --- EVENT LISTENERS GLOBAIS ---
  useEffect(() => {
    if (isResizing) {
      const handleGlobalMouseMove = (e: MouseEvent) => handleMouseMove(e);
      const handleGlobalMouseUp = () => handleMouseUp();
      
      window.addEventListener('mousemove', handleGlobalMouseMove);
      window.addEventListener('mouseup', handleGlobalMouseUp);
      
      return () => {
        window.removeEventListener('mousemove', handleGlobalMouseMove);
        window.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);

  // --- BADGE DE FIDELIDADE (B2B TRUST) OTIMIZADO ---
  const getFidelityBadge = useCallback(() => {
    if (!validationResult) return null;

    const badges = {
      'none': { // HIGH FIDELITY
        bg: 'bg-emerald-500/90',
        icon: 'fa-check-circle',
        text: 'Alta Fidelidade',
        description: 'Geometria preservada'
      },
      'low': { // CONSERVATIVE / SAFE
        bg: 'bg-emerald-600/90',
        icon: 'fa-shield-alt',
        text: 'Cena Preservada',
        description: 'Renderização conservadora'
      },
      'medium': { // CAUTION / REVIEW NEEDED
        bg: 'bg-yellow-500/90',
        icon: 'fa-exclamation-circle',
        text: 'Revisão Sugerida',
        description: 'Peq. inconsistências'
      },
      'critical': { // PAUSED / REJECTED
        bg: 'bg-red-500/90',
        icon: 'fa-pause-circle',
        text: 'Simulação Pausada',
        description: 'Necessita ajustes'
      }
    };

    const badge = badges[validationResult.severity || 'none'];

    return (
      <div className={`${badge.bg} text-white px-3 py-1.5 rounded-full flex items-center gap-2 shadow-lg backdrop-blur-md border border-white/20`}>
        <i className={`fas ${badge.icon}`}></i>
        <div className="flex flex-col">
          <span className="text-[10px] font-bold uppercase tracking-wide">{badge.text}</span>
          <span className="text-[8px] opacity-90 hidden sm:block">{badge.description}</span>
        </div>
      </div>
    );
  }, [validationResult]);

  // --- QUALITY WARNING ---
  const qualityWarning = qualityScore < 60 && (
    <div className="bg-amber-500/80 text-white px-3 py-1 rounded-full flex items-center gap-2 shadow-lg backdrop-blur-md text-[10px] animate-pulse">
      <i className="fas fa-camera"></i>
      <span>Foto original: Baixa qualidade ({qualityScore}/100)</span>
    </div>
  );

  // --- TOGGLE AUTO COMPARE ---
  const toggleAutoCompare = () => {
    if (isAutoComparing) {
      setIsAutoComparing(false);
      if (animationRef.current) clearTimeout(animationRef.current);
    } else {
      setIsAutoComparing(true);
    }
  };

  return (
    <div className="w-full h-full animate-fade-in relative group/viewer flex flex-col items-center justify-center bg-brand-dark/50 rounded-xl">
      
      {/* HEADER OVERLAYS (RÁPIDO) */}
      <div className="absolute top-4 left-0 right-0 px-4 flex justify-between items-start z-20 pointer-events-none">
        {/* FIDELITY BADGE */}
        <div className="animate-fade-in pointer-events-auto flex flex-col gap-2">
          {getFidelityBadge()}
          {qualityWarning}
        </div>

        {/* AFFINITY BADGE (SALES) */}
        {affinityBadge && (
          <div className={`${affinityBadge.color} px-4 py-1.5 rounded-full backdrop-blur-md shadow-lg border border-white/20 flex items-center gap-2`}>
            <i className={`fas ${affinityBadge.icon}`}></i>
            <span className="text-xs font-bold uppercase tracking-wide">{affinityBadge.text}</span>
          </div>
        )}
      </div>

      {/* CONTAINER PRINCIPAL */}
      <div 
        ref={containerRef}
        className={`
          relative w-auto max-w-full rounded-xl overflow-hidden cursor-ew-resize select-none 
          border-4 border-brand-card shadow-2xl transition-all duration-300
          ${consultantMode ? 'max-h-[85vh]' : 'max-h-[600px]'}
          ${isAutoComparing ? 'border-brand-accent/50 shadow-[0_0_30px_rgba(59,130,246,0.3)]' : ''}
        `}
        style={{ display: 'inline-block' }} 
        onMouseDown={handleMouseDown}
        onTouchStart={handleMouseDown}
        onTouchEnd={handleMouseUp}
        onTouchMove={handleTouchMove}
      >
        {/* Background Layer (Generated) */}
        <img 
          src={generatedImage} 
          alt="Novo Piso" 
          className="block w-full h-auto object-contain max-h-full"
          draggable={false}
          loading="eager" // Carrega primeiro para performance
        />

        {/* Foreground Layer (Original) - Clipped */}
        <div 
          className="absolute inset-0 h-full overflow-hidden"
          style={{ width: `${sliderPosition}%` }}
        >
          <img 
            src={originalImage} 
            alt="Original" 
            className="block h-full max-w-none object-contain"
            style={{ width: containerRef.current?.offsetWidth || 'auto' }}
            draggable={false}
            loading="eager"
          />
        </div>

        {/* Slider Handle */}
        <div 
          className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize shadow-[0_0_10px_rgba(0,0,0,0.5)] z-10 flex items-center justify-center"
          style={{ left: `${sliderPosition}%` }}
        >
          <div className={`
             w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg text-brand-dark transition-all duration-200 border border-brand-muted/20
             ${isAutoComparing ? 'scale-110 shadow-brand-accent/50' : 'hover:scale-110'}
          `}>
            <i className={`fas ${isAutoComparing ? 'fa-play text-brand-accent' : 'fa-arrows-alt-h'} text-xs`}></i>
          </div>
        </div>
        
        {/* INDICADOR DE POSIÇÃO (Só aparece ao interagir) */}
        {!isAutoComparing && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-black/70 text-white text-[10px] px-2 py-0.5 rounded-full opacity-0 group-hover/viewer:opacity-70 transition-opacity">
            {Math.round(sliderPosition)}% original
            </div>
        )}
      </div>

      {/* LEGENDA RÁPIDA */}
      <div className="mt-4 flex items-center gap-6 text-xs animate-fade-in">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-brand-accent/20 border border-brand-accent rounded"></div>
          <span className="text-brand-muted font-medium">Original</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500/20 border border-green-500 rounded"></div>
          <span className="text-brand-muted font-medium">Simulação</span>
        </div>
      </div>

      {/* CONTROLES RÁPIDOS INFERIORES (Floating) */}
      <div className="absolute bottom-6 left-0 right-0 px-4 flex justify-center gap-3 z-30 pointer-events-none">
        
        {/* BOTÃO AUTO COMPARE */}
        <button
          onClick={toggleAutoCompare}
          className={`
            pointer-events-auto px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 shadow-lg transition-all border
            ${isAutoComparing 
              ? 'bg-brand-accent text-white border-brand-accent hover:bg-blue-600' 
              : 'bg-brand-dark/90 text-brand-muted border-brand-muted/20 hover:text-white hover:border-white/30 backdrop-blur-md'
            }
          `}
        >
          <i className={`fas ${isAutoComparing ? 'fa-pause' : 'fa-play'}`}></i>
          {isAutoComparing ? 'Parar' : 'Comparar'}
        </button>

        {/* BOTÃO WHATSAPP (SEMI-AUTOMÁTICO) */}
        {onShare && (
          <button
            onClick={onShare}
            className="pointer-events-auto px-5 py-2 bg-green-600 hover:bg-green-500 rounded-full 
                     text-white font-bold text-xs flex items-center gap-2 shadow-lg hover:shadow-green-500/30 
                     transition-all active:scale-95 border border-green-500/20"
          >
            <i className="fab fa-whatsapp text-sm"></i>
            Enviar ao Cliente
          </button>
        )}
      </div>

      {/* DICA DE USO (APENAS INICIAL) */}
      {!consultantMode && sliderPosition === 50 && !isAutoComparing && !isResizing && (
        <p className="absolute bottom-20 text-center text-[10px] text-brand-muted/60 animate-pulse font-medium w-full pointer-events-none">
          ← Arraste para comparar →
        </p>
      )}
      
      {/* WARNINGS (SÓ SE HOUVER E NÃO FOR MODO APRESENTAÇÃO) */}
      {warnings.length > 0 && !consultantMode && (
        <div className="mt-2 max-w-md bg-brand-dark/80 backdrop-blur border border-brand-muted/20 rounded-lg p-2 animate-fade-in mx-4">
          <div className="text-[10px] text-brand-muted font-bold uppercase mb-0.5 flex items-center gap-1">
            <i className="fas fa-info-circle text-brand-accent"></i> Dica do Sistema
          </div>
          <p className="text-[10px] text-brand-muted/80 leading-relaxed truncate">
            {warnings[0]} {warnings.length > 1 && `(+${warnings.length - 1})`}
          </p>
        </div>
      )}
    </div>
  );
};

export default ResultViewer;
