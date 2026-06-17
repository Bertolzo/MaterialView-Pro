import { BatchResult } from './lib/core/types';
import fs from 'fs';

/**
 * Sistema de report para gerar saídas estruturadas da validação
 */
export class ValidationReporter {
  
  /**
   * Gera relatório JSON estruturado
   */
  static generateJSONReport(result: BatchResult, outputPath: string): void {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: result.total,
        successful: result.successful,
        failed: result.failed,
        successRate: result.total > 0 ? result.successful / result.total : 0,
        averageProcessingTime: result.averageTime,
        fidelityDistribution: result.fidelityDistribution
      },
      details: result.details,
      errors: result.errors,
      systemMetrics: {
        exitCode: this.calculateExitCode(result),
        overallScore: this.calculateOverallScore(result),
        recommendations: this.generateRecommendations(result)
      }
    };
    
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
  }

  /**
   * Gera relatório em formato legível para humanos
   */
  static generateHumanReport(result: BatchResult): string {
    const successRate = result.total > 0 ? result.successful / result.total : 0;
    const highFidelityRate = (result.fidelityDistribution[2] + result.fidelityDistribution[3]) / result.total;
    
    return `
# 📊 Relatório de Validação Pisorealview

## 📈 Resumo Estatístico
- **Total de Arquivos**: ${result.total}
- **✅ Sucessos**: ${result.successful} (${(successRate * 100).toFixed(1)}%)
- **❌ Falhas**: ${result.failed} (${((1 - successRate) * 100).toFixed(1)}%)
- **⏱️ Tempo Médio**: ${result.averageTime.toFixed(0)}ms

## ✨ Distribuição de Fidelidade
- **Nível 3 (Alta)**: ${result.fidelityDistribution[3]} (${((result.fidelityDistribution[3] / result.total) * 100).toFixed(1)}%)
- **Nível 2 (Média)**: ${result.fidelityDistribution[2]} (${((result.fidelityDistribution[2] / result.total) * 100).toFixed(1)}%)
- **Nível 1 (Básica)**: ${result.fidelityDistribution[1]} (${((result.fidelityDistribution[1] / result.total) * 100).toFixed(1)}%)
- **Nível 0 (Falha)**: ${result.fidelityDistribution[0]} (${((result.fidelityDistribution[0] / result.total) * 100).toFixed(1)}%)

## 🎯 Resultado da Validação
${this.calculateExitCode(result) === 0 ? '✅ **SISTEMA APROVADO**' : '❌ **SISTEMA REPROVADO**'}

**Critérios:**
- Taxa de sucesso ≥ 70%: ${successRate >= 0.7 ? '✅' : '❌'} (${(successRate * 100).toFixed(1)}%)
- Alta fidelidade ≥ 50%: ${highFidelityRate >= 0.5 ? '✅' : '❌'} (${(highFidelityRate * 100).toFixed(1)}%)

## 💡 Recomendações
${this.generateRecommendations(result).join('\n')}

## 📋 Detalhes dos Erros
${result.errors.length > 0 ? result.errors.map((error, index) => 
  `${index + 1}. **${error.file}**: ${error.error}`).join('\n') : 'Nenhum erro crítico encontrado.'}

---
*Relatório gerado em: ${new Date().toLocaleString()}*
    `;
  }

  /**
   * Gera relatório para CI/CD (formato compacto)
   */
  static generateCICDReport(result: BatchResult): string {
    const successRate = result.total > 0 ? result.successful / result.total : 0;
    const highFidelityRate = (result.fidelityDistribution[2] + result.fidelityDistribution[3]) / result.total;
    
    return JSON.stringify({
      status: this.calculateExitCode(result) === 0 ? 'PASS' : 'FAIL',
      metrics: {
        total_files: result.total,
        success_rate: Math.round(successRate * 1000) / 10,
        high_fidelity_rate: Math.round(highFidelityRate * 1000) / 10,
        avg_processing_time: Math.round(result.averageTime),
        fidelity_distribution: result.fidelityDistribution
      },
      timestamp: Math.floor(Date.now() / 1000)
    });
  }

  /**
   * Calcula código de saída baseado em critérios de qualidade
   */
  static calculateExitCode(result: BatchResult): number {
    const successRate = result.total > 0 ? result.successful / result.total : 0;
    const highFidelityRate = (result.fidelityDistribution[2] + result.fidelityDistribution[3]) / result.total;
    
    // Critérios aprovação: 70% sucesso + 50% alta fidelidade
    return (successRate >= 0.7 && highFidelityRate >= 0.5) ? 0 : 1;
  }

  /**
   * Calcula score geral (0-100)
   */
  static calculateOverallScore(result: BatchResult): number {
    const successRate = result.total > 0 ? result.successful / result.total : 0;
    const fidelityWeights = { 0: 0, 1: 0.5, 2: 0.8, 3: 1.0 };
    
    const totalFidelityScore = Object.entries(result.fidelityDistribution)
      .reduce((sum, [level, count]) => 
        sum + (fidelityWeights[parseInt(level) as keyof typeof fidelityWeights] * count), 0);
    
    const averageFidelity = result.successful > 0 ? totalFidelityScore / result.successful : 0;
    
    return Math.round(((successRate * 0.5) + (averageFidelity * 0.5)) * 100);
  }

  /**
   * Gera recomendações baseadas nos resultados
   */
  static generateRecommendations(result: BatchResult): string[] {
    const recommendations: string[] = [];
    const successRate = result.total > 0 ? result.successful / result.total : 0;
    const highFidelityRate = (result.fidelityDistribution[2] + result.fidelityDistribution[3]) / result.total;
    
    if (successRate < 0.7) {
      recommendations.push(`🔧 **Melhorar taxa de sucesso**: Atual ${(successRate * 100).toFixed(1)}% (mínimo recomendado: 70%)`);
    }
    
    if (highFidelityRate < 0.5) {
      recommendations.push(`🎨 **Otimizar fidelidade**: Atual ${(highFidelityRate * 100).toFixed(1)}% de alta/mádia fidelidade (mínimo: 50%)`);
    }
    
    if (result.averageTime > 3000) {
      recommendations.push(`⚡ **Reduzir tempo de processamento**: Atual ${result.averageTime.toFixed(0)}ms (ideal: <3000ms)`);
    }
    
    if (result.fidelityDistribution[0] > result.total * 0.1) {
      recommendations.push(`🐛 **Resolver falhas críticas**: ${result.fidelityDistribution[0]} arquivos com fidelidade 0`);
    }
    
    if (recommendations.length === 0) {
      recommendations.push('✅ **Sistema estável**: Nenhuma intervenção crítica necessária');
    }
    
    return recommendations;
  }
}

export default ValidationReporter;