#!/usr/bin/env node

import { RenderOrchestrator } from './lib/core/orchestrator';
import { validateMaterialSpecs } from './lib/core/validation';
import { BatchResult, RenderRequest, MaterialSpecs } from './lib/core/types';
import fs from 'fs';
import path from 'path';

interface ValidationOptions {
  timeoutMs?: number;
  maxRetries?: number;
  verbose?: boolean;
  output?: string;
  threshold: number;
}

class PisorealCLIValidator {
  private orchestrator: RenderOrchestrator;
  private options: ValidationOptions;

  constructor(options: ValidationOptions = { threshold: 0.7 }) {
    this.options = {
      timeoutMs: 8000,
      maxRetries: 1,
      verbose: false,
      threshold: 0.7,
      ...options
    };
    
    this.orchestrator = new RenderOrchestrator(this.options.timeoutMs);
  }

  /**
   * Valida um arquivo de imagem individual
   */
  async validateSingle(filePath: string, materialSpecs: MaterialSpecs): Promise<BatchResult> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Arquivo não encontrado: ${filePath}`);
    }

    const buffer = fs.readFileSync(filePath);
    const format = this.detectImageFormat(filePath);

    const request: RenderRequest = {
      imageBuffer: buffer,
      imageFormat: format,
      materialSpecs,
      timeoutMs: this.options.timeoutMs
    };

    const result = await this.orchestrator.render(request);
    
    const batchResult: BatchResult = {
      total: 1,
      successful: result.success ? 1 : 0,
      failed: result.success ? 0 : 1,
      averageTime: result.processingTimeMs,
      fidelityDistribution: {
        0: result.success ? 0 : 1,
        1: (result.success && result.fidelityLevel === 1) ? 1 : 0,
        2: (result.success && result.fidelityLevel === 2) ? 1 : 0,
        3: (result.success && result.fidelityLevel === 3) ? 1 : 0
      },
      errors: result.success ? [] : [{
        file: filePath,
        error: result.error?.message || 'Erro desconhecido',
        fidelity: result.fidelityLevel
      }],
      details: [result]
    };

    return batchResult;
  }

  /**
   * Validação em lote de múltiplas imagens
   */
  async validateBatch(
    directoryPath: string, 
    materialSpecs: MaterialSpecs,
    filePattern: string = '*.{jpg,jpeg,png}'
  ): Promise<BatchResult> {
    if (!fs.existsSync(directoryPath)) {
      throw new Error(`Diretório não encontrado: ${directoryPath}`);
    }

    const files = this.findImageFiles(directoryPath, filePattern);
    if (files.length === 0) {
      throw new Error(`Nenhum arquivo de imagem encontrado em: ${directoryPath}`);
    }

    const results: BatchResult = {
      total: files.length,
      successful: 0,
      failed: 0,
      averageTime: 0,
      fidelityDistribution: { 0: 0, 1: 0, 2: 0, 3: 0 },
      errors: [],
      details: []
    };

    const totalStartTime = Date.now();

    for (let i = 0; i < files.length; i++) {
      const filePath = files[i];
      
      if (this.options.verbose) {
        console.log(`Processando ${i + 1}/${files.length}: ${path.basename(filePath)}`);
      }

      try {
        const fileResult = await this.validateSingle(filePath, materialSpecs);
        
        // Consolidar resultados
        results.successful += fileResult.successful;
        results.failed += fileResult.failed;
        
        for (let fidelity in fileResult.fidelityDistribution) {
          const level = parseInt(fidelity) as 0 | 1 | 2 | 3;
          results.fidelityDistribution[level] += fileResult.fidelityDistribution[level];
        }
        
        results.errors.push(...fileResult.errors);
        results.details.push(...fileResult.details);

        // Atualizar tempo médio
        results.averageTime = results.details.reduce((sum, detail) => 
          sum + detail.processingTimeMs, 0) / results.details.length;

      } catch (error) {
        results.failed++;
        results.errors.push({
          file: filePath,
          error: error instanceof Error ? error.message : 'Erro desconhecido',
          fidelity: 0
        });
      }
    }

    return results;
  }

  /**
   * Valida a confiabilidade geral do sistema
   */
  async validateSystemReliability(testDirectory: string): Promise<{
    overallScore: number;
    successRate: number;
    averageFidelity: number;
    recommendations: string[];
    passed: boolean;
  }> {
    const testMaterial: MaterialSpecs = {
      id: 'test-ceramic-001',
      name: 'Cerâmica Teste',
      category: 'ceramic',
      pattern: 'tiled',
      scale: 1.0
    };

    const result = await this.validateBatch(testDirectory, testMaterial);
    
    const successRate = result.total > 0 ? result.successful / result.total : 0;
    
    // Calcular fidelidade média (peso: 0=0, 1=0.5, 2=0.8, 3=1.0)
    const fidelityWeights = { 0: 0, 1: 0.5, 2: 0.8, 3: 1.0 };
    const totalFidelityScore = Object.entries(result.fidelityDistribution)
      .reduce((sum, [level, count]) => 
        sum + (fidelityWeights[parseInt(level) as keyof typeof fidelityWeights] * count), 0);
    
    const averageFidelity = result.successful > 0 ? totalFidelityScore / result.successful : 0;
    
    // Score geral (50% taxa de sucesso + 50% fidelidade média)
    const overallScore = (successRate * 0.5) + (averageFidelity * 0.5);
    
    const recommendations = [];
    if (successRate < this.options.threshold) {
      recommendations.push(`Taxa de sucesso baixa (${(successRate * 100).toFixed(1)}%). Verificar integração com IA.`);
    }
    if (averageFidelity < 0.6) {
      recommendations.push(`Fidelidade média baixa (${(averageFidelity * 100).toFixed(1)}%). Revisar qualidade da renderização.`);
    }
    if (result.averageTime > 3000) {
      recommendations.push(`Tempo de processamento alto (${result.averageTime}ms). Otimizar performance.`);
    }

    return {
      overallScore,
      successRate,
      averageFidelity,
      recommendations,
      passed: overallScore >= this.options.threshold
    };
  }

  private detectImageFormat(filePath: string): 'jpeg' | 'png' {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.png') return 'png';
    if (ext === '.svg') return 'png'; // tratar SVG como PNG para validação
    return 'jpeg'; // assume .jpg, .jpeg, outros
  }

  private findImageFiles(directoryPath: string, pattern: string): string[] {
    const supportedExtensions = ['.jpg', '.jpeg', '.png', '.svg'];
    return fs.readdirSync(directoryPath)
      .filter(filename => {
        const ext = path.extname(filename).toLowerCase();
        return supportedExtensions.includes(ext);
      })
      .map(filename => path.join(directoryPath, filename));
  }
}

export { PisorealCLIValidator, ValidationOptions };