import React, { useState, useRef } from 'react';

interface Point { x: number; y: number; }

interface ScaleCalibrationModalProps {
    imageSrc: string;
    onConfirm: (cmPerPixel: number, pixelWidth: number, objectType: string) => void;
    onClose: () => void;
}

const SCALE_PRESETS = [
    { id: 'door', label: 'Porta Padrão', cm: 80 },
    { id: 'window', label: 'Janela', cm: 100 },
    { id: 'custom', label: 'Personalizado', cm: 0 }
];

export const ScaleCalibrationModal: React.FC<ScaleCalibrationModalProps> = ({
    imageSrc, onConfirm, onClose
}) => {
    const [points, setPoints] = useState<Point[]>([]);
    const [refType, setRefType] = useState(SCALE_PRESETS[0]);
    const [customCm, setCustomCm] = useState<number>(0);
    const imgRef = useRef<HTMLImageElement>(null);

    const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (points.length >= 2) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        setPoints([...points, { x, y }]);
    };

    const calculateAndConfirm = () => {
        if (points.length !== 2) return;

        // Distância Euclidiana em pixels
        const pixelWidth = Math.sqrt(
            Math.pow(points[1].x - points[0].x, 2) +
            Math.pow(points[1].y - points[0].y, 2)
        );

        const knownCm = refType.id === 'custom' ? customCm : refType.cm;

        if (pixelWidth === 0) {
            alert("Distância inválida.");
            return;
        }

        if (knownCm <= 0 && refType.id === 'custom') {
            alert("Por favor, insira uma medida válida.");
            return;
        }

        const cmPerPixel = knownCm / pixelWidth;

        onConfirm(cmPerPixel, pixelWidth, refType.id);
    };

    return (
        <div className="fixed inset-0 bg-black/90 z-[100] flex flex-col items-center justify-center p-4">
            <div className="bg-slate-900 rounded-xl max-w-4xl w-full overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
                    <h3 className="text-white font-bold text-lg">Calibrar Escala de Referência</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
                </div>

                {/* Workspace */}
                <div className="relative flex-1 bg-black overflow-hidden flex items-center justify-center cursor-crosshair">
                    <div className="relative inline-block" onClick={handleImageClick}>
                        <img
                            ref={imgRef}
                            src={imageSrc}
                            alt="Calibração"
                            className="max-h-[60vh] object-contain select-none"
                        />

                        {/* SVG Overlay para as linhas e pontos */}
                        <svg className="absolute inset-0 w-full h-full pointer-events-none">
                            {points.map((p, i) => (
                                <circle key={i} cx={p.x} cy={p.y} r="6" fill="#fbbf24" stroke="white" strokeWidth="2" />
                            ))}
                            {points.length === 2 && (
                                <line
                                    x1={points[0].x} y1={points[0].y}
                                    x2={points[1].x} y2={points[1].y}
                                    stroke="#fbbf24" strokeWidth="3" strokeDasharray="4"
                                />
                            )}
                        </svg>
                    </div>
                </div>

                {/* Controls */}
                <div className="p-6 bg-slate-900 border-t border-slate-800">
                    <p className="text-slate-400 text-sm mb-4">
                        {points.length < 2
                            ? `Clique em dois pontos para medir a largura da ${refType.label}.`
                            : "Escala definida! Verifique o valor abaixo e confirme."}
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                            <label className="text-xs font-bold text-slate-500 uppercase">Objeto de Referência</label>
                            <div className="flex gap-2">
                                {SCALE_PRESETS.map(preset => (
                                    <button
                                        key={preset.id}
                                        onClick={() => setRefType(preset)}
                                        className={`px-3 py-2 rounded text-sm transition ${refType.id === preset.id ? 'bg-yellow-500 text-black' : 'bg-slate-800 text-slate-300'
                                            }`}
                                    >
                                        {preset.label}
                                    </button>
                                ))}
                            </div>
                            {refType.id === 'custom' && (
                                <input
                                    type="number"
                                    placeholder="Largura em cm"
                                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
                                    onChange={(e) => setCustomCm(Number(e.target.value))}
                                />
                            )}
                        </div>

                        <div className="flex flex-col justify-end gap-2">
                            <button
                                disabled={points.length !== 2}
                                onClick={calculateAndConfirm}
                                className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-bold py-3 rounded-lg transition"
                            >
                                Confirmar Escala
                            </button>
                            <button onClick={() => setPoints([])} className="text-slate-500 text-xs hover:underline">
                                Reiniciar pontos
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
