# Rollback Plan - Multi-Provider AI Architecture (Fase 1)

## Overview

Este documento descreve o procedimento de rollback para a refatoração da Fase 1 da arquitetura multi-provider. O rollback pode ser executado em **menos de 5 minutos** usando a feature flag `USE_LEGACY_MODE`, permitindo reverter para a implementação original sem necessidade de redeploy de código.

**Tempo estimado de rollback:** < 5 minutos  
**Método:** Feature flag `USE_LEGACY_MODE`  
**Impacto:** Zero downtime

## Quick Rollback (< 5 minutos)

### Método 1: Via Variável de Ambiente (Recomendado)

```bash
# 1. Definir USE_LEGACY_MODE=true (30 segundos)
export USE_LEGACY_MODE=true

# 2. Reiniciar serviço (2-3 minutos)
npm run restart:production

# 3. Verificar status (30 segundos)
curl https://api.example.com/health
```

**Tempo total:** ~3-4 minutos

### Método 2: Via Arquivo .env

```bash
# 1. Editar .env (30 segundos)
echo "USE_LEGACY_MODE=true" >> .env

# 2. Reiniciar serviço (2-3 minutos)
npm run restart:production

# 3. Verificar status (30 segundos)
curl https://api.example.com/health
```

**Tempo total:** ~3-4 minutos

### Método 3: Via Plataforma de Deploy (Kubernetes/Docker)

```bash
# 1. Atualizar ConfigMap/Secret (1 minuto)
kubectl set env deployment/render-service USE_LEGACY_MODE=true

# 2. Aguardar rolling restart automático (2-3 minutos)
kubectl rollout status deployment/render-service

# 3. Verificar status (30 segundos)
kubectl get pods -l app=render-service
```

**Tempo total:** ~3-4 minutos

## Rollback Procedure (Passo a Passo)

### Fase 1: Detecção de Problema (0-2 minutos)

#### Indicadores de Necessidade de Rollback

Executar rollback imediatamente se:

1. **Taxa de erro > 10%** por mais de 5 minutos
2. **Latência > baseline + 50%** por mais de 5 minutos
3. **Falhas críticas** em funcionalidades core:
   - Preservação de móveis falha
   - Continuidade geométrica em L-shapes quebrada
   - Escala arquitetônica incorreta
4. **Erros de dependência circular** detectados em logs
5. **Falhas de carregamento de prompts** YAML

#### Comandos de Verificação

```bash
# Verificar taxa de erro
curl https://api.example.com/metrics | grep error_rate

# Verificar latência
curl https://api.example.com/metrics | grep latency_p95

# Verificar logs de erro
tail -f /var/log/render-service/error.log | grep -i "critical\|fatal"

# Verificar health check
curl https://api.example.com/health
```

### Fase 2: Execução do Rollback (2-3 minutos)

#### Passo 1: Ativar USE_LEGACY_MODE (30 segundos)

**Opção A: Via kubectl (Kubernetes)**
```bash
kubectl set env deployment/render-service USE_LEGACY_MODE=true
```

**Opção B: Via docker-compose**
```bash
docker-compose exec render-service sh -c 'export USE_LEGACY_MODE=true'
docker-compose restart render-service
```

**Opção C: Via systemd**
```bash
sudo systemctl set-environment USE_LEGACY_MODE=true
sudo systemctl restart render-service
```

**Opção D: Via PM2**
```bash
pm2 restart render-service --update-env --env production
```

#### Passo 2: Aguardar Reinicialização (2-3 minutos)

```bash
# Kubernetes
kubectl rollout status deployment/render-service

# Docker Compose
docker-compose ps render-service

# Systemd
sudo systemctl status render-service

# PM2
pm2 status render-service
```

#### Passo 3: Verificar Rollback (30 segundos)

```bash
# Verificar que USE_LEGACY_MODE está ativo
curl https://api.example.com/debug/feature-flags | grep USE_LEGACY_MODE

# Verificar health check
curl https://api.example.com/health

# Verificar taxa de erro normalizada
curl https://api.example.com/metrics | grep error_rate

# Verificar latência normalizada
curl https://api.example.com/metrics | grep latency_p95
```

### Fase 3: Validação Pós-Rollback (1-2 minutos)

#### Smoke Tests

```bash
# Teste 1: Análise de imagem
curl -X POST https://api.example.com/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"image": "base64_encoded_image"}'

# Teste 2: Renderização de piso
curl -X POST https://api.example.com/api/render \
  -H "Content-Type: application/json" \
  -d '{"image": "base64_encoded_image", "material": "porcelain-white"}'

# Teste 3: Self-audit (se habilitado)
curl -X POST https://api.example.com/api/render-with-audit \
  -H "Content-Type: application/json" \
  -d '{"image": "base64_encoded_image", "material": "ceramic-gray"}'
```

#### Verificação de Métricas

```bash
# Monitorar por 5 minutos após rollback
watch -n 30 'curl -s https://api.example.com/metrics | grep -E "error_rate|latency_p95|success_rate"'
```

**Critérios de Sucesso:**
- Taxa de erro < 5%
- Latência p95 dentro de baseline ± 10%
- Taxa de sucesso > 95%
- Nenhum erro crítico em logs

## Como USE_LEGACY_MODE Funciona

### Implementação Técnica

A feature flag `USE_LEGACY_MODE` está implementada em `config/featureFlags.ts`:

```typescript
export interface FeatureFlags {
  USE_SELF_AUDIT: boolean;
  GATEWAY_MODE: 'gemini' | 'hf' | 'hybrid';
  USE_HF_PRIMARY: boolean;
  USE_LEGACY_MODE: boolean;  // ← Flag de rollback
}

export function getFeatureFlags(): FeatureFlags {
  const flags: FeatureFlags = {
    USE_SELF_AUDIT: process.env.ENABLE_SELF_AUDIT === 'true',
    GATEWAY_MODE: validateGatewayMode(process.env.GATEWAY_MODE),
    USE_HF_PRIMARY: process.env.GATEWAY_MODE === 'hf',
    USE_LEGACY_MODE: process.env.USE_LEGACY_MODE === 'true'  // ← Lê de env var
  };
  return flags;
}
```

### Comportamento no Código

Quando `USE_LEGACY_MODE=true`, o sistema:

1. **Usa código original** de `geminiService.server.ts.backup` e `renderWithSelfAuditService.ts.backup`
2. **Ignora novos módulos** (`renderCoreService.ts`, `promptLoader.ts`)
3. **Usa prompts hardcoded** originais ao invés de YAML
4. **Usa verificações inline** de `process.env` ao invés de `featureFlags.ts`

### Arquivos de Backup

Os arquivos originais são preservados como backup:

```
services/
├── geminiService.server.ts.backup      # ← Código original
├── geminiService.server.ts             # ← Código refatorado
├── renderWithSelfAuditService.ts.backup # ← Código original
└── renderWithSelfAuditService.ts       # ← Código refatorado
```

## Testes de Rollback

### Teste em Ambiente de Desenvolvimento

```bash
# 1. Ativar USE_LEGACY_MODE
export USE_LEGACY_MODE=true

# 2. Iniciar serviço
npm run dev

# 3. Executar smoke tests
npm run test:smoke

# 4. Verificar logs
tail -f logs/development.log

# 5. Desativar USE_LEGACY_MODE
export USE_LEGACY_MODE=false

# 6. Reiniciar e verificar
npm run dev
npm run test:smoke
```

### Teste em Ambiente de Staging

```bash
# 1. Ativar USE_LEGACY_MODE em staging
kubectl set env deployment/render-service USE_LEGACY_MODE=true -n staging

# 2. Aguardar rollout
kubectl rollout status deployment/render-service -n staging

# 3. Executar smoke tests
npm run test:smoke:staging

# 4. Monitorar métricas por 10 minutos
watch -n 60 'curl -s https://staging.example.com/metrics'

# 5. Desativar USE_LEGACY_MODE
kubectl set env deployment/render-service USE_LEGACY_MODE=false -n staging

# 6. Aguardar rollout
kubectl rollout status deployment/render-service -n staging

# 7. Verificar que refatoração funciona
npm run test:smoke:staging
```

### Teste de Tempo de Rollback

```bash
#!/bin/bash
# Script para medir tempo de rollback

echo "Iniciando teste de rollback..."
START_TIME=$(date +%s)

# Ativar USE_LEGACY_MODE
kubectl set env deployment/render-service USE_LEGACY_MODE=true

# Aguardar rollout
kubectl rollout status deployment/render-service

# Verificar health
until curl -f https://api.example.com/health; do
  sleep 5
done

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo "Rollback completado em $DURATION segundos"

if [ $DURATION -lt 300 ]; then
  echo "✅ Rollback dentro do SLA (< 5 minutos)"
else
  echo "❌ Rollback excedeu SLA de 5 minutos"
fi
```

## Verificação de Rollback

### Checklist de Verificação

Após executar rollback, verificar:

- [ ] `USE_LEGACY_MODE=true` está ativo (verificar via `/debug/feature-flags`)
- [ ] Health check retorna 200 OK
- [ ] Taxa de erro < 5%
- [ ] Latência p95 dentro de baseline ± 10%
- [ ] Taxa de sucesso > 95%
- [ ] Smoke tests passam (análise, renderização, self-audit)
- [ ] Nenhum erro crítico em logs
- [ ] Preservação de móveis funciona corretamente
- [ ] Continuidade geométrica em L-shapes funciona
- [ ] Escala arquitetônica está correta

### Comandos de Verificação Automatizada

```bash
#!/bin/bash
# Script de verificação pós-rollback

echo "Verificando rollback..."

# 1. Verificar USE_LEGACY_MODE
LEGACY_MODE=$(curl -s https://api.example.com/debug/feature-flags | jq -r '.USE_LEGACY_MODE')
if [ "$LEGACY_MODE" = "true" ]; then
  echo "✅ USE_LEGACY_MODE ativo"
else
  echo "❌ USE_LEGACY_MODE não está ativo"
  exit 1
fi

# 2. Verificar health
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" https://api.example.com/health)
if [ "$HEALTH" = "200" ]; then
  echo "✅ Health check OK"
else
  echo "❌ Health check falhou: $HEALTH"
  exit 1
fi

# 3. Verificar taxa de erro
ERROR_RATE=$(curl -s https://api.example.com/metrics | grep error_rate | awk '{print $2}')
if (( $(echo "$ERROR_RATE < 0.05" | bc -l) )); then
  echo "✅ Taxa de erro OK: $ERROR_RATE"
else
  echo "❌ Taxa de erro alta: $ERROR_RATE"
  exit 1
fi

# 4. Verificar latência
LATENCY_P95=$(curl -s https://api.example.com/metrics | grep latency_p95 | awk '{print $2}')
BASELINE=2000  # 2 segundos
MAX_LATENCY=$(echo "$BASELINE * 1.1" | bc)
if (( $(echo "$LATENCY_P95 < $MAX_LATENCY" | bc -l) )); then
  echo "✅ Latência OK: ${LATENCY_P95}ms"
else
  echo "❌ Latência alta: ${LATENCY_P95}ms (baseline: ${BASELINE}ms)"
  exit 1
fi

# 5. Executar smoke tests
npm run test:smoke
if [ $? -eq 0 ]; then
  echo "✅ Smoke tests passaram"
else
  echo "❌ Smoke tests falharam"
  exit 1
fi

echo "✅ Rollback verificado com sucesso!"
```

## Rollback de Emergência

### Cenário: Sistema Completamente Inoperante

Se o sistema está completamente inoperante e não responde:

#### Opção 1: Rollback de Código (10-15 minutos)

```bash
# 1. Restaurar arquivos de backup
cd services/
cp geminiService.server.ts.backup geminiService.server.ts
cp renderWithSelfAuditService.ts.backup renderWithSelfAuditService.ts

# 2. Rebuild
npm run build

# 3. Redeploy
npm run deploy:production

# 4. Verificar
curl https://api.example.com/health
```

#### Opção 2: Rollback de Deploy (5-10 minutos)

```bash
# Kubernetes
kubectl rollout undo deployment/render-service

# Docker
docker-compose down
docker-compose up -d --build

# Git-based deploy
git revert HEAD
git push origin main
```

## Monitoramento Pós-Rollback

### Métricas a Monitorar (Primeiras 24 horas)

1. **Taxa de erro** (alvo: < 5%)
2. **Latência p50, p95, p99** (alvo: baseline ± 10%)
3. **Taxa de sucesso** (alvo: > 95%)
4. **Throughput** (requisições/segundo)
5. **Uso de CPU e memória**
6. **Logs de erro** (buscar por padrões anormais)

### Dashboard de Monitoramento

```bash
# Grafana query para taxa de erro
rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m])

# Grafana query para latência p95
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Grafana query para taxa de sucesso
rate(http_requests_total{status=~"2.."}[5m]) / rate(http_requests_total[5m])
```

### Alertas Configurados

- **Taxa de erro > 10%** por 5 minutos → Alerta crítico
- **Latência p95 > baseline + 50%** por 5 minutos → Alerta crítico
- **Taxa de sucesso < 90%** por 5 minutos → Alerta warning
- **Uso de CPU > 80%** por 10 minutos → Alerta warning
- **Uso de memória > 85%** por 10 minutos → Alerta warning

## Comunicação de Rollback

### Template de Comunicação Interna

```
ASSUNTO: [PRODUÇÃO] Rollback executado - Multi-Provider AI Architecture

STATUS: Rollback completado com sucesso
TEMPO: [X] minutos
MÉTODO: Feature flag USE_LEGACY_MODE=true

MOTIVO:
- [Descrever problema que motivou rollback]

IMPACTO:
- Downtime: [X] minutos
- Usuários afetados: [X]
- Requisições falhadas: [X]

AÇÕES TOMADAS:
1. Ativado USE_LEGACY_MODE=true às [HH:MM]
2. Reiniciado serviço às [HH:MM]
3. Verificado health check às [HH:MM]
4. Confirmado métricas normalizadas às [HH:MM]

PRÓXIMOS PASSOS:
- Investigar causa raiz
- Corrigir problema em staging
- Planejar nova tentativa de deploy

CONTATO: [Nome do responsável]
```

### Template de Comunicação Externa (Se necessário)

```
Prezados clientes,

Identificamos um problema técnico que afetou temporariamente nosso serviço 
de renderização de pisos entre [HH:MM] e [HH:MM] de hoje.

O problema foi resolvido e o serviço está operando normalmente.

Pedimos desculpas pelo inconveniente.

Equipe Técnica
```

## Prevenção de Necessidade de Rollback

### Checklist Pré-Deploy

Antes de fazer deploy para produção, garantir:

- [ ] Todos os testes passam (unit, property, integration, regression)
- [ ] Cobertura de código >= 80%
- [ ] Nenhuma dependência circular detectada
- [ ] Nenhum erro de tipo TypeScript
- [ ] Smoke tests passam em staging
- [ ] Métricas de staging estáveis por 24 horas
- [ ] Canary release testado (10% → 50% → 100%)
- [ ] Rollback plan testado em staging
- [ ] Equipe de plantão notificada
- [ ] Dashboards de monitoramento configurados
- [ ] Alertas configurados

### Estratégia de Deploy Seguro

1. **Deploy em staging** (Dia 6)
   - Executar smoke tests
   - Monitorar por 24 horas
   - Validar comportamento crítico

2. **Canary release 10%** (Dia 7, 09:00)
   - Rotear 10% do tráfego
   - Monitorar por 2 horas
   - Comparar com grupo de controle

3. **Canary release 50%** (Dia 7, 11:00)
   - Rotear 50% do tráfego
   - Monitorar por 2 horas
   - Comparar com grupo de controle

4. **Deploy completo 100%** (Dia 7, 13:00)
   - Rotear 100% do tráfego
   - Monitorar por 24 horas
   - Manter USE_LEGACY_MODE disponível por 7 dias

## Contatos de Emergência

### Equipe de Plantão

- **Tech Lead:** [Nome] - [Telefone] - [Email]
- **DevOps:** [Nome] - [Telefone] - [Email]
- **Backend Engineer:** [Nome] - [Telefone] - [Email]
- **SRE:** [Nome] - [Telefone] - [Email]

### Escalação

1. **Nível 1:** Backend Engineer de plantão
2. **Nível 2:** Tech Lead (se problema não resolvido em 15 minutos)
3. **Nível 3:** CTO (se problema não resolvido em 30 minutos)

## Conclusão

Este rollback plan garante que a refatoração da Fase 1 pode ser revertida em **menos de 5 minutos** usando a feature flag `USE_LEGACY_MODE`, minimizando riscos e permitindo deploy seguro com confiança.

**Tempo de rollback garantido:** < 5 minutos  
**Método:** Feature flag `USE_LEGACY_MODE=true`  
**Impacto:** Zero downtime (apenas restart do serviço)

---

**Última atualização:** [Data]  
**Versão:** 1.0  
**Responsável:** [Nome do Tech Lead]
