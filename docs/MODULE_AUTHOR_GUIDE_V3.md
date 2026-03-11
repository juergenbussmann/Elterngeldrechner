# Module Author Guide – PWA Skeleton V3

Deze gids beschrijft hoe je nieuwe modules bouwt op Skeleton V3, inclusief AI/pipeline opties. Voor V2, zie `MODULE_AUTHOR_GUIDE.md`.

## Wat is een module in V3?

- Een module levert een hoofdscherm (route), optioneel widgets en eigen settings.
- Registratie verloopt via `src/config/moduleRegistry.ts` (id, labelKey, routeBase, component, hasSettings, widget-capabilities).
- Panels/shell: modules draaien in de panel-shell; gebruik `useNavigation` voor routes/panels.
- Theme/i18n: UI gaat via shared UI-componenten en i18n keys (`modules.<id>.*`).
- Telemetry v2: gebruik `trackEvent` voor belangrijke acties.
- AI/pipelines: heavy modules kunnen `usePipeline` en `runAiTask` combineren.

## Architectuur (korte referentie)

- `moduleRegistry`: centrale registratie van modules (id, routes, capabilities).
- Router: `routeBase` en `component` bepalen het hoofdscherm.
- Panels & settings: `ModuleSettingsScreen` koppelt module-id → settings-component.
- Widgets: `src/config/homeWidgets.ts` koppelt widgets aan modules met `id`, `moduleId`, `span`, `priority`.
- Shared libs: `shared/lib` bevat i18n, navigation, telemetry, storage, pipeline, ai, notifications.

## Stappenplan: nieuwe module (basic)

1. **Kopieer template**
   - Neem `templates/module-basic/*` en plak in `src/modules/<id>/`.
   - Vervang `__MODULE_ID__` en `__ModuleName__` + hernoem bestanden.
2. **Vul i18n in**
   - Voeg keys toe in `src/locales/de.json`, bijv. `modules.<id>.title`, `modules.<id>.form.*`.
3. **Update component**
   - Pas state/velden aan, houd `storage`-keys en `trackEvent`-calls bij.
   - Gebruik shared UI (Card, Button, TextInput, TextArea, List).
4. **Registreer module**
   - Voeg entry toe in `src/config/moduleRegistry.ts` met id, labelKey, routeBase, component, hasSettings.
   - (Optioneel) koppel settings-route en widget.
5. **Test**
   - Controleer navigatie, lijst/weergave, en settings-call (`openModuleSettings(<id>)`).

## Heavy module (AI + pipelines)

- Start met `templates/module-ai-heavy/*`.
- Definieer een pipeline (`PipelineDefinition`) en koppel met `usePipeline`.
- Gebruik `runAiTask` voor AI-samenvatting of downstream AI-taken.
- Voeg telemetry toe voor pipeline-start/succes/fout en AI-tasks.
- Maak settings voor pipeline/AI toggles (auto-run, enable AI, intensiteit).

## Checklist: Nieuwe module

- [ ] Template gekopieerd naar `src/modules/<id>/` (basic of heavy).
- [ ] `__MODULE_ID__` en naam-placeholders vervangen; bestanden hernoemd.
- [ ] i18n-keys toegevoegd in `src/locales/de.json`.
- [ ] Module geregistreerd in `src/config/moduleRegistry.ts`.
- [ ] (Optioneel) Widget toegevoegd in `src/config/homeWidgets.ts`.
- [ ] (Optioneel) Settings gekoppeld in `ModuleSettingsScreen`.
- [ ] Telemetry events toegevoegd waar relevant.
- [ ] `npm run lint` / `npm run test` / `npm run build` slagen.

## Checklist: Heavy-module (AI + pipelines)

- [ ] Pipeline-id en `PipelineDefinition` ingevuld; `usePipeline` werkt.
- [ ] AI-task type (`AI_TASK_TYPE`) ingesteld; `runAiTask` call ingevuld.
- [ ] Telemetry events voor pipeline en AI toegevoegd.
- [ ] Settings toggles voor pipeline/AI (auto-run, enable, intensiteit) werken.
- [ ] i18n-keys voor pipeline/AI UI aanwezig.
- [ ] Module geregistreerd (routes/settings) en getest in de shell.

