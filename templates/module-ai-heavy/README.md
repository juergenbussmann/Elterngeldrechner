# Module template (AI-heavy + pipelines)

Gebruik deze template voor modules die een pipeline en AI-calls combineren (bijv. data ophalen + AI-samenvatting).

## Wat deze template dekt

- Pipeline-flow via `usePipeline` en een eigen `PipelineDefinition`.
- AI-calls via `runAiTask` (en bijbehorende `AiRequest`/`AiResult` types).
- Telemetry-hooks voor pipeline- en AI-events.

## Stappen om te starten

1. Kopieer de map naar `src/modules/<module-id>/`.
2. Vervang alle placeholders: `__MODULE_ID__`, `__ModuleName__` en de bestandsnamen `__MODULE_NAME__*.tsx`.
3. Definieer je pipeline:
   - Pas `PIPELINE_ID` aan.
   - Vul de `PipelineDefinition` in (input/output types en `run`-implementatie).
   - Bekijk de demo in `shared/lib/pipeline` of het voorbeeld in `GlobalSettingsScreen` (demoPipeline).
4. Koppel AI-taken:
   - Pas `AI_TASK_TYPE` aan en bouw een `AiRequest`.
   - Zie de AI-demo in `src/core/settings/GlobalSettingsScreen.tsx` voor een minimale call.
5. Registreer de module in `src/config/moduleRegistry.ts` en voeg i18n-keys toe (`modules.<id>.*`).
6. Werk module-settings bij (toggels voor pipeline/AI) en sla ze op zoals gewenst.

Zie `MODULE_AUTHOR_GUIDE_V3.md` voor het uitgebreide stappenplan en de heavy-module checklist.

