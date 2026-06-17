# Estrategia de Testes do Pipeline de Rendering

## Cobertura atual

Ja coberto:

- contratos semanticos de validacao
- contratos de prompt do rendering
- regras puras do core
- regressao do `renderWithSelfAudit`

## Lacunas que motivaram esta fase

- fluxo de analise do `geminiService.server.ts`
- fallback Hugging Face -> Gemini -> default seguro
- integracao de `renderFlooring` com self-audit e caminho legado
- contratos HTTP dos controllers
- contrato do prompt de analise

## Suites adicionadas

- `tests/integration/geminiAnalysisFlow.test.ts`
  - cobre HF primary, fallback Gemini e fallback seguro
- `tests/integration/geminiRenderFlow.test.ts`
  - cobre integracao de `renderFlooring` com self-audit e caminho legado
- `tests/integration/renderingHttpContracts.test.ts`
  - cobre contratos dos controllers HTTP de render e analise
- `tests/unit/geminiAnalysisPromptContracts.test.ts`
  - cobre contrato semantico do prompt de analise

## Suites futuras planejadas

- `tests/integration/pisodev.cli.test.ts`
  - contrato da CLI `pisodev`
  - parse de argumentos
  - saida estruturada
  - codigos de erro
- `tests/performance/cloudRunSmoke.test.ts`
  - smoke de latencia
  - carga simulada leve
  - perfil de cold start e timeouts
