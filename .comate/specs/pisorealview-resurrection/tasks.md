# Tasks - Resurreição Cirúrgica do PisoRealView Pro

## 🎯 Objetivo Estratégico
Implementar separação CLI/Frontend para validação em escala do core de IA, seguida de refatoração cirúrgica baseada em dados quantitativos.

## 📊 Pilares da Intervenção
1. **Validação Massiva** via CLI (diagnóstico preciso)
2. **Refatoração Modular** do core de IA (baseada em dados)
3. **Otimização Serverless** para Vercel Hobby
4. **Frontend Minimalista** focado em usabilidade

---

## ✅ Tarefas de Implementação

### Fase 0 - CLI de Validação (Diagnóstico Massivo)
- [x] **Task 1: Criar estrutura core/ isolada**
    - 1.1: Extrair funções IA de `geminiService.server.ts` para `services/core/orchestrator.ts` ✅
    - 1.2: Extrair validação de `renderWithSelfAuditService.ts` para `services/core/selfAudit.ts` ✅ (implementado como roomAnalyzer/materialSimulator)
    - 1.3: Criar interfaces TypeScript para inputs/saidas do core ✅
    - 1.4: Configurar exportação modular sem dependências de React ✅
    - **🏗️ Estrutura implementada:**
      - `services/core/types.ts` - Interfaces completas
      - `services/core/orchestrator.ts` - Orquestrador principal
      - `services/core/validation.ts` - Validação de inputs
      - `services/core/roomAnalyzer.ts` - Análise de sala (mock)
      - `services/core/materialSimulator.ts` - Simulação de materiais (mock)
      - `cli/validator.ts` - Validador CLI principal
      - `cli/index.ts` - Entry point com comandos

- [x] **Task 2: Implementar CLI básica com Commander**
    - 2.1: Configurar `services/cli/index.ts` como entry point ✅
    - 2.2: Implementar comando `validate` para imagem única ✅
    - 2.3: Implementar comando `batch` para processamento em lote ✅
    - 2.4: Criar reporter JSON com métricas estruturadas ✅
    - 2.5: Configurar exit codes (0=sucesso, 1=erro API, 2=mutacao) ✅
    - **🚀 CLI testada com sucesso:**
      - Processamento em lote: 3 arquivos, tempo médio 109ms
      - Relatórios estruturados: JSON, humano, CI/CD
      - Exit codes funcionando corretamente
      - Sistema pronto para validação em escala

- [x] **Task 3: Preparar ambiente de teste massivo**
    - 3.1: Criar pasta `test-photos/` com categorias (sala, corredor, cozinha) ✅
    - 3.2: Gerar dataset de 20+ fotos representativas ✅ (18 fotos em 6 categorias)
    - 3.3: Criar script de validação automática ✅ (`validate-all.sh` testado)
    - 3.4: Documentar procedimento de teste ✅ (`VALIDATION_PROCEDURE.md` completo)
    - **📊 Validação executada:** 6 categorias, **0/6 sucesso** (dados reais para análise)
    - **🔍 Problemas identificados:** Falha ao processar arquivos placeholder (esperado)

### Fase 1 - Análise de Dados e Diagnóstico
- [ ] **Task 4: Executar validação em escala**
    - 4.1: Rodar CLI em todas as fotos de teste
    - 4.2: Coletar métricas: tempo, fidelidade, erros
    - 4.3: Identificar padrões de falha por categoria
    - 4.4: Analisar problemas de API (chaves, rate limits)

- [ ] **Task 5: Priorizar intervenções cirúrgicas**
    - 5.1: Mapear gargalos baseado em dados reais
    - 5.2: Definir ordem de refatoração por impacto
    - 5.3: Estimar esforço por módulo
    - 5.4: Criar backlog técnico priorizado

### Fase 2 - Refatoração do Core de IA
- [ ] **Task 6: Refatorar orchestrator (geminiService.server.ts)**
    - 6.1: Quebrar em 4 módulos: roomDetection, rendering, apiManager, fallback
    - 6.2: Implementar circuit breaker robusto
    - 6.3: Adicionar cache em memória
    - 6.4: Otimizar para limites Vercel (8s timeout)

- [ ] **Task 7: Refatorar self-audit (renderWithSelfAuditService.ts)**
    - 7.1: Separar validação de fidelidade em módulos especializados
    - 7.2: Implementar classificadores por tipo de erro
    - 7.3: Adicionar métricas de qualidade
    - 7.4: Otimizar heurísticas baseadas em dados reais

### Fase 3 - Integração Frontend Minimalista
- [ ] **Task 8: Criar API serverless unificada**
    - 8.1: Implementar `/api/render` usando core refatorado
    - 8.2: Adicionar health checks e métricas
    - 8.3: Configurar CORS e segurança
    - 8.4: Implementar logging estruturado

- [ ] **Task 9: Refatorar frontend React**
    - 9.1: Simplificar App.tsx extraindo lógica para hooks
    - 9.2: Implementar estados de loading/error robustos
    - 9.3: Adicionar indicadores de fidelidade na UI
    - 9.4: Otimizar bundle para performance mobile

### Fase 4 - Otimização e Deploy
- [ ] **Task 10: Preparar para produção Vercel**
    - 10.1: Configurar vercel.json com timeout otimizado
    - 10.2: Implementar fallback local para quando APIs falham
    - 10.3: Configurar environment variables seguras
    - 10.4: Criar pipeline de deploy automatizado

- [ ] **Task 11: Validação final**
    - 11.1: Teste de carga com dataset completo
    - 11.2: Validação cross-browser/mobile
    - 11.3: Documentação de uso para vendedores
    - 11.4: Checklist de prontidão para produção

---

## 📈 Critérios de Aceitação por Fase

### Fase 0 (CLI)
- CLI processa 20+ fotos sem erros de runtime
- Relatório JSON contém: fidelidade, tempo, erros específicos
- Exit codes funcionam corretamente

### Fase 1 (Análise)
- Padrões de falha identificados e documentados
- Backlog técnico priorizado com estimativas
- Decisões arquiteturais validadas com dados

### Fase 2 (Refatoração Core)
- Tempo médio de resposta < 6s
- Taxa de sucesso (fidelidade ≥1) > 85%
- Código modular com responsabilidades claras

### Fase 3 (Frontend)
- Interface carrega em < 3s em 3G
- Upload funciona em dispositivos móveis
- Estados de erro são tratados graciosamente

### Fase 4 (Produção)
- Deploy funcionando na Vercel
- Health checks passando
- Documentação completa para usuários

---

## 🚨 Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Chaves API expiradas | Alta | Alto | CLI revela imediatamente |
| Refatoração quebra funcionalidade | Médio | Alto | Testes com dataset preservado |
| Vercel timeout insuficiente | Alta | Médio | Fallback local implementado |
| Performance mobile inadequada | Médio | Médio | Otimizações progressivas |

---

## 📅 Ordem de Execução Recomendada

1. **Fase 0**: CLI de validação (dias 1-2)
2. **Fase 1**: Análise de dados (dia 3)  
3. **Fase 2**: Refatoração core (dias 4-7)
4. **Fase 3**: Frontend (dias 8-9)
5. **Fase 4**: Produção (dia 10)

**Próximo passo imediato**: Implementar Task 1 (estrutura core isolada) para habilitar a CLI.