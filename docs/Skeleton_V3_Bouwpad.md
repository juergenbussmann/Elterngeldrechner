# Skeleton_V3_Bouwpad.md

> Doel: dit document beschrijft de fasen voor Skeleton V3 zó, dat je per fase direct een kant-en-klare prompt hebt voor gebruik in Cursor.ai. De prompts gaan er telkens van uit dat de actuele repo in Cursor is geopend en dat de bestaande Skeleton V2-codebase de SSOT is.

---

## Overzicht fasen Skeleton V3

1. Fase 1 – V3 Baseline & Quality Upgrade
2. Fase 2 – Theme Engine v1 (multi-theme + brand-varianten)
3. Fase 3 – Panel-ready Shell v3 (Left/Right/Bottom)
4. Fase 4 – Navigation & Actions v3 (submenu / context actions)
5. Fase 5 – Data & Pipeline Layer v1 (heavy-app ready)
6. Fase 6 – AI Integration Layer v1
7. Fase 7 – Telemetry & Monitoring v2 (remote + eventschema)
8. Fase 8 – i18n v2 (multi-language + language settings)
9. Fase 9 – Factory Tooling v1 (templates + semi-automatische scaffolding)
10. Fase 10 – Hardening & Reference Implementations (Dreamdrop / RiskRadar proof)

Elke fase heeft:

* **Doel en scope**
* **Deliverables**
* **Out-of-scope**
* **Cursor.ai prompt** (direct kopieerbaar)

---

## Fase 1 – V3 Baseline & Quality Upgrade

### Doel en scope

Skeleton V2 stabiliseren als fundament voor V3:

* Opschonen van dode code, TODO’s en experimenten.
* ESLint migreren naar flat config (nieuw standaardformaat).
* Packages bijtrekken naar veilige minor/patch versies.
* Nieuwe V3-docs toevoegen en V2-docs markeren als legacy waar nodig.

### Deliverables

* `docs/SKELETON_V3_SCOPE.md`
* `docs/Skeleton_V3_Bouwpad.md` (dit document)
* Geüpdatete lint-config (flat config)
* Npm-scripts en docs aangepast aan nieuwe lint-config
* Opschoning van niet-gebruikte bestanden en imports

### Out-of-scope

* Geen nieuwe functionaliteit (geen nieuwe UI, panels, themes, etc.).
* Geen breaking changes in publieke API’s van shared-lagen.

### Cursor.ai prompt

```text
PROJECT: Skeleton V3 – Fase 1 (Baseline & Quality Upgrade)

CONTEXT:
- Bestaande repo: pwa-skeleton (Skeleton V2 basis).
- Doel: Skeleton V2 klaarmaken als stabiele V3-baseline zonder nieuwe features.

OPDRACHT:
1) ESLint migratie
   - Zoek de huidige ESLint-configuratie (.eslintrc.*) en migreer naar een moderne flat config `eslint.config.mjs` volgens de ESLint 9+ richtlijnen.
   - Zorg dat TypeScript, React en Vite goed zijn geïntegreerd.
   - Update npm scripts in `package.json` zodat `npm run lint` de nieuwe config gebruikt.

2) Dependency review
   - Voer een dependency-check uit (focus op React, React Router, Vite, vite-plugin-pwa, TypeScript, testing libs).
   - Update alleen naar veilige minor/patch versies, geen grote major upgrades zonder duidelijke noodzaak.

3) Code cleanup
   - Verwijder dode code, niet-gebruikte components en overbodige helpers.
   - Ruim niet-gebruikte imports op in de hele codebase.
   - Laat functionele behavior onveranderd.

4) Docs
   - Maak `docs/SKELETON_V3_SCOPE.md` aan op basis van bestaande V2-scope, maar markeer dat V3 extra lagen (theme engine, panel-engine, AI, pipelines, factory tooling) gaat toevoegen.
   - Voeg `docs/Skeleton_V3_Bouwpad.md` toe als placeholder (de inhoud lever ik handmatig aan).
   - Markeer in bestaande V2-docs dat ze door V3-docs worden vervangen zodra V3 gereed is.

ACCEPTATIECRITERIA:
- `npm run lint` succesvol met flat config.
- `npm run build` en `npm run dev` werken ongewijzigd.
- Geen verwijdering van publieke API’s in shared-lagen.
- Nieuwe V3-docs aanwezig in `docs/` map.
```

---

## Fase 2 – Theme Engine v1 (multi-theme + brand-varianten)

### Doel en scope

Een volwaardige theme-engine introduceren met minimaal twee themes en user preference:

* Theme-contract (`ThemeDefinition`).
* Minimaal twee themes: `lightDefault` (huidige) en `darkDefault` of `highContrast`.
* Theme-provider en `useTheme()`-hook die theme kiest op basis van user setting + system preference.
* Theme-switcher in instellingen (System / Light / Dark).
* Volledige vervanging van hardcoded kleuren in UI-componenten door theme-tokens.

### Deliverables

* `src/core/theme/themeContract.ts` of vergelijkbaar voor type-definitie.
* `src/core/theme/themes.ts` met minimaal 2 themes.
* `src/core/theme/ThemeProvider.tsx` + `useTheme()` hook.
* Aanpassingen in shared UI-componenten (`Button`, `Card`, etc.) om theme tokens te gebruiken.
* Theme-instellingen in de global settings UI + opslag in storage.

### Out-of-scope

* Geen complexe per-module- of per-widget-themes.
* Geen theming van externe libraries buiten de basiscomponenten.

### Cursor.ai prompt

```text
PROJECT: Skeleton V3 – Fase 2 (Theme Engine v1)

CONTEXT:
- Huidige status: één light theme op basis van tokens + APP_BRAND.primaryColor.
- Doel: multi-theme ondersteuning met minimaal twee themes en user preference.

OPDRACHT:
1) Theme-contract
   - Introduceer een type `ThemeDefinition` met o.a.:
     - kleuren (primary, background, surface, textPrimary, textSecondary, border, success, warning, error)
     - typography (fontFamily, fontSizes, fontWeights)
     - spacing en radii (xs, sm, md, lg, xl)
     - component-specifieke tokens (button, card, input, navBar, header)
   - Plaats dit contract in `src/core/theme/themeContract.ts` of een vergelijkbaar bestand.

2) Theme-implementaties
   - Definieer minimaal twee themes in `src/core/theme/themes.ts`:
     - `lightDefault` (gebruik de huidige tokens als basis).
     - `darkDefault` (donkere variant met goede contrasten en a11y in het oog).

3) ThemeProvider + hook
   - Maak `ThemeProvider` (bijv. `src/core/theme/ThemeProvider.tsx`) die het actieve theme via context beschikbaar maakt.
   - Implementeer `useTheme()` voor gebruik in UI-componenten.
   - Theme-resolutie:
     - Lees user preference uit storage (bijv. `theme: 'system' | 'light' | 'dark'`).
     - Bij 'system': gebruik `prefers-color-scheme`.

4) Settings UI
   - Voeg in de globale settingspagina een sectie “Thema” toe met opties: `System / Light / Dark`.
   - Sla de user choice op via de bestaande storage-layer.

5) Component-updates
   - Pas shared UI-componenten aan (Button, Card, eventueel andere basiscomponenten) zodat zij theme tokens gebruiken i.p.v. hardcoded kleuren.

ACCEPTATIECRITERIA:
- Gebruiker kan in Settings kiezen tussen System/Light/Dark.
- Theme-switch werkt direct in de UI (zonder reload).
- Hardcoded kleuren in shared UI zijn vervangen door theme tokens.
- PWA blijft builden en functioneren zoals voorheen.
```

---

## Fase 3 – Panel-ready Shell v3 (Left/Right/Bottom)

### Doel en scope

De AppShell uitbreiden met een generieke panel-engine voor LeftPanel, RightPanel en BottomSheet.

### Deliverables

* Centrale panel-state in AppShell (bijv. `PanelHost`).
* Componenten: `LeftPanel`, `RightPanel`, `BottomSheet`.
* `usePanels()` hook met API: `openLeftPanel`, `openRightPanel`, `openBottomSheet`, `closePanel`.
* Layout en animaties die mobile-first zijn en zuinig omgaan met viewport-hoogte.
* Documentatie hoe modules panels kunnen gebruiken.

### Out-of-scope

* Geen complexe docking of multi-panel layouts.
* Geen per-module custom animaties (alleen basis-slide-in/out).

### Cursor.ai prompt

```text
PROJECT: Skeleton V3 – Fase 3 (Panel-ready Shell v3)

CONTEXT:
- Shell: AppRoot + AppShell bestaan al.
- Doel: een generieke panel-engine toevoegen met LeftPanel, RightPanel en BottomSheet.

OPDRACHT:
1) Panel-state en host
   - Introduceer een `PanelHost` component (bijv. in `src/core/panels/PanelHost.tsx`) die in `AppShell` wordt opgenomen.
   - Definieer een type `PanelState` met o.a.:
     - `type: 'left' | 'right' | 'bottom' | null`
     - `panelId: string | null`
     - `props?: Record<string, unknown>`
   - Zorg dat er altijd slechts één panel tegelijk actief is.

2) Panel-componenten
   - Maak `LeftPanel`, `RightPanel` en `BottomSheet` met een consistent API:
     - props: `isOpen`, `onClose`, `children`.
   - Implementeer eenvoudige slide-in/slide-out animaties (CSS-transitions) en overlay.
   - Respecteer mobile-first design: BottomSheet maximaal ~80% van de hoogte, met duidelijke close-handle.

3) Hooks / API
   - Maak `usePanels()` (bijv. in `src/shared/lib/panels/usePanels.ts`) die panel-actions aanbiedt:
     - `openLeftPanel(panelId, props?)`
     - `openRightPanel(panelId, props?)`
     - `openBottomSheet(panelId, props?)`
     - `closePanel()`
   - Gebruik React context om deze API in de app beschikbaar te maken.

4) Panel-registratie
   - Introduceer een eenvoudige registry (bijv. `src/config/panels.ts`) waarin panelId → React component wordt vastgelegd.
   - PanelHost moet op basis van `panelId` + `type` de juiste geregistreerde component renderen.

5) Integratie in AppShell
   - Plaats `PanelHost` binnen AppShell zodat panels boven de content renderen maar onder eventuele toasts.

ACCEPTATIECRITERIA:
- Er is een werkende demo: knop op een bestaand scherm die een LeftPanel en een BottomSheet kan openen.
- Sluiten werkt via close-knop en overlay-click (indien ontwerp dat toelaat).
- Panels gebruiken geen ad hoc layout-hacks; alles loopt via PanelHost + registry.
```

---

## Fase 4 – Navigation & Actions v3 (submenu / context actions)

### Doel en scope

Rijkere header-acties en submenu’s realiseren op basis van declaratieve configuratie.

### Deliverables

* Uitgebreid `screenConfig` met `primaryActions` en `menuActions`.
* Component `HeaderActionsBar` + `HeaderActionsMenu`.
* Integratie met `useNavigation` en `usePanels`.
* Mogelijkheid voor modules om eigen header-acties te registreren via moduleRegistry.

### Out-of-scope

* Geen complexe rechten-systemen of dynamische per-user actie-filters (basisvariant volstaat).

### Cursor.ai prompt

```text
PROJECT: Skeleton V3 – Fase 4 (Navigation & Actions v3)

CONTEXT:
- Huidige navigatie: `screenConfig` + `useNavigation` met eenvoudige actions.
- Doel: rijkere header-acties en submenu’s, declaratief per screen/module.

OPDRACHT:
1) Uitbreiding screenConfig
   - Breid het screen-configuratiemodel uit (bijv. in `src/core/screenConfig.ts`) met:
     - `primaryActions?: ScreenAction[]`
     - `menuActions?: ScreenAction[]`
   - `ScreenAction` bevat minimaal: `id`, `labelKey`, optioneel `icon`, en `onClick`-type (`'navigate' | 'panel' | 'custom'`).

2) Header-components
   - Maak `HeaderActionsBar` die `primaryActions` als icon-buttons toont rechts in de header.
   - Maak `HeaderActionsMenu` die `menuActions` toont in een menu (bv. via een overflow- of “More”-icon) of in een bottom-sheet op mobile.

3) Integratie useNavigation/usePanels
   - Zorg dat `ScreenAction` verwerkt kan worden via `useNavigation` en `usePanels`:
     - `onClick: { type: 'navigate'; targetRoute: string }` → route navigeren.
     - `onClick: { type: 'panel'; panelId: string; props?: Record<string, unknown> }` → panel openen.
     - `onClick: { type: 'custom'; handlerId: string }` → callback-resolutie via een registry.

4) Module-integratie
   - Laat module-definities in `moduleRegistry` optioneel extra header-acties aanleveren voor hun hoofdscherm(en).
   - Combineer module-acties met globale screen-acties in de header.

ACCEPTATIECRITERIA:
- Minstens één bestaand scherm toont primaryActions en menuActions.
- Vanuit een menuAction kan een panel worden geopend via de nieuwe panel-engine.
- Configuratie is volledig declaratief; geen losse click-handlers in de headercomponenten zelf.
```

---

## Fase 5 – Data & Pipeline Layer v1 (heavy-app ready)

### Doel en scope

Een generieke pipeline- en data-layer toevoegen zodat zware PWA’s (Dreamdrop/RiskRadar) robuuste async workflows kunnen bouwen.

### Deliverables

* `shared/lib/pipeline` met basisconcepten (Job, Pipeline, Step).
* Eenvoudige in-memory job-queue + retry.
* Hooks (`usePipeline`) om pipelines vanuit UI te starten/monitoren.
* Data-access layer boven op api-client (`DataService`, `useResource`).
* Demo-pipeline (bijv. bulk fetch + processing).

### Out-of-scope

* Geen distributed job queue of echte background tasks buiten browser.
* Geen complexe persistence van jobs over sessies heen (v1: in-memory volstaat).

### Cursor.ai prompt

```text
PROJECT: Skeleton V3 – Fase 5 (Data & Pipeline Layer v1)

CONTEXT:
- Er is een eenvoudige api-client en telemetry.
- Doel: generieke pipeline- en data-layer voor zware workflows.

OPDRACHT:
1) Pipeline basis
   - Maak een folder `src/shared/lib/pipeline/`.
   - Definieer types:
     - `PipelineStep<Input, Output>`
     - `PipelineDefinition<Input, Output>`
     - `PipelineJob<Output>` met status (`pending`, `running`, `succeeded`, `failed`).
   - Implementeer een eenvoudige runner die steps sequentieel uitvoert en errors opvangt.

2) Job-queue
   - Implementeer een in-memory job-queue (bijv. `PipelineQueue`) die jobs bewaakt.
   - Ondersteun retries (bijv. maxRetries per job) en een eenvoudige backoff-strategie.

3) Hook `usePipeline`
   - Maak `usePipeline(definition)` die teruggeeft:
     - `run(input)` → start job en retourneert jobId.
     - `job` of `jobs` state met status, progress, result, error.
   - Integreer met telemetry: log begin/einde/failure events.

4) Data-layer boven api-client
   - Introduceer `DataService` in `src/shared/lib/data/` (of vergelijkbaar):
     - Methoden zoals `getResource<T>(key, fetcher)` met eenvoudige caching (in-memory).
   - Maak hook `useResource(key, fetcher)` die de DataService gebruikt.

5) Demo-pipeline
   - Maak een demo-pipeline (bijv. in een demo-module of op Home):
     - Step 1: fetch data (mock endpoint).
     - Step 2: transformeer/aggregate data.
     - Step 3: sla resultaat op in memory of toon in UI.

ACCEPTATIECRITERIA:
- Er is ten minste één werkende pipeline-call via `usePipeline` zichtbaar in de UI.
- Pipelines loggen status naar telemetry.
- Data-layer wordt gebruikt in ten minste één bestaand scherm i.p.v. direct api-client gebruik.
```

---

## Fase 6 – AI Integration Layer v1

### Doel en scope

Generieke AI-integratielaag opzetten die gebruikt kan worden door toekomstige apps als Dreamdrop en RiskRadar.

### Deliverables

* `shared/lib/ai` met `AiClient` interface.
* Default HTTP-implementatie met configureerbaar endpoint.
* Patterns voor `AiTask` (sync) en `AiJob` (async boven pipeline-layer).
* Voorbeeld: kleine AI-demo (bv. samenvatting van tekst).

### Out-of-scope

* Geen echte productie-API-keys of provider-specifieke details in de repo (config moet via environment/secret).
* Geen langetermijn-queue of offline AI.

### Cursor.ai prompt

```text
PROJECT: Skeleton V3 – Fase 6 (AI Integration Layer v1)

CONTEXT:
- Pipeline-layer bestaat nu.
- Doel: generieke AI-koppelvlak introduceren.

OPDRACHT:
1) AiClient interface
   - Maak folder `src/shared/lib/ai/`.
   - Definieer `AiClient` interface met methodes zoals:
     - `completeText(prompt: string, options?: AiRequestOptions): Promise<AiResult>`
     - `classify(input: string | Record<string, unknown>, options?: AiRequestOptions): Promise<AiResult>`
   - Definieer `AiResult` (output-tekst, tokens, eventuele metadata).

2) Default implementatie
   - Implementeer `HttpAiClient` die requests stuurt naar een configureerbaar endpoint (base URL in config).
   - Gebruik bestaande api-client of een dedicated HTTP-helper.

3) AiTask / AiJob patterns
   - Maak helpers:
     - `runAiTask(request)` voor een eenvoudige directe call.
     - `createAiJobPipeline` die een pipeline-definitie bouwt voor langere taken (bv. meerdere AI-calls + post-processing).

4) Integratie met telemetry
   - Log AI-calls (start, success, failure) naar telemetry met geanonimiseerde metadata.

5) Demo
   - Voeg een eenvoudige demo toe (bijv. op een experimenteel scherm):
     - tekst invoer → AI-samenvatting via `AiClient` → resultaat in UI.

ACCEPTATIECRITERIA:
- AiClient-interface en default implementation zijn aanwezig.
- Demo-call werkt met een mock of eenvoudig test-endpoint.
- AI-calls worden via telemetry gelogd.
```

---

## Fase 7 – Telemetry & Monitoring v2 (remote + eventschema)

### Doel en scope

Telemetry volwassen maken met een formeel eventschema en remote transport.

### Deliverables

* Gestandaardiseerd eventschema voor: `screen_view`, `user_action`, `pipeline_job`, `ai_call`, `error`.
* `TelemetryClient` met pluggable transport (console, HTTP).
* Config voor endpoint, sampling rate, opt-in.
* Settings UI voor telemetry-opties.

### Out-of-scope

* Geen complexe dashboards of integratie met specifieke analytics tools in de repo.

### Cursor.ai prompt

```text
PROJECT: Skeleton V3 – Fase 7 (Telemetry & Monitoring v2)

CONTEXT:
- Er is een eenvoudige telemetry-implementatie die naar console logt.
- Doel: eventschema + remote transport.

OPDRACHT:
1) Eventschema
   - Definieer een formeel eventschema (types) in `src/shared/lib/telemetry/schema.ts` voor:
     - `screen_view`
     - `user_action`
     - `pipeline_job`
     - `ai_call`
     - `error`
   - Elke event heeft minimale velden (timestamp, eventType, context) en specifieke velden.

2) TelemetryClient
   - Introduceer een `TelemetryClient` in `src/shared/lib/telemetry/client.ts` met:
     - `track(event: TelemetryEvent)`
     - configuratie voor sampling rate en enabled/disabled.
   - Implementeer pluggable transports: `ConsoleTransport` en `HttpTransport`.

3) Configuratie
   - Voeg een configuratie-entry toe (bijv. in `src/config/appConfig.ts`) voor telemetry:
     - endpoint URL
     - default enabled/sampling.

4) Integratie
   - Pas bestaande telemetry-calls aan om het nieuwe schema te gebruiken.
   - Zorg dat belangrijke gebeurtenissen (navigatie, pipelines, AI-calls, errors) via `TelemetryClient` verlopen.

5) Settings UI
   - Voeg in de globale settings een sectie “Diagnostics / Telemetry” toe met toggles (bijv. telemetry aan/uit).

ACCEPTATIECRITERIA:
- Alle nieuwe events volgen het schema.
- Telemetry kan eenvoudig worden omgeschakeld tussen console-only en HTTP.
- Settings UI kan telemetry aan/uit zetten per gebruiker.
```

---

## Fase 8 – i18n v2 (multi-language + language settings)

### Doel en scope

Multi-language support uitrollen met taalkeuze in settings.

### Deliverables

* Extra locale-bestanden (minimaal `en`).
* Language-switch in instellingen (System / Deutsch / English).
* Persistente taal-instelling via storage.

### Out-of-scope

* Geen volledige professionele vertalingen voor alle modules; demo-/basisvertalingen volstaan, zolang de structuur klopt.

### Cursor.ai prompt

```text
PROJECT: Skeleton V3 – Fase 8 (i18n v2)

CONTEXT:
- Eén locale (`de`) is aanwezig, i18n-structuur bestaat.
- Doel: multi-language support + language settings.

OPDRACHT:
1) Locale-structuur uitbreiden
   - Voeg een tweede locale `en` toe in `src/locales/en.json`.
   - Zorg dat key-structuur identiek is aan `de.json`.

2) I18n-config
   - Pas i18n-initialisatie aan zodat meerdere locales ondersteund worden.
   - Introduceer een taal-instelling: `language: 'system' | 'de' | 'en'`.

3) Language-switch UI
   - Voeg in de globale settings een sectie “Sprache / Language” toe met opties:
     - System
     - Deutsch
     - English
   - Sla de keuze op via storage.
   - Bij 'system': gebruik browser-/OS-taal als default.

4) Integratie
   - Zorg dat de app bij start de juiste taal kiest o.b.v. user setting.
   - Gebruik i18n-keys consistent in shell + belangrijkste schermen.

ACCEPTATIECRITERIA:
- De app is volledig bruikbaar in zowel Duits als Engels.
- Taalkeuze blijft behouden na reload.
- Nieuwe schermen gebruiken i18n-keys i.p.v. hardcoded strings.
```

---

## Fase 9 – Factory Tooling v1 (templates + semi-automatische scaffolding)

### Doel en scope

De stap zetten van “skeleton” naar “factory-ready skeleton” door templates en duidelijke procedures voor nieuwe PWA’s en modules.

### Deliverables

* Template-mappen: `templates/module-basic`, `templates/module-ai-heavy`, `templates/pwa-config`.
* Geüpdatete docs: `GettingStartedNewPWA_V3.md`, `MODULE_AUTHOR_GUIDE_V3.md`.
* Checklists voor nieuwe PWA, module en heavy-module.

### Out-of-scope

* Geen daadwerkelijke CLI-binary; alleen structuur en beschrijving (een CLI kan later gebouwd worden op basis hiervan).

### Cursor.ai prompt

```text
PROJECT: Skeleton V3 – Fase 9 (Factory Tooling v1)

CONTEXT:
- De skeleton is functioneel, maar er is nog geen echte "factory"-tooling.
- Doel: templates + procedurele docs voor snelle nieuwe PWA's en modules.

OPDRACHT:
1) Templates
   - Maak een map `templates/` in de root.
   - Voeg in ieder geval toe:
     - `templates/module-basic/` (minimale module met scherm, widget, settings)
     - `templates/module-ai-heavy/` (module die ai-layer + pipeline-layer gebruikt)
     - `templates/pwa-config/` (basis set config-bestanden voor een nieuwe PWA-variant).

2) Template-inhoud
   - Gebruik de huidige best practices uit `src/modules/` als basis.
   - Voorzie templates van duidelijke TODO-commentaarblokken waar namen/ids ingevuld moeten worden.

3) Documentatie
   - Maak `docs/GettingStartedNewPWA_V3.md` met een stap-voor-stap handleiding:
     - Nieuwe PWA opzetten op basis van Skeleton V3.
     - Welke config-bestanden aangepast moeten worden.
   - Maak `docs/MODULE_AUTHOR_GUIDE_V3.md` met:
     - Hoe een nieuwe module te maken
     - Hoe header-acties, panels, pipelines en AI correct te gebruiken.

4) Checklists
   - Voeg in de docs checklists toe voor:
     - Nieuwe PWA
     - Nieuwe module
     - Heavy-module (met AI en pipelines).

ACCEPTATIECRITERIA:
- Templates zijn volledig compileerbaar zodra TODO’s zijn ingevuld.
- Docs geven een helder, lineair stappenplan voor nieuwe PWA en nieuwe modules.
```

---

## Fase 10 – Hardening & Reference Implementations (Dreamdrop / RiskRadar proof)

### Doel en scope

Bewijzen dat Skeleton V3 zware apps zoals Dreamdrop en RiskRadar kan dragen met referentie-implementaties en hardening.

### Deliverables

* Referentie-module “DreamdropDemo” (of vergelijkbare naam) die panels, AI-layer, pipelines en theming benut.
* Referentie-module “RiskRadarDemo” (of vergelijkbare naam) die intensief de data-layer, pipelines en telemetry gebruikt.
* Performance-checks (bundlegrootte, initial load, lazy loading).
* Finale docs: `Skeleton_V3_Readme.md`, `Skeleton_V3_ArchitectureOverview.md`, `Skeleton_V3_Roadmap_Next.md`.

### Out-of-scope

* Geen volledige productieversies van Dreamdrop of RiskRadar; alleen demomodules met representatieve belasting en patronen.

### Cursor.ai prompt

```text
PROJECT: Skeleton V3 – Fase 10 (Hardening & Reference Implementations)

CONTEXT:
- Alle V3-lagen zijn aanwezig (theme, panels, pipelines, ai, telemetry, i18n, tooling).
- Doel: referentie-implementaties en hardening zodat zware apps aantoonbaar op deze skeleton passen.

OPDRACHT:
1) DreamdropDemo-module
   - Maak een module (bijv. `src/modules/dreamdropDemo/`) die:
     - Een hoofdscherm heeft met formulieren of inputs.
     - Panels gebruikt (bijv. details, history, instellingen) via de panel-engine.
     - Een AI-pipeline gebruikt voor een demo (bijv. droom-tekst → AI-samenvatting via pipeline-layer + ai-layer).
     - Theme-switching toont (bijv. een schermsectie die duidelijk anders oogt in Dark vs Light).

2) RiskRadarDemo-module
   - Maak een module (bijv. `src/modules/riskRadarDemo/`) die:
     - Data-layer intensief gebruikt (meerdere resources, caching).
     - Pipelines gebruikt voor berekeningen (bijv. risico-score).
     - Telemetry-events stuurt bij belangrijke acties (view, berekening, fout).

3) Performance & lazy loading
   - Zorg dat beide demo-modules lazy geladen worden via route-splitting.
   - Voer een snelle bundlegrootte-check uit en optimaliseer waar mogelijk (zonder overkill).

4) Finale documentatie
   - Maak `docs/Skeleton_V3_Readme.md` met een overzicht hoe de skeleton te gebruiken is.
   - Maak `docs/Skeleton_V3_ArchitectureOverview.md` met een high-level architectuurschema en uitleg van de belangrijkste lagen.
   - Maak `docs/Skeleton_V3_Roadmap_Next.md` met ideeën voor toekomstige uitbreidingen.

ACCEPTATIECRITERIA:
- Beide demo-modules draaien in de app zonder fouten.
- Demo’s gebruiken aantoonbaar panels, pipelines, ai-layer, telemetry en theming.
- Documentatie beschrijft duidelijk hoe Skeleton V3 als basis voor zware PWA’s gebruikt kan worden.
```

---

*Einde Skeleton_V3_Bouwpad.md*
