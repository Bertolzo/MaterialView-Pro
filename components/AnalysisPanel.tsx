
import React from 'react';
import { ImageAnalysis } from '../types';

interface AnalysisPanelProps {
  analysis: ImageAnalysis;
  onOpenScale?: () => void;
  onOpenMask?: () => void;
}

const AnalysisPanel: React.FC<AnalysisPanelProps> = React.memo(({ analysis, onOpenScale, onOpenMask }) => {

  const displayWarnings = [...(analysis.warnings || []), ...(analysis.rejections || [])];

  return (
    <div className="flex flex-col gap-3">
      {/* MANUAL INTELLIGENCE (HITL) CONTROLS */}
      <div className="flex gap-2">
        <button
          onClick={onOpenScale}
          className="flex-1 px-3 py-2 bg-brand-dark/50 border border-brand-accent/30 rounded-lg text-brand-accent text-xs font-semibold hover:bg-brand-accent/10 transition-colors flex items-center justify-center gap-2"
          title="Calibrar escala para proporções reais dos azulejos"
        >
          <i className="fas fa-ruler-combined"></i>
          Calibrar Escala
        </button>
        <button
          onClick={onOpenMask}
          className="flex-1 px-3 py-2 bg-brand-dark/50 border border-brand-accent/30 rounded-lg text-brand-accent text-xs font-semibold hover:bg-brand-accent/10 transition-colors flex items-center justify-center gap-2"
          title="Definir área do piso manualmente para evitar vazamentos"
        >
          <i className="fas fa-draw-polygon"></i>
          Máscara Manual
        </button>
      </div>

      {displayWarnings.length > 0 && (
        <div className="px-3 py-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400 text-xs animate-fade-in">
          <div className="flex items-center gap-2 mb-1.5 font-bold">
            <i className="fas fa-lightbulb"></i>
            <span>Dicas para melhorar o resultado:</span>
          </div>
          <ul className="list-disc pl-4 space-y-1 opacity-90">
            {displayWarnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
});

export default AnalysisPanel;
