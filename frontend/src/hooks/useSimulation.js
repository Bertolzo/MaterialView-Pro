import { useState, useCallback } from 'react';
import { simulate } from '../api/client.js';

const PROGRESS_STEPS = [
  'Analisando imagem...',
  'Aplicando material...',
  'Finalizando...',
];

export function useSimulation() {
  const [imageBase64, setImageBase64] = useState(null);
  const [material, setMaterial] = useState(null);
  const [surfaceType, setSurfaceType] = useState('floor');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progressStep, setProgressStep] = useState(0);

  const handleSimulate = useCallback(async () => {
    if (!imageBase64 || !material) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setProgressStep(0);

    const stepInterval = setInterval(() => {
      setProgressStep((prev) => Math.min(prev + 1, PROGRESS_STEPS.length - 1));
    }, 2000);

    try {
      const response = await simulate(imageBase64, material);

      if (response.status === 200) {
        const data = await response.json();
        if (data.editedImageBase64) {
          setResult(data);
        } else if (data.fallbackDescription) {
          setError(`Fallback: ${data.fallbackDescription}`);
        } else {
          setError('Resposta inesperada do servidor.');
        }
      } else if (response.status === 409) {
        setError(
          'Este material não é compatível com a imagem. Tente outro material ou outra foto.'
        );
      } else {
        setError('Ocorreu um erro ao processar sua solicitação. Tente novamente.');
      }
    } catch {
      setError('Ocorreu um erro ao processar sua solicitação. Tente novamente.');
    } finally {
      clearInterval(stepInterval);
      setLoading(false);
    }
  }, [imageBase64, material]);

  const reset = useCallback(() => {
    setImageBase64(null);
    setMaterial(null);
    setResult(null);
    setError(null);
    setLoading(false);
    setProgressStep(0);
  }, []);

  return {
    imageBase64, setImageBase64,
    material, setMaterial,
    surfaceType, setSurfaceType,
    result, setResult,
    error, setError,
    loading,
    progressStep,
    progressLabel: PROGRESS_STEPS[progressStep] || '',
    simulate: handleSimulate,
    reset,
  };
}
