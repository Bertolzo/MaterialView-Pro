#!/usr/bin/env node

import { Command } from 'commander';
import { PisorealCLIValidator } from './validator';
import fs from 'fs';
import path from 'path';

const program = new Command();

program
  .name('pisoreal-validator')
  .description('CLI tool for validating Pisorealview rendering system')
  .version('1.0.0');

// Comando: single - validação única
program
  .command('single')
  .description('Validate a single image file')
  .argument('<image-path>', 'Path to the image file')
  .option('-m, --material <specs>', 'Material specs JSON string or path to JSON file')
  .option('-t, --timeout <ms>', 'Timeout in milliseconds', '8000')
  .option('-v, --verbose', 'Verbose output')
  .action(async (imagePath, options) => {
    try {
      const materialSpecs = await parseMaterialSpecs(options.material);
      const validator = new PisorealCLIValidator({
        timeoutMs: parseInt(options.timeout),
        verbose: options.verbose,
        threshold: 0.7
      });

      console.log(`🔍 Validando: ${path.basename(imagePath)}`);
      console.log(`📦 Material: ${materialSpecs.name}`);
      
      const result = await validator.validateSingle(imagePath, materialSpecs);
      
      printSingleResult(result);
      
      // Código de saída baseado no sucesso
      process.exit(result.successful === 1 ? 0 : 1);
      
    } catch (error) {
      console.error('❌ Erro:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Comando: batch - validação em lote
program
  .command('batch')
  .description('Batch validation of multiple images in a directory')
  .argument('<directory-path>', 'Path to the directory containing images')
  .option('-m, --material <specs>', 'Material specs JSON string or path to JSON file')
  .option('-t, --timeout <ms>', 'Timeout in milliseconds', '8000')
  .option('-v, --verbose', 'Verbose output')
  .option('-p, --pattern <pattern>', 'File pattern (e.g., *.jpg)', '*.{jpg,jpeg,png}')
  .action(async (directoryPath, options) => {
    try {
      const materialSpecs = await parseMaterialSpecs(options.material);
      const validator = new PisorealCLIValidator({
        timeoutMs: parseInt(options.timeout),
        verbose: options.verbose,
        threshold: 0.7
      });

      console.log(`📂 Processando diretório: ${directoryPath}`);
      console.log(`📦 Material: ${materialSpecs.name}`);
      console.log(`🔍 Padrão: ${options.pattern}`);
      
      const result = await validator.validateBatch(directoryPath, materialSpecs, options.pattern);
      
      printBatchResult(result);
      
      // Sucesso se pelo menos 70% passaram com fidelidade >= 1
      const successRate = result.total > 0 ? result.successful / result.total : 0;
      const highFidelityRate = (result.fidelityDistribution[2] + result.fidelityDistribution[3]) / result.total;
      
      const passed = successRate >= 0.7 && highFidelityRate >= 0.5;
      process.exit(passed ? 0 : 1);
      
    } catch (error) {
      console.error('❌ Erro:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Comando: system-test - validação completa do sistema
program
  .command('system-test')
  .description('Run comprehensive system reliability test')
  .argument('<test-directory>', 'Path to directory with test images')
  .option('-t, --timeout <ms>', 'Timeout in milliseconds', '8000')
  .option('-v, --verbose', 'Verbose output')
  .option('--threshold <score>', 'Minimum threshold score (0-1)', '0.7')
  .action(async (testDirectory, options) => {
    try {
      const validator = new PisorealCLIValidator({
        timeoutMs: parseInt(options.timeout),
        verbose: options.verbose,
        threshold: parseFloat(options.threshold)
      });

      console.log('🧪 Teste de Confiabilidade do Sistema');
      console.log(`📂 Diretório de teste: ${testDirectory}`);
      console.log(`🎯 Limite mínimo: ${options.threshold}`);
      
      const result = await validator.validateSystemReliability(testDirectory);
      
      printSystemTestResult(result);
      
      process.exit(result.passed ? 0 : 1);
      
    } catch (error) {
      console.error('❌ Erro:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Helper functions
async function parseMaterialSpecs(specsInput: string) {
  if (!specsInput) {
    // Material padrão para testes
    return {
      id: 'default-ceramic-001',
      name: 'Cerâmica Portuguesa',
      category: 'ceramic',
      pattern: 'tiled',
      scale: 1.0,
      roughness: 0.3,
      specularity: 0.2
    };
  }

  // Tentar interpretar como JSON direto
  try {
    return JSON.parse(specsInput);
  } catch {
    // Tentar ler de arquivo
    if (fs.existsSync(specsInput)) {
      const content = fs.readFileSync(specsInput, 'utf8');
      return JSON.parse(content);
    }
    throw new Error(`Material specs inválidas: ${specsInput}`);
  }
}

function printSingleResult(result: any) {
  const detail = result.details[0];
  
  console.log('\n📊 Resultado da Validação:');
  console.log(`✅ Sucesso: ${detail.success ? 'Sim' : 'Não'}`);
  console.log(`⏱️  Tempo: ${detail.processingTimeMs}ms`);
  console.log(`✨ Fidelidade: Nível ${detail.fidelityLevel}`);
  
  if (!detail.success) {
    console.log(`❌ Erro: ${detail.error?.type}: ${detail.error?.message}`);
  }
  
  console.log(`📈 Total: ${result.total}, ✅ Sucessos: ${result.successful}, ❌ Falhas: ${result.failed}`);
}

function printBatchResult(result: any) {
  console.log('\n📊 Resultado do Lote:');
  console.log(`📁 Total de arquivos: ${result.total}`);
  console.log(`✅ Sucessos: ${result.successful} (${((result.successful / result.total) * 100).toFixed(1)}%)`);
  console.log(`❌ Falhas: ${result.failed} (${((result.failed / result.total) * 100).toFixed(1)}%)`);
  console.log(`⏱️  Tempo médio: ${result.averageTime.toFixed(0)}ms`);
  
  console.log('\n📈 Distribuição de Fidelidade:');
  console.log(`  Nível 3 (Alta): ${result.fidelityDistribution[3]} (${((result.fidelityDistribution[3] / result.total) * 100).toFixed(1)}%)`);
  console.log(`  Nível 2 (Média): ${result.fidelityDistribution[2]} (${((result.fidelityDistribution[2] / result.total) * 100).toFixed(1)}%)`);
  console.log(`  Nível 1 (Básica): ${result.fidelityDistribution[1]} (${((result.fidelityDistribution[1] / result.total) * 100).toFixed(1)}%)`);
  console.log(`  Nível 0 (Falha): ${result.fidelityDistribution[0]} (${((result.fidelityDistribution[0] / result.total) * 100).toFixed(1)}%)`);
  
  if (result.errors.length > 0) {
    console.log('\n❌ Erros encontrados:');
    result.errors.slice(0, 5).forEach((error: any, index: number) => {
      console.log(`  ${index + 1}. ${path.basename(error.file)}: ${error.error}`);
    });
    if (result.errors.length > 5) {
      console.log(`  ... e mais ${result.errors.length - 5} erro(s)`);
    }
  }
}

function printSystemTestResult(result: any) {
  console.log('\n🧪 Resultado do Teste de Sistema:');
  console.log(`🎯 Score Geral: ${(result.overallScore * 100).toFixed(1)}%`);
  console.log(`📈 Taxa de Sucesso: ${(result.successRate * 100).toFixed(1)}%`);
  console.log(`✨ Fidelidade Média: ${(result.averageFidelity * 100).toFixed(1)}%`);
  console.log(`✅ Status: ${result.passed ? 'APROVADO ✅' : 'REPROVADO ❌'}`);
  
  if (result.recommendations.length > 0) {
    console.log('\n💡 Recomendações:');
    result.recommendations.forEach((rec: string, index: number) => {
      console.log(`  ${index + 1}. ${rec}`);
    });
  }
}

// Executar o programa
program.parse();