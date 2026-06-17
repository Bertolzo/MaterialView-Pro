#!/usr/bin/env tsx

import { gatewayOrchestrator } from '../src/services/gateway';
import fs from 'fs';
import path from 'path';

interface ValidationResult {
  fileName: string;
  success: boolean;
  processingTime: number;
  providerUsed: string;
  analysis: any;
  error?: string;
}

interface OverallReport {
  timestamp: string;
  totalFiles: number;
  successfulFiles: number;
  successRate: number;
  averageProcessingTime: number;
  totalFilesByType: Record<string, number>;
  providerDistribution: Record<string, number>;
  details: ValidationResult[];
}

async function validateWithGateway(filePath: string): Promise<ValidationResult> {
  const startTime = Date.now();
  
  try {
    console.log(`🧪 Processando: ${path.basename(filePath)}`);
    
    // Ler e converter imagem para base64
    const imageBuffer = fs.readFileSync(filePath);
    const base64 = imageBuffer.toString('base64');
    
    // Usar o gateway para análise
    const analysis = await gatewayOrchestrator.callWithFallback({
      image: base64,
      prompt: `Analise esta imagem de ambiente para simulação de pisos. Identifique:

1. TIPO DE AMBIENTE: sala, cozinha, banheiro, corredor, área externa
2. CARACTERÍSTICAS: dimensões aproximadas, iluminação, obstáculos
3. ÁREA DE PISO: região principal para aplicação do piso
4. OBSERVAÇÕES: qualquer característica relevante para escolha de piso

Forneça resposta em JSON estruturado para processamento automático.`,
      maxTokens: 800
    });
    
    const processingTime = Date.now() - startTime;
    
    return {
      fileName: path.basename(filePath),
      success: true,
      processingTime,
      providerUsed: 'gateway-orchestrator',
      analysis: analysis.text
    };
    
  } catch (error) {
    console.error(`❌ Erro em ${path.basename(filePath)}:`, error);
    
    return {
      fileName: path.basename(filePath),
      success: false,
      processingTime: Date.now() - startTime,
      providerUsed: 'none',
      analysis: null,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  }
}

async function validateBatch(photosDirectory: string, outputFile: string) {
  console.log('🚀 INICIANDO VALIDAÇÃO DO GATEWAY DE IA')
  console.log('======================================')
  console.log('📁 Diretório:', photosDirectory)
  console.log('💾 Arquivo de saída:', outputFile)
  console.log('')
  
  const results: ValidationResult[] = [];
  const fileCounts: Record<string, number> = {};
  const providerCounts: Record<string, number> = {};
  
  // Coletar todas as imagens
  const categories = fs.readdirSync(photosDirectory).filter(item => 
    fs.statSync(path.join(photosDirectory, item)).isDirectory()
  );
  
  let totalFiles = 0;
  
  for (const category of categories) {
    const categoryPath = path.join(photosDirectory, category);
    const files = fs.readdirSync(categoryPath).filter(file => 
      file.endsWith('.jpg') && !file.endsWith('.placeholder')
    );
    
    fileCounts[category] = files.length;
    totalFiles += files.length;
    
    console.log(`🔍 Categoria: ${category.toUpperCase()} (${files.length} arquivos)`);
    
    for (const file of files) {
      const filePath = path.join(categoryPath, file);
      const result = await validateWithGateway(filePath);
      results.push(result);
      
      // Registrar estatísticas do provedor
      providerCounts[result.providerUsed] = (providerCounts[result.providerUsed] || 0) + 1;
      
      if (result.success) {
        console.log(`  ✅ ${file} - ${result.providerUsed} - ${result.processingTime}ms`);
      } else {
        console.log(`  ❌ ${file} - ERRO: ${result.error}`);
      }
    }
    console.log('');
  }
  
  // Calcular estatísticas finais
  const successfulFiles = results.filter(r => r.success).length;
  const averageProcessingTime = results
    .filter(r => r.success)
    .reduce((sum, r) => sum + r.processingTime, 0) / successfulFiles || 0;
  
  const report: OverallReport = {
    timestamp: new Date().toISOString(),
    totalFiles,
    successfulFiles,
    successRate: (successfulFiles / totalFiles) * 100,
    averageProcessingTime,
    totalFilesByType: fileCounts,
    providerDistribution: providerCounts,
    details: results
  };
  
  // Salvar relatório
  fs.writeFileSync(outputFile, JSON.stringify(report, null, 2));
  
  // Exibir resumo
  console.log('🎯 RESUMO DA VALIDAÇÃO')
  console.log('=====================')
  console.log(`📊 Total de arquivos: ${totalFiles}`)
  console.log(`✅ Arquivos processados com sucesso: ${successfulFiles}`)
  console.log(`📈 Taxa de sucesso: ${report.successRate.toFixed(1)}%`)
  console.log(`⏱️ Tempo médio de processamento: ${report.averageProcessingTime.toFixed(0)}ms`)
  console.log('')
  console.log('🔧 Distribuição por categoria:');
  Object.entries(fileCounts).forEach(([cat, count]) => {
    console.log(`   ${cat}: ${count} arquivos`);
  });
  console.log('')
  console.log('🌐 Provedores utilizados:');
  Object.entries(providerCounts).forEach(([provider, count]) => {
    const percentage = ((count / totalFiles) * 100).toFixed(1);
    console.log(`   ${provider}: ${count} (${percentage}%)`);
  });
  console.log('')
  console.log(`💾 Relatório salvo em: ${outputFile}`)
  
  return report;
}

// Executar validação se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  const photosDir = process.argv[2] || './real-test-photos';
  const outputFile = process.argv[3] || './relatorio_gateway_validacao.json';
  
  validateBatch(photosDir, outputFile)
    .then(() => console.log('✅ Validação concluída!'))
    .catch(error => {
      console.error('❌ Erro na validação:', error);
      process.exit(1);
    });
}