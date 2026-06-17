import React from 'react';
import { ErrorRegion, ValidationResult } from '../types';

/**
 * ERROR OVERLAY RENDERER
 * Renderiza bounding boxes de erro com coordenadas normalizadas (0-100%)
 * Funciona em qualquer tamanho de tela (Mobile/Desktop)
 */

interface ErrorOverlayProps {
    errorRegions: ErrorRegion[];
    containerWidth: number;
    containerHeight: number;
}

export const ErrorOverlay: React.FC<ErrorOverlayProps> = ({
    errorRegions,
    containerWidth,
    containerHeight
}) => {
    return (
        <>
            {errorRegions.map((region, index) => (
                <div
                    key={index}
                    style={{
                        position: 'absolute',
                        left: `${region.x}%`,
                        top: `${region.y}%`,
                        width: `${region.width}%`,
                        height: `${region.height}%`,
                        border: '2px solid #ef4444',
                        backgroundColor: 'rgba(239, 68, 68, 0.15)',
                        pointerEvents: 'none',
                        zIndex: 10
                    }}
                >
                    <span
                        className="bg-red-500 text-white text-[10px] absolute -top-5 left-0 px-1 rounded"
                        style={{ whiteSpace: 'nowrap' }}
                    >
                        {region.label}
                    </span>
                </div>
            ))}
        </>
    );
};

/**
 * FORENSIC IMAGE VIEWER
 * Visualizador comparativo: Original | Render com Error Overlay | Drift Analysis
 */

interface ForensicImageViewerProps {
    originalImage: string; // base64
    renderedImage: string; // base64
    validation: ValidationResult;
}

export const ForensicImageViewer: React.FC<ForensicImageViewerProps> = ({
    originalImage,
    renderedImage,
    validation
}) => {
    const driftLevel = (validation.pixelDriftScore || 0) < 5 ? 'safe' :
        (validation.pixelDriftScore || 0) < 15 ? 'caution' : 'critical';

    const driftColor = driftLevel === 'safe' ? 'text-green-500' :
        driftLevel === 'caution' ? 'text-yellow-500' : 'text-red-500';

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Original */}
            <div className="relative">
                <img
                    src={`data:image/jpeg;base64,${originalImage}`}
                    alt="Original"
                    className="w-full rounded-lg border border-gray-300"
                />
                <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                    Original
                </div>
            </div>

            {/* Render with Error Overlay */}
            <div className="relative">
                <img
                    src={`data:image/jpeg;base64,${renderedImage}`}
                    alt="Render"
                    className="w-full rounded-lg border border-gray-300"
                />
                {validation.errorRegions && validation.errorRegions.length > 0 && (
                    <ErrorOverlay
                        errorRegions={validation.errorRegions}
                        containerWidth={100}
                        containerHeight={100}
                    />
                )}
                <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                    Render + Errors
                </div>
            </div>

            {/* Drift Analysis */}
            <div className="flex flex-col justify-center bg-gray-50 rounded-lg p-4 border border-gray-300">
                <h3 className="font-bold text-lg mb-4">Auditoria</h3>

                <div className="space-y-2">
                    <div>
                        <span className="text-sm text-gray-600">Status:</span>
                        <span className={`ml-2 font-bold ${validation.approved ? 'text-green-500' : 'text-red-500'}`}>
                            {validation.approved ? '✅ Aprovado' : '❌ Rejeitado'}
                        </span>
                    </div>

                    <div>
                        <span className="text-sm text-gray-600">Semantic Drift:</span>
                        <span className={`ml-2 font-bold ${driftColor}`}>
                            {validation.pixelDriftScore?.toFixed(1)}%
                        </span>
                    </div>

                    <div>
                        <span className="text-sm text-gray-600">Severidade:</span>
                        <span className="ml-2 font-medium capitalize">
                            {validation.severity}
                        </span>
                    </div>

                    {validation.issues && validation.issues.length > 0 && (
                        <div className="mt-4">
                            <span className="text-sm text-gray-600 font-medium">Issues:</span>
                            <ul className="mt-1 text-xs space-y-1">
                                {validation.issues.map((issue, i) => (
                                    <li key={i} className="text-red-600">• {issue}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

/**
 * DRIFT vs CONFIDENCE SCATTER PLOT
 * Quadrantes de análise de causa raiz
 */

interface DriftConfidencePoint {
    jobId: string;
    confidence: number; // 0-100
    drift: number; // 0-100
    approved: boolean;
}

export const DriftConfidenceChart: React.FC<{ data: DriftConfidencePoint[] }> = ({ data }) => {
    const getQuadrant = (confidence: number, drift: number): string => {
        if (confidence > 70 && drift < 5) return 'Ouro'; // Success
        if (confidence > 70 && drift > 15) return 'Risco'; // Hallucination
        if (confidence < 50 && drift > 15) return 'Ruído'; // Expected failure
        return 'Normal';
    };

    return (
        <div className="relative w-full h-96 border border-gray-300 rounded-lg bg-white">
            <svg width="100%" height="100%" className="absolute inset-0">
                {/* Quadrant lines */}
                <line x1="50%" y1="0" x2="50%" y2="100%" stroke="#e5e7eb" strokeWidth="1" />
                <line x1="0" y1="50%" x2="100%" y2="50%" stroke="#e5e7eb" strokeWidth="1" />

                {/* Quadrant labels */}
                <text x="25%" y="25%" textAnchor="middle" className="text-xs fill-gray-500">
                    Baixa Conf + Baixo Drift
                </text>
                <text x="75%" y="25%" textAnchor="middle" className="text-xs fill-green-600 font-bold">
                    🏆 OURO
                </text>
                <text x="25%" y="75%" textAnchor="middle" className="text-xs fill-gray-400">
                    RUÍDO
                </text>
                <text x="75%" y="75%" textAnchor="middle" className="text-xs fill-red-600 font-bold">
                    ⚠️ RISCO
                </text>

                {/* Data points */}
                {data.map((point, i) => {
                    const x = point.confidence;
                    const y = 100 - point.drift; // Invert Y axis
                    const color = point.approved ? '#10b981' : '#ef4444';

                    return (
                        <circle
                            key={i}
                            cx={`${x}%`}
                            cy={`${y}%`}
                            r="4"
                            fill={color}
                            opacity="0.7"
                            className="hover:opacity-100 cursor-pointer"
                        >
                            <title>{`Confidence: ${point.confidence}%, Drift: ${point.drift}%`}</title>
                        </circle>
                    );
                })}
            </svg>
        </div>
    );
};
