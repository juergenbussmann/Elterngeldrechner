# Skeleton V3 – Architecture Overview

Skeleton V3 biedt een factory-grade basis voor PWAs. De lagen:

- Shell & navigatie: `AppShell`, `AppRoutes`, panel-host, home-widgets. Routes voor modules komen uitsluitend uit `moduleRegistry`.
- Theme engine: `ThemeProvider` + tokens per component, merk via `APP_BRAND`. Alle UI (Button, Card, Inputs) gebruiken theme-tokens.
- i18n: `I18nProvider` met identieke key-sets in `src/locales/de.json` en `src/locales/en.json`.
- Module-systeem: `moduleRegistry` + `ModuleSettingsScreen`, optionele home-widgets via `homeWidgets`.
- Data/pipeline-laag: `PipelineDefinition`, `usePipeline`, demo-pipeline in settings. Mock-data via `public/mock`.
- AI-laag: `shared/lib/ai` met `runAiTask`; DreamdropDemo toont AI-samenvatting met metadata en telemetry.
- Telemetry v2: `trackEvent`/`trackScreenView`, toggle in settings, ConsoleTransport voor dev.

Opbouw voor nieuwe PWA of heavy module:
1) Declareer module in `moduleRegistry` (+ settings entry).
2) Gebruik pipeline-helpers voor data-transforms of AI-jobs.
3) Voeg i18n-keys in beide locales toe.
4) Koppel widgets/panels via bestaande hosts in de shell.

