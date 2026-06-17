# Obsidian Note: Rendering State

## Current state

- `analysisController` -> `application/analyzeRoom`
- `renderController` -> `application/renderScene`
- `pisodev analyze` -> `application/analyzeRoom`
- `pisodev render` -> `application/renderCli`
- `pisodev validate` -> `application/validateCli`

## Remaining legacy edges

- `infrastructure/persistence/materialCatalogGateway.ts` -> `services/materialService.ts`
- `infrastructure/persistence/materialTextureGateway.ts` -> `services/materialService.ts`
- `infrastructure/telemetry/renderObservability.ts` -> `services/vtaSentryBridge.server.ts`
- `infrastructure/ai/geminiRoomAnalysis.ts` -> `services/hfService.server.ts`
- `infrastructure/ai/geminiRoomAnalysis.ts` -> `services/hfAnalysisService.server.ts`
- `infrastructure/ai/geminiExecution.ts` -> `services/renderCoreService.ts`
- `infrastructure/ai/promptLoader.ts` -> `services/promptLoader.ts`
- `infrastructure/ai/securityCircuit.ts` -> `services/geminiCommon.ts`
- `infrastructure/ai/structuralAudit.ts` -> `services/regressionService.ts`

## Architectural guards now in place

- `dependency-cruiser` blocks `src/domains/rendering/interface/** -> services/**`
- `dependency-cruiser` blocks `src/domains/rendering/application/** -> services/**`
- `tests/unit/renderingArchitectureBoundaries.test.ts` verifies controller/application boundaries
- `roomAnalysisGateway` now implements an explicit application port in `application/ports/roomAnalysisGateway.ts`
- `renderGateway` now implements an explicit application port in `application/ports/renderGateway.ts`
- `materialCatalogGateway` and `materialTextureGateway` now implement explicit application ports
- `renderObservability` now implements explicit application ports for telemetry/event reporting

## Suggested diagrams to update in Obsidian

1. `CLI -> application -> infrastructure -> services (residual)`  
2. `HTTP render/analyze -> interface/http -> application -> infrastructure`
3. `Residual migration edges` with infrastructure nodes highlighted

## Next milestone

Replace the remaining infrastructure wrappers that still point to `services/*`, starting with `renderCoreService`, `promptLoader`, `regressionService`, and telemetry/material adapters.
