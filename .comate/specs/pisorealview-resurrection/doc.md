# SDD – EscapeKit / Pisorealview-pro
## Intervenção Cirúrgica para Retomada do Projeto

### 1. Diagnóstico Atual (baseado na execução de 06/04/2026)
- [x] **Código existe**, mas sem configuração de build completa
- [x] **Servidor Vite configurado**, package.json criado ad-hoc
- [x] **Componentes React presentes**, arquitetura inteligente detectada
- [x] **Dependências instaladas**: 77 pacotes ativos
- [ ] **Teste prático com fotos reais** em andamento
- [ ] **Serviços de IA**: Gemini API configurada, mas sem teste

### 2. Bloqueios Imediatos Resolvidos
- ✅ `@sentry/react` instalado
- ✅ `utils.ts` criado com mocks funcionais
- ✅ `pages/Dashboard.tsx` criado (placeholder)
- ✅ `services/materialService.ts` criado (mock)
- ✅ `services/geminiCommon.ts` criado (mock)
- ✅ `types.ts` criado com interfaces básicas
- ✅ `hooks/*` criados (mocks funcionais)
- ✅ Configuração TypeScript completa

### 3. Arquitetura Detectada
- **Frontend**: React 18 + TypeScript + Vite
- **Serviços**: Gemini AI + HuggingFace + Arquitetura modular
- **Componentes**: Upload → Análise → Simulação → Resultado
- **Estado**: Hook-based com telemetria
- **UI/UX**: Interface para vendedores (mobile-first)

### 4. Plano de Ação (Fases)

#### Fase 0 (HOJE) – Validação de Valor (30 minutos)
- ✅ Documentação SDD criada
- ✅ Configuração ambiente dev
- 🟡 **Executar teste com 3 fotos reais**
  - Sala de estar
  - Corredor 
  - Cozinha
- **Métricas a coletar:**
  - Tempo resposta interface
  - Funcionalidade upload
  - Erros de timeout/processamento

#### Fase 1 – Refatoração Estrutural (1-2 dias)
- **Análise cirúrgica dos monólitos:**
  - `services/geminiService.server.ts` (706 linhas) → 4 módulos
  - `services/renderWithSelfAuditService.ts` (517 linhas) → 3 módulos
  - `App.tsx` (438 linhas) → Extração de componentes lógicos
- **Separação de responsabilidades:**
  - Upload/Analysis → Simulation → Rendering
  - Error handling centralizado
  - Cache estratégico

#### Fase 2 – Otimização Vercel Hobby (1 dia)
- **Ajustes para limites da plataforma:**
  - Timeout: 8s máximo
  - Memória: 1024MB otimizada  
  - Bundle size: Code splitting inteligente
- **Fallbacks implementados:**
  - Cache Redis opcional
  - Processamento local quando APIs falham
  - Degradação graciosa

#### Fase 3 – Validação Mercado (2 dias)
- **Teste com usuários reais:** Vendedores de piso
- **Coleta de métricas de usabilidade**
- **Ajustes baseados em feedback**

### 5. Critérios de Sucesso Técnico
- [ ] **Fidelidade**: LEVEL 1+ para 2 das 3 fotos teste
- [ ] **Performance**: Tempo médio < 8s (limite Vercel)
- [ ] **Robustez**: Sem crashes em upload/processamento
- [ ] **Usabilidade**: Interface mobile funcional
- [ ] **Erros**: Graceful degradation nos limites

### 6. Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Chaves API expiradas | Alta | Alto | Testar Google AI Studio imediatamente |
| Modelo HuggingFace mudou | Médio | Alto | Mock funcional + atualização endpoint |
| Vercel kills slow processes | Alta | Médio | Queue opcional + fallback local |
| Dependências desatualizadas | Médio | Médio | Update gradual com testes |

### 7. Arquivos Críticos para Análise

```
src/services/geminiService.server.ts      # 706 linhas - CORE
src/services/renderWithSelfAuditService.ts # 517 linhas - CRÍTICO  
App.tsx                                   # 438 linhas - INTERFACE
```

### 8. Próximos Passos Imediatos
1. **Finalizar Fase 0**: Teste com fotos reais
2. **Coletar métricas** de tempo/resposta
3. **Avaliar qualidade** da simulação gerada
4. **Documentar resultados** para Fase 1

### 9. Resultado Esperado da Fase 0
- Sistema funcional na interface básica
- Upload de imagens operacional
- Serviços de IA respondendo (ou fallback claro)
- Base técnica sólida para refatoração cirúrgica