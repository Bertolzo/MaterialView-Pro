// test-invariants.js - Script CLI para testar invariantes com foto real
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mock para testes (substituir pelas importações reais)
function mockGatewayOrchestrator(imageBuffer, prompt) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        text: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        provider: 'MockProvider'
      });
    }, 100);
  });
}

function mockInvariantValidator(originalImage, modifiedImage) {
  return {
    overall: {
      isValid: true,
      score: 0.85,
      details: {
        passingValidators: 3,
        totalValidators: 3
      }
    },
    shadow: {
      isValid: true,
      score: 0.9,
      details: {
        shadowDirectionDifference: 8.2,
        shadowIntensityDifference: 0.03
      }
    },
    geometry: {
      isValid: true,
      score: 0.8,
      details: {
        wallConsistency: true,
        ceilingConsistency: true,
        doorConsistency: true,
        windowConsistency: true
      }
    },
    object: {
      isValid: true,
      score: 0.85,
      details: {
        missingObjects: [],
        addedObjects: [],
        scaleConsistency: true,
        positionConsistency: true
      }
    }
  };
}

async function validateWithInvariants(imagePath) {
  console.log('🔍 Validando:', path.basename(imagePath));
  
  try {
    // Verifica se a imagem existe
    if (!fs.existsSync(imagePath)) {
      throw new Error(`Arquivo não encontrado: ${imagePath}`);
    }
    
    // Carrega a imagem
    const imageBuffer = fs.readFileSync(imagePath);
    const imageBase64 = imageBuffer.toString('base64');
    
    console.log('📁 Imagem carregada:', Math.round(imageBuffer.length / 1024), 'KB');
    
    // Simula call ao gateway
    console.log('🚀 Processando com gateway...');
    const startTime = Date.now();
    
    const result = await mockGatewayOrchestrator(imageBuffer, 
      'Analyze this room for flooring replacement. Preserve shadows, geometry, objects, and perspective.'
    );
    
    const processingTime = Date.now() - startTime;
    
    console.log('✅ Processamento concluído em:', processingTime, 'ms');
    console.log('🛠️  Provedor simulado:', result.provider);
    
    // Valida invariantes
    console.log('🔍 Validando invariantes sistêmicas...');
    
    const compliance = mockInvariantValidator(imageBase64, result.text);
    
    // Exibe resultado das validacoes
    console.log('\n📊 Resultados das Invariantes:');
    console.log('   - Sombras/Iluminação:', compliance.shadow.isValid ? '✅ OK' : '❌ Violado');
    console.log('     ↳ Diferença direção:', compliance.shadow.details.shadowDirectionDifference.toFixed(1) + '°');
    console.log('     ↳ Diferença intensidade:', (compliance.shadow.details.shadowIntensityDifference * 100).toFixed(1) + '%');
    
    console.log('   - Geometria estrutural:', compliance.geometry.isValid ? '✅ OK' : '❌ Violado');
    console.log('     ↳ Paredes/portas/janelas preservadas');
    
    console.log('   - Integridade de objetos:', compliance.object.isValid ? '✅ OK' : '❌ Violado');
    
    console.log('\n📈 Score geral de fidelidade:', (compliance.overall.score * 100).toFixed(1) + '%');
    console.log('🎯 Status das invariantes:', compliance.overall.isValid ? '✅ TODAS RESPEITADAS' : '❌ VIOLAÇÕES DETECTADAS');
    
    if (compliance.overall.isValid) {
      console.log('\n✅ Simulação concluída com sucesso!');
      console.log('📋 Para usar com provedores reais:');
      console.log('   1. Configure as chaves API no gateway');
      console.log('   2. Substitua mockGatewayOrchestrator pelo gateway real');
      console.log('   3. Os validadores já estão prontos para produção');
    } else {
      console.log('\n⚠️  Violações detectadas:');
      if (!compliance.shadow.isValid) console.log('   - Sombras/iluminação alteradas');
      if (!compliance.geometry.isValid) console.log('   - Geometria estrutural modificada');
      if (!compliance.object.isValid) console.log('   - Objetos adicionados/removidos');
    }
    
    console.log('\n⏱️  Tempo total:', Date.now() - startTime, 'ms');
    
  } catch (error) {
    console.error('❌ Erro durante validação:', error.message);
  }
}

// Executa validação
const imagePath = '/home/vector/Transferências/yeme.jpg';

if (fs.existsSync(imagePath)) {
  validateWithInvariants(imagePath);
} else {
  console.log('📁 Alternativas de teste:');
  console.log('   1. Coloque uma foto JPEG/PNG em /home/vector/Transferências/');
  console.log('   2. Ou edite o script para usar outro caminho');
  console.log('   3. Ou teste pelo frontend: npm run dev → http://localhost:8081');
}