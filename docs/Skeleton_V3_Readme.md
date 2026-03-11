# Skeleton V3 – Readme

Korte instap voor de Skeleton V3 van de PWA Factory. Deze skeleton richt zich op productteams die snel een nieuwe PWA willen starten (light) én op heavy flows met AI/pipeline-werk (Dreamdrop, RiskRadar).

## Snelle links
- Scope: `docs/SKELETON_V3_SCOPE.md`
- Bouwpad: `docs/Skeleton_V3_Bouwpad.md`
- Getting started: `docs/GettingStartedNewPWA_V3.md`
- Module authoring: `MODULE_AUTHOR_GUIDE_V3.md`
- Templates: `templates/` (module-basic, module-ai-heavy)

## Referentie-modules (V3)
- Notes: licht voorbeeld voor opslag + header-actions.
- DreamdropDemo: AI-heavy voorbeeld met mood/meta, opslag en samenvatting.
- RiskRadarDemo: pipeline/data voorbeeld met filters en telemetry.

## Hoe te gebruiken
1) Kies een module-template uit `templates/` en scaffold een nieuwe module via de moduleRegistry.
2) Gebruik de referentie-modules om patronen over te nemen (storage, telemetry, pipelines, AI).
3) Pas theming/brand via `APP_BRAND` en theme-engine aan, i18n-keys via `src/locales`.

## Kwaliteitscheck (Fase 10)
- Build sanity: `npm run build` geslaagd. Bundles: `dist/assets/index-MTPw3g5E.js` 237.75 kB (gzip 72.03 kB) en CSS 7.48 kB (gzip 1.97 kB).

