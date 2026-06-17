import React, { useState } from 'react';

interface Point { x: number; y: number; }

export const ManualMaskingModal: React.FC<{
    imageSrc: string;
    onConfirm: (maskPoints: Point[]) => void;
    onClose: () => void;
}> = ({ imageSrc, onConfirm, onClose }) => {
    const [points, setPoints] = useState<Point[]>([]);

    const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        // Normalizando para 0-100 para manter consistência com o backend (normalized coordinates)
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        setPoints([...points, { x, y }]);
    };

    const undoLast = () => setPoints(points.slice(0, -1));
    const clearAll = () => setPoints([]);

    return (
        <div className="fixed inset-0 bg-black/90 z-[100] flex flex-col items-center justify-center p-4">
            <div className="bg-slate-900 rounded-xl max-w-4xl w-full flex flex-col max-h-[90vh] overflow-hidden">

                {/* Header */}
                <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
                    <div className="flex flex-col">
                        <h3 className="text-white font-bold">Desenhar Máscara de Piso</h3>
                        <span className="text-slate-500 text-[10px] uppercase tracking-wider font-bold">Restrição de Área Manual</span>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={undoLast}
                            disabled={points.length === 0}
                            className="text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded text-white disabled:opacity-30 transition"
                        >
                            <i className="fas fa-undo mr-1"></i> Desfazer
                        </button>
                        <button
                            onClick={onClose}
                            className="text-slate-400 hover:text-white transition p-1"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                {/* Workspace */}
                <div className="relative flex-1 bg-black overflow-hidden flex items-center justify-center cursor-crosshair">
                    <div className="relative inline-block" onClick={handleImageClick}>
                        <img
                            src={imageSrc}
                            alt="Masking"
                            className="max-h-[60vh] object-contain select-none"
                        />

                        {/* SVG Overlay com ViewBox 0-100 para bater com coordenadas normalizadas */}
                        <svg
                            className="absolute inset-0 w-full h-full pointer-events-none"
                            viewBox="0 0 100 100"
                            preserveAspectRatio="none"
                        >
                            <polygon
                                points={points.map(p => `${p.x},${p.y}`).join(' ')}
                                fill="rgba(59, 130, 246, 0.3)"
                                stroke="#3b82f6"
                                strokeWidth="0.5"
                                strokeDasharray="1"
                            />
                            {points.map((p, i) => (
                                <circle
                                    key={i}
                                    cx={p.x}
                                    cy={p.y}
                                    r="0.8"
                                    fill="white"
                                    stroke="#3b82f6"
                                    strokeWidth="0.2"
                                />
                            ))}

                            {/* Linha guia para fechar o polígono se houver > 2 pontos */}
                            {points.length >= 2 && (
                                <line
                                    x1={points[points.length - 1].x} y1={points[points.length - 1].y}
                                    x2={points[0].x} y2={points[0].y}
                                    stroke="rgba(59, 130, 246, 0.5)"
                                    strokeWidth="0.3"
                                    strokeDasharray="0.5"
                                />
                            )}
                        </svg>
                    </div>
                </div>

                {/* Controls */}
                <div className="p-6 bg-slate-900 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex flex-col">
                        <p className="text-slate-400 text-xs max-w-xs">
                            Crie um polígono clicando ao redor da área de piso visível.
                            Mínimo de 3 pontos para formar uma área.
                        </p>
                        {points.length > 0 && (
                            <button onClick={clearAll} className="text-red-500 text-[10px] font-bold uppercase mt-2 hover:underline text-left">
                                Limpar Tudo
                            </button>
                        )}
                    </div>

                    <div className="flex gap-3 w-full md:w-auto">
                        <button
                            onClick={onClose}
                            className="flex-1 md:flex-none border border-slate-700 text-slate-400 px-6 py-2 rounded-lg font-bold hover:bg-slate-800 transition"
                        >
                            Cancelar
                        </button>
                        <button
                            disabled={points.length < 3}
                            onClick={() => onConfirm(points)}
                            className="flex-1 md:flex-none bg-blue-600 hover:bg-blue-500 text-white px-8 py-2 rounded-lg font-bold disabled:opacity-50 transition shadow-lg"
                        >
                            {points.length < 3 ? 'Aguardando Pontos' : 'Confirmar Área'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
