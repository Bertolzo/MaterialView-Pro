import { RenderRequest, RenderResult, RoomAnalysis, FidelityLevel } from './types';
import { validateInputImage } from './validation';
import { analyzeRoomGeometry } from './roomAnalyzer';
// Material simulator removido - unificado via gateway API

/**
 * Orchestrador Principal - Controla fluxo de renderização sem dependências de UI
 */
export class RenderOrchestrator {
  private timeoutMs: number;
  private maxRetries = 1;

  constructor(timeoutMs = 8000) {
    this.timeoutMs = timeoutMs;
  }

  async render(request: RenderRequest): Promise<RenderResult> {
    const startTime = Date.now();
    
    try {
      // 1. Validação da imagem
      const validationResult = await validateInputImage(request.imageBuffer, request.imageFormat);
      if (!validationResult.valid) {
        return this.createErrorResult('validation_failed', validationResult.error!, startTime);
      }

      // 2. Análise da geometria da sala via Gateway API
      const gatewayResult = await this.callGatewayAPI(request);

      if (!gatewayResult.success) {
        return this.createErrorResult('api_error', gatewayResult.error!, startTime);
      }

      // 3. Validação da saída
      const fidelityLevel = this.calculateFidelityFromGateway(gatewayResult);

      return {
        success: true,
        imageBase64: gatewayResult.image,
        fidelityLevel,
        processingTimeMs: Date.now() - startTime,
        metrics: { provider: gatewayResult.provider || 'gateway' }
      };

    } catch (error) {
      if (error instanceof Error && error.message.includes('timeout')) {
        return this.createErrorResult('timeout', 'Operation timed out', startTime);
      }
      return this.createErrorResult('api_error', error instanceof Error ? error.message : 'Unknown error', startTime);
    }
  }

  private async callGatewayAPI(request: RenderRequest): Promise<GatewayRenderResult> {
    // Implementação simplificada para chamar o Gateway unificado
    // Em produção, isso seria uma chamada HTTP para src/services/gateway
    
    const imageBase64 = request.imageBuffer.toString('base64');
    const prompt = `Simule o material: ${request.materialSpecs.name} ${request.materialSpecs.category} no ambiente`;
    
    try {
      // Chamada direta ao gateway (futuramente seria HTTP)
      const { gatewayOrchestrator } = await import('../../../../src/services/gateway');
      const result = await gatewayOrchestrator.callWithFallback({
        image: imageBase64,
        prompt,
        maxTokens: 500
      });

      return {
        success: true,
        image: result.text, // Assume que result.text contém base64 da imagem
        provider: 'gateway'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Gateway API error',
        provider: 'fallback'
      };
    }
  }

  private calculateFidelityFromGateway(gatewayResult: GatewayRenderResult): FidelityLevel {
    // Nível 0: Falha completa
    if (!gatewayResult.success || !gatewayResult.image) return 0;

    // Nível 1: Renderização básica funcional (fallback)
    if (gatewayResult.provider === 'fallback') return 1;

    // Nível 2: Renderização de provedor secundário
    if (gatewayResult.provider === 'huggingface' || gatewayResult.provider === 'tencent' || gatewayResult.provider === 'alibaba') return 2;

    // Nível 3: Renderização de alta qualidade (primary provider)
    return 3;
  }

  private calculateFidelity(
    resultImage: string,
    roomAnalysis: RoomAnalysis,
    qualityMetrics?: any
  ): FidelityLevel {
    // Nível 0: Falha completa
    if (!resultImage || resultImage.length < 1000) return 0;

    // Nível 1: Renderização básica funcional
    if (qualityMetrics?.coherence < 0.7) return 1;

    // Nível 2: Renderização de boa qualidade
    if (qualityMetrics?.coherence >= 0.7 && qualityMetrics?.realism >= 0.65) return 2;

    // Nível 3: Renderização de alta qualidade
    return 3;
  }

  private createErrorResult(
    type: 'timeout' | 'api_error' | 'class_mutation' | 'validation_failed',
    message: string,
    startTime: number
  ): RenderResult {
    return {
      success: false,
      fidelityLevel: 0,
      processingTimeMs: Date.now() - startTime,
      error: { type, message }
    };
  }
}
