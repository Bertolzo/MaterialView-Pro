# Deployment Guide - Phase 1 Refactoring

## Overview

Este guia descreve o processo de deploy para a Fase 1 da refatoração arquitetural, implementando uma estratégia de canary release para minimizar riscos.

## Migration Strategy

### Canary Release (10% → 50% → 100%)

A migração para produção segue uma abordagem gradual:

1. **10% do tráfego** - Task 16.1
   - Deploy inicial com roteamento de 10% do tráfego
   - Monitoramento por 2 horas
   - Rollback automático se métricas falharem

2. **50% do tráfego** - Task 16.3
   - Aumento para 50% do tráfego
   - Monitoramento por 2 horas
   - Validação de métricas em escala maior

3. **100% do tráfego** - Task 16.5
   - Deploy completo
   - Monitoramento contínuo por 24 horas
   - Validação final

## Prerequisites

### 1. Autenticação Vercel

```bash
# Verificar autenticação
npx vercel whoami

# Se não autenticado
npx vercel login
```

### 2. Variáveis de Ambiente

Verifique se todas as variáveis necessárias estão configuradas:

```bash
# Variáveis críticas
GEMINI_API_KEY=your_key_here
USE_LEGACY_MODE=false  # Para nova arquitetura
ENABLE_SELF_AUDIT=true # Opcional
GATEWAY_MODE=gemini    # Modo padrão
```

### 3. Testes Passando

```bash
# Executar suite completa de testes
npm test

# Verificar cobertura mínima (80%)
npm run test:coverage
```

## Deployment Scripts

### deploy:staging
```bash
npm run deploy:staging
```
Deploy para ambiente de staging para validação.

### deploy:production:canary
```bash
npm run deploy:production:canary [percentage]
```
Deploy para produção com canary release (padrão: 10%).

**Parâmetros:**
- `percentage` (opcional): Porcentagem de tráfego (1-50)

**Exemplo:**
```bash
# 10% do tráfego (padrão)
npm run deploy:production:canary

# 20% do tráfego
npm run deploy:production:canary 20
```

### deploy:production:full
```bash
npm run deploy:production:full
```
Deploy completo para produção (100% do tráfego).

### rollback:legacy
```bash
npm run rollback:legacy
```
Rollback para arquitetura legada via feature flag `USE_LEGACY_MODE=true`.

## Task 16.1: Deploy Canary - 10% do Tráfego

### Objetivo
Implementar deploy inicial com roteamento de 10% do tráfego para nova arquitetura.

### Passos

#### 1. Preparação
```bash
# 1.1 Verificar autenticação
npx vercel whoami

# 1.2 Verificar variáveis de ambiente
cat .env | grep -E "USE_LEGACY_MODE|GEMINI_API_KEY"

# 1.3 Garantir que USE_LEGACY_MODE=false
echo "USE_LEGACY_MODE=false" >> .env
```

#### 2. Execução
```bash
# 2.1 Executar deploy canary
npm run deploy:production:canary

# Ou com porcentagem específica
npm run deploy:production:canary 10
```

#### 3. Monitoramento
O script automaticamente:
- Executa deploy para produção
- Configura roteamento de 10% do tráfego
- Inicia monitoramento por 2 horas
- Coleta métricas a cada 30 minutos
- Executa rollback automático se necessário

#### 4. Validação
Durante o monitoramento, verificar:

| Métrica | Target | Status |
|---------|--------|--------|
| Taxa de sucesso | >= 95% | ✅/❌ |
| Taxa de erro | < 5% | ✅/❌ |
| Latência análise | 3000ms ± 10% | ✅/❌ |
| Latência render | 8000ms ± 10% | ✅/❌ |

### Saída Esperada

```
🚀 DEPLOY CANARY - 10% DO TRÁFEGO
========================================

🔐 Verificando autenticação Vercel...
✅ Autenticado no Vercel

⚙️  Configurando variáveis de ambiente para canary...
📦 Executando deploy para produção...
✅ Deploy executado com sucesso
🌐 URL do deploy: https://pisosrealview-pro-git-feature-branch.vercel.app
🆔 ID do deploy: dpl_abc123xyz789

🔄 Configurando roteamento de tráfego...
📈 10% do tráfego será direcionado para nova versão
📉 90% do tráfego permanece na versão legada

📊 Iniciando monitoramento...
⏱️  Iniciando monitoramento por 2 horas...
📈 Coletando métricas...

📊 Ciclo 1/4 (30 minutos cada)
  ✅ Taxa de sucesso: 97.25%
  ✅ Taxa de erro: 2.75%
  ✅ Latência análise: 2950ms
  ✅ Latência render: 7850ms

... (ciclos 2-4)

📁 Logs salvos em: logs/canary-monitor-1234567890.json
✅ Todas as métricas dentro do esperado durante o monitoramento

========================================
✅ DEPLOY CANARY CONCLUÍDO
========================================
🌐 URL: https://pisosrealview-pro-git-feature-branch.vercel.app

📋 Próximos passos:
1. Verificar métricas em tempo real no dashboard Vercel
2. Monitorar logs de erro nos próximos 24 horas
3. Proceed to Task 16.3: Aumentar para 50% do tráfego
4. Rollback disponível via: USE_LEGACY_MODE=true
```

## Rollback Procedure

### Rollback Automático
O script executa rollback automático se:
- Taxa de sucesso < 95% por mais de 30 minutos
- Taxa de erro > 5% por mais de 30 minutos
- Latência consistentemente fora do baseline ± 10%

### Rollback Manual
```bash
# Via script
npm run rollback:legacy

# Ou manualmente
npx vercel env rm USE_LEGACY_MODE production --yes
npx vercel env add USE_LEGACY_MODE production --value true
```

### Verificação de Rollback
```bash
# Verificar feature flag
curl -s https://pisosrealview-pro.vercel.app/api/health | grep legacy_mode

# Ou via dashboard Vercel
# https://vercel.com/dashboard/[project]/settings/environment-variables
```

## Monitoring Dashboard

### Métricas a Monitorar

#### 1. Performance
- **Análise de imagem**: P95 < 3300ms
- **Renderização**: P95 < 8800ms
- **Throughput**: Requisições por minuto

#### 2. Reliability
- **Success Rate**: >= 95%
- **Error Rate**: < 5%
- **Error Types**: 429, 503, timeout

#### 3. Business Metrics
- **User Satisfaction**: Tempo de resposta
- **Cost Efficiency**: Custo por requisição
- **Quality**: Taxa de validação de self-audit

### Ferramentas
1. **Vercel Analytics**: Métricas de performance
2. **Sentry**: Error tracking e monitoring
3. **Custom Logs**: `logs/canary-monitor-*.json`
4. **Scripts**: `scripts/view-monitoring-results.ts`

## Troubleshooting

### Problemas Comuns

#### 1. Deploy Falha
```bash
# Verificar logs
npx vercel logs [deployment-id]

# Verificar build
npm run build

# Verificar tipos
npm run lint
```

#### 2. Alta Taxa de Erro
- Verificar API keys do Gemini
- Verificar rate limits
- Verificar timeout configuration

#### 3. Alta Latência
- Verificar tamanho dos prompts
- Verificar network latency
- Verificar resource constraints

#### 4. Rollback Não Funciona
```bash
# Forçar rollback
npx vercel env rm USE_LEGACY_MODE production --yes
npx vercel env add USE_LEGACY_MODE production --value true
npx vercel redeploy --prod --yes
```

## Next Steps

### Após Task 16.1 (10% canary)

1. **Monitorar por 24 horas** adicional
2. **Analisar métricas** comparativas
3. **Coletar feedback** de usuários
4. **Proceed to Task 16.3** (50% canary)

### Critérios para Progressão

Progressão para 50% do tráfego requer:
- ✅ Success rate >= 95% por 24 horas
- ✅ Error rate < 5% por 24 horas
- ✅ Latência dentro do baseline ± 10%
- ✅ Nenhum erro crítico reportado
- ✅ Feedback positivo de usuários

## References

- [Task 16.1 Specification](../../.kiro/specs/multi-provider-ai-architecture/tasks.md#161-deploy-canary---10-do-tráfego)
- [Monitoring Quick Start](./MONITORING-QUICKSTART.md)
- [Rollback Plan](./rollback-plan.md)
- [Phase 1 Architecture](../architecture/phase1-architecture.md)
- [Feature Flags Guide](../guides/feature-flags.md)