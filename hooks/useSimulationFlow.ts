// hooks/useSimulationFlow.ts - Implementação real
import { useState, useCallback } from 'react';
import { analyzeRoom, applyMaterial } from '../services/ai';
import { materialService } from '../services/materialService';

interface SimulationFlowParams {
  base64Raw?: string;
  selectedMaterial?: any;
  analysis?: any;
  onSetIsMaterialListExpanded?: (expanded: boolean) => void;
  onSetHistoryAutoScroll?: () => void;
  trackEvent?: (event: string, data?: any) => void;
}

export function useSimulationFlow(params: SimulationFlowParams = {}) {
  const [image, setImage] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [materials, setMaterials] = useState<any[]>([]);
  const [currentStep, setCurrentStep] = useState(0);

  // Carrega materiais ao inicializar
  const loadMaterials = useCallback(async () => {
    try {
      const materialsData = await materialService.fetchMaterials();
      setMaterials(materialsData);
    } catch (err) {
      console.warn('Erro ao carregar materiais:', err);
      setMaterials([]);
    }
  }, []);

  const simulate = async (imageBase64: string, material: any) => {
    setLoading(true);
    setError(null);
    try {
      console.log('🚀 Iniciando simulação...');
      
      // Passo 1: Análise do ambiente
      setCurrentStep(1);
      const context = await analyzeRoom(imageBase64);
      console.log('✅ Ambiente analisado:', context);
      
      // Passo 2: Aplicação do material
      setCurrentStep(2);
      const { editedImageBase64, fidelity } = await applyMaterial(imageBase64, material, context);
      console.log('✅ Material aplicado. Fidelidade:', fidelity);
      
      setResult({ 
        image: editedImageBase64, 
        fidelity, 
        context,
        material 
      });
      setCurrentStep(3);
      
    } catch (err: any) {
      console.error('❌ Erro na simulação:', err);
      setError(err.message || 'Erro desconhecido na simulação');
      setCurrentStep(0);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setImage(null);
    setResult(null);
    setError(null);
    setLoading(false);
    setCurrentStep(0);
  };

  const setErrorMsg = (msg: string | null) => setError(msg);

  return { 
    image, 
    setImage, 
    result, 
    error, 
    loading, 
    materials,
    currentStep,
    totalSteps: 3,
    simulate, 
    reset,
    setErrorMsg,
    loadMaterials,
    nextStep: () => setCurrentStep(prev => Math.min(prev + 1, 3)),
    previousStep: () => setCurrentStep(prev => Math.max(prev - 1, 0))
  };
}