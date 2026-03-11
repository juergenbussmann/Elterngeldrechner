# SKELETON_V3_SCOPE.md

> Dit document definieert de **scope, randvoorwaarden en non-goals** van Skeleton V3 binnen het PWA Factory-project. Het vormt het *product-contract* voor alle implementatie in Cursor.ai en in de repo `pwa-skeleton`.

---

## 1. Doel & Positionering

**Skeleton V3** is het standaard, herbruikbare PWA-skelet voor de **PWA Factory**. Het is ontworpen om:

1. **Lichte PWA’s** (notes, trackers, eenvoudige tools) snel te kunnen opleveren.
2. **Zware PWA’s** (bijv. Dreamdrop, RiskRadar) te dragen, met AI-integraties, pipelines en intensieve dataverwerking.

Skeleton V3 is de directe opvolger van Skeleton V2:

* V2 = solide, modulaire basis voor één PWA.
* V3 = **factory-grade skeleton** met extra lagen: theme engine, panel-engine, data/pipeline-layer, AI-layer, verbeterde telemetry, multi-language en factory tooling.

Skeleton V3 is geen eindproduct, maar een **engine + raamwerk** waarop product-PWA’s worden gebouwd.

---

## 2. Doelgroep & Use Cases

### 2.1 Doelgroep

* **Product owner / architect** die snel nieuwe PWA-concepten wil valideren.
* **Full-stack / frontend ontwikkelaars** die betrouwbare, consistente fundamenten nodig hebben.
* **AI- & data-ontwikkelaars** die zware workflows (AI, risico-analyse, verwerking) in de browser willen orkestreren.

### 2.2 Gebruiksscenario’s

1. **Light apps**

   * Voorbeelden: Micro-habits, notes, timers, simpele dashboards.
   * Kenmerken: paar schermen, eenvoudige data, geen zware AI/pipelines.

2. **Heavy apps**

   * Voorbeelden: Dreamdrop, RiskRadar.
   * Kenmerken: AI-calls, meerdere pipelines, veel API-verkeer, complexere UI-flows met panels en widgets.

Skeleton V3 moet beide klassen ondersteunen, zonder voor light apps onnodig complex te worden.

---

## 3. In-Scope Capabilities (V3 Core)

Onderstaande capabilities zijn **verplicht** onderdeel van Skeleton V3. Implementatiedetails en fasering staan in `Skeleton_V3_Bouwpad.md`.

### 3.1 Shell & Layout

* Single root React-app (`main.tsx` → `AppRoot` → `AppShell`).
* Mobile-first, **mobile + tablet portrait only**.
* Desktop-blockscreen met duidelijke messaging en QR/deeplink-mogelijkheid.
* AppShell met vaste structuur:

  * Header (titel + acties)
  * Content area (router)
  * Footer/bottom-nav
  * PanelHost (left/right/bottom)
  * Notifications-host

**Resultaat:** De shell is voorbereid op eenvoudige apps én complexe panel-gedreven flows.

### 3.2 Navigatie & Actions (incl. submenu)

* Centraal **screen-configuratiemodel** (`screenConfig`) waarin per scherm is gedefinieerd:

  * id, route, titel (i18n key), type (main/detail/settings)
  * `primaryActions` (icon-buttons, zichtbaar in header)
  * `menuActions` (submenu/context acties)
* Centrale navigatie-hook (`useNavigation`) voor:

  * route-navigatie
  * openen van settings, modules, detailschermen
  * integratie met panel-engine
* Declaratief actions-systeem:

  * `ScreenAction` met types zoals `navigate`, `panel`, `custom`.
  * Header-componenten lezen actions vanuit config en voeren ze via navigation-/panel-API uit.

**Resultaat:** Alle schermacties zijn declaratief, consistent en herbruikbaar. Modules voegen acties toe via configuratie, niet via losse eventhandlers.

### 3.3 Theming & Branding (Theme Engine v1)

* Centrale **theme-engine** met:

  * `ThemeDefinition` contract (kleuren, typography, spacing, component-tokens).
  * Minimaal twee themes: `lightDefault` en `darkDefault` (of `highContrast`).
  * `ThemeProvider` + `useTheme()`-hook.
* User preference:

  * Instelling: `System / Light / Dark`.
  * Persist via storage.
  * Bij `System`: gebruik OS `prefers-color-scheme`.
* Branding-config (**APP_BRAND**):

  * Naam, shortName, beschrijving, logo, primaire kleur(en).
  * Theme-tokens mogen APP_BRAND gebruiken als input.
* Shared UI-componenten (Button, Card, Inputs, Nav, Panels, etc.) gebruiken **uitsluitend theme tokens**, nooit hardcoded kleuren.

**Resultaat:** Iedere PWA krijgt minimaal twee volwaardige themes; branding en look & feel zijn centraal regelbaar.

### 3.4 Modules, Widgets & Configuratie

* Module-systeem met **ModuleRegistry**:

  * Module-id, routes, hoofdscherm(en), widget(s), module-settings, optionele header-actions.
  * Modules declareren hun eigen capabilities, maar volgen het V3-contract.
* Widget-grid op home:

  * 1–2 kolommen, configurabel per widget (priority/span, module-binding).
  * HomeWidgets-config bepaalt de layout, geen handmatige layout-code per module.
* Module-settings integratie:

  * Globale settings scherm.
  * Per module een settings-plek via registry en route-config.

**Resultaat:** Het is eenvoudig om nieuwe modules en widgets toe te voegen en te configureren zonder de kern van de app te wijzigen.

### 3.5 Data & Pipeline Layer v1

* **Pipeline-layer** (`shared/lib/pipeline`):

  * Basisconcepten: PipelineDefinition, PipelineStep, Job, JobStatus.
  * In-memory job-queue met retries en eenvoudige backoff.
* Hook `usePipeline` om pipelines vanuit UI te starten en te monitoren.
* **Data-layer** boven op api-client (`shared/lib/data`):

  * `getResource` + caching.
  * `useResource` hook voor declaratief data ophalen.

**Resultaat:** Zware workflows (AI, berekeningen, data-aggregatie) kunnen op een consistente, herbruikbare manier worden opgebouwd.

### 3.6 AI Integration Layer v1

* `shared/lib/ai` met generieke **AiClient interface**:

  * Methoden zoals `completeText`, `classify`, etc.
  * Resultaattype met tekst en metadata.
* Default implementatie `HttpAiClient` via configureerbaar endpoint (base URL in config, secrets extern).
* Helpers voor:

  * `AiTask` (korte, directe calls).
  * `AiJob` (AI-calls als deel van pipelines).
* Integratie met telemetry: AI-calls worden gelogd (zonder gevoelige payloads).

**Resultaat:** Alle toekomstige AI-functionaliteit (Dreamdrop, RiskRadar) gebruikt één consistente integratielaag.

### 3.7 Telemetry & Monitoring v2

* Formeel **eventschema** voor:

  * `screen_view`
  * `user_action`
  * `pipeline_job`
  * `ai_call`
  * `error`
* `TelemetryClient` met pluggable transports:

  * `ConsoleTransport` (dev).
  * `HttpTransport` (prod, endpoint via config).
* Config-gestuurde sampling en enable/disable.
* Instellingen in UI: gebruiker kan telemetry (diagnostics) aan/uitzetten (GDPR/bewustzijn).

**Resultaat:** Er is een eenduidige manier om gedrag, fouten en performance te meten zonder ad hoc console-logs.

### 3.8 i18n v2 (multi-language)

* i18n-laag met:

  * Basistaal `de` (Duits).
  * Minimaal één extra taal: `en` (Engels).
  * Identieke key-structuur tussen talen.
* Language settings:

  * `System / Deutsch / English`.
  * Persist in storage.
  * Bij `System`: browser/OS-locale als default.
* Richtlijnen voor modules:

  * Alle zichtbare strings via i18n-keys.
  * Geen hardcoded UI-strings.

**Resultaat:** De skeleton is direct in minstens twee talen inzetbaar; uitbreiding naar extra talen is eenvoudig.

### 3.9 PWA, Offline & Infra-lagen

* PWA-config via Vite + `vite-plugin-pwa`:

  * Manifest vanuit config.
  * Icons (192/512) aanwezig.
  * Orientation: portrait-only.
* Offline:

  * Offline-screen + route.
  * Basis offline-detectie en messaging.
* Infra-lagen:

  * Storage-layer (namespaced, safe).
  * Logging-layer (levels, prod/dev-beleid).
  * Api-client wrapper (GET/POST, error logging, basis timeouts).

**Resultaat:** V3 is een moderne PWA volgens gangbare best practices en W3C-richtlijnen.

### 3.10 Factory Tooling v1 (Templates & Checklists)

* Template-structuur in `templates/`:

  * `module-basic/`
  * `module-ai-heavy/`
  * `pwa-config/`
* Gedetailleerde documentatie:

  * `GettingStartedNewPWA_V3.md`.
  * `MODULE_AUTHOR_GUIDE_V3.md`.
* Checklists voor:

  * Nieuwe PWA.
  * Nieuwe module.
  * Heavy-module (AI + pipelines).

**Resultaat:** Het opzetten van een nieuwe PWA of module is herhaalbaar, voorspelbaar en goed gedocumenteerd.

---

## 4. Explicit Out-of-Scope (blijft NIET in V3)

De volgende zaken vallen **bewust buiten** de scope van Skeleton V3 en mogen niet in de codebase of scope-documenten worden ingebouwd als harde verplichtingen:

1. **Multi-tenant SaaS-platform**

   * V3 is een skeleton voor één PWA tegelijk, niet voor een multi-tenant runtime.
   * Multi-tenant gedrag wordt in product-specifieke lagen opgelost, niet in de skeleton.

2. **Backend-implementaties**

   * Geen Node/Express/NestJS backend in dit repo.
   * Alleen frontend + PWA + generic HTTP-clients.

3. **Auth/Identity-framework**

   * Geen ingebakken auth-systeem.
   * Integratie met externe auth (OAuth, OpenID, etc.) gebeurt in product-PWA’s of toekomstige extensies.

4. **Volwaardige CLI**

   * Geen complete command line tool in deze versie.
   * Alleen templates + beschrijvingen; een echte CLI kan in een later project/fase volgen.

5. **Vendor-lock-in op AI-provider**

   * Geen directe, hardcoded koppeling met één AI-provider.
   * AiClient-interface is provider-agnostisch; concrete implementaties zijn vervangbaar.

6. **Complexe realtime-features**

   * Geen ingebouwde websockets, realtime presence of sync-engine.
   * Kan later per product-PWA worden toegevoegd.

7. **Desktop-UI**

   * Geen aparte desktop-layouts.
   * Desktop blijft geblokkeerd (alleen mobile/tablet portrait ondersteund).

---

## 5. Kwaliteits- en Technische Randvoorwaarden

### 5.1 Stack & tooling

* **React 18**, **Vite**, **TypeScript (strict mode)**.
* React Router 6.x (moderne API) voor client-side routing.
* ESLint met flat config + @typescript-eslint; geen verouderde .eslintrc meer.
* Basis test-setup (bijv. Vitest/Testing Library) voor kerncomponenten en helpers.

### 5.2 Architectuurprincipes

* **Single root policy**: één app-root, geen extra React-roots.
* **Config-driven design**: navigatie, modules, widgets en themes worden via config aangestuurd.
* **Separation of concerns**:

  * core/shell vs. modules
  * shared infra-lagen (storage, logging, telemetry, ai, pipeline)
  * config vs. implementatie
* **Backward-friendly**: V2-modules kunnen met beperkte aanpassing op V3 draaien, maar V3-lagen zijn leidend voor nieuwe modules.

### 5.3 Webstandaarden & a11y

* Semantische HTML-structuur (header/main/footer/section).
* Toegankelijke notificaties (aria-live, role="status").
* Focus-management en keyboard-navigatie voor kritieke UI-elementen (menus, modals/panels).
* PWA-standaarden: manifest, service worker, offline feedback.

### 5.4 Performance

* Mobile-first optimalisaties: beperkte initial bundle size, route-based code splitting.
* Lazy loading van modules waar logisch.
* Geen onnodige zware libraries zonder expliciete reden.

---

## 6. Compatibiliteit & Migratie t.o.v. V2

* Skeleton V2 vormt de basis; V3 wordt via gecontroleerde uitbreidingen opgebouwd.

* Bestaande V2-modules draaien in principe door, maar:

  * Nieuwe modules moeten **V3-conform** zijn (theme-engine, i18n v2, telemetry, etc.).
  * V2-style patronen (hardcoded kleuren, geen telemetry, geen i18n) worden als *legacy* beschouwd en gefaseerd opgeruimd.

* Waar mogelijk blijven bestaande API’s in shared-lagen backward compatible. Als breaking changes nodig zijn, worden ze expliciet in `Skeleton_V3_Bouwpad.md` benoemd.

---

## 7. Relatie met Skeleton_V3_Bouwpad.md

* **Dit document (SKELETON_V3_SCOPE.md)** definieert **wat** Skeleton V3 is en waar het aan moet voldoen.
* **`Skeleton_V3_Bouwpad.md`** definieert **hoe en in welke volgorde** de implementatie plaatsvindt, inclusief Cursor-specifieke prompts.

Bij conflicten geldt de volgende prioriteit:

1. **SKELETON_V3_SCOPE.md** (dit scope-document).
2. **Skeleton_V3_Bouwpad.md** (fasering en prompts).
3. Overige docs (GettingStarted, Module Author Guide, etc.).

---

*Einde SKELETON_V3_SCOPE.md*
