# Module Author Guide – PWA Skeleton v2

> LET OP: Voor nieuwe modules in Skeleton V3 gebruik je `MODULE_AUTHOR_GUIDE_V3.md`.

Dit document helpt je een nieuwe module te bouwen op het v2-skelet. Een module bestaat minimaal uit één scherm (`component`) en kan optioneel een home-widget en eigen settings hebben.

## Module-architectuur in het kort

- Centrale registratie: `src/config/moduleRegistry.ts` definieert het contract `ModuleDefinition`:
  - `id`: unieke machine-naam van de module (bijv. `tasks`).
  - `labelKey`: i18n-key voor de modulenaam in UI.
  - `routeBase`: hoofdroute voor de module (bijv. `/tasks`).
  - `hasHomeWidget`: of de module een widget aanbiedt.
  - `hasSettings`: of de module module-specifieke instellingen heeft.
  - `settingsRoute?`: optionele route naar het settings-scherm (alleen invullen als `hasSettings` true is).
  - `component`: de hoofdcomponent (React.FC) die onder `routeBase` wordt gerenderd.
- Router-koppeling: `routeBase` en `component` worden door de router gebruikt om het scherm te tonen; `labelKey` wordt in UI/navigatie gebruikt.
- Home-widgets: `src/config/homeWidgets.ts` koppelt widgets aan modules met `id`, `moduleId`, optionele `priority` (sorting) en `span` (1 of 2 kolommen). Voorbeeld: `notesWidget` wijst naar `moduleId: 'notes'`.
- Module-settings: `src/core/settings/ModuleSettingsScreen.tsx` is de centrale router voor module-settings. De mapping `moduleSettingsComponents` koppelt `moduleId` → settings-component. De route moet overeenkomen met `settingsRoute` in de registry.
- Voorbeeldmodule: de Notes-module (`id: 'notes'`) toont het volledige contract: scherm, widget en settings.

## Stappenplan: Nieuwe module toevoegen

1. **Module-id en routes kiezen**
   - Kies een unieke `id` (bijv. `tasks`).
   - Bepaal de hoofdroute, bijv. `/tasks`.
   - Bedenk of er module-settings nodig zijn en welke route daarvoor geldt, bijv. `/settings/tasks`.

2. **Module-component aanmaken**
   - Maak een map `src/modules/<id>/`, bijv. `src/modules/tasks/`.
   - Implementeer een hoofdcomponent (bijv. `TasksModule`) als `React.FC`, naar analogie van `NotesModule`.
   - Gebruik bestaande shared UI (`Card`, `Button`, `TextInput`, `TextArea`, `List`, enz.) en helpers (`validateRequired`, `useNavigation`, API-client, logging/telemetry).

3. **i18n-keys toevoegen**
   - Voeg alle zichtbare tekst toe aan `src/locales/de.json` (brontaal `de`). Gebruik consistente keys, bijvoorbeeld:
     - `modules.tasks.title`
     - `modules.tasks.description`
     - extra knoppen/labels naar behoefte.
   - Alle tekst in de UI gaat via `useI18n`; geen hardcoded strings.

4. **Module registreren in `moduleRegistry`**
   - Open `src/config/moduleRegistry.ts`.
   - Importeer de nieuwe module-component.
   - Voeg een `ModuleDefinition` toe met:
     - `id`: module-id.
     - `labelKey`: i18n-key voor de titel (sluit aan op de keys uit stap 3).
     - `routeBase`: hoofdroute.
     - `hasHomeWidget`: `true` als de module een widget levert, anders `false`.
     - `hasSettings`: `true` als de module settings heeft, anders `false`.
     - `settingsRoute`: alleen invullen als `hasSettings` true is.
     - `component`: de module-component.

5. **Optioneel: home-widget koppelen**
   - Open `src/config/homeWidgets.ts`.
   - Voeg een `HomeWidgetConfig` toe met uniek `id`, `moduleId` en optioneel `priority` en `span` (1 of 2 kolommen).
   - Gebruik `notesWidget` als voorbeeld voor structuur en velden.

6. **Optioneel: module-settings koppelen**
   - Maak een settings-component in de modulemap (bijv. `TasksSettings`) met i18n-keys uit `de.json`.
   - Registreer de component in `moduleSettingsComponents` binnen `src/core/settings/ModuleSettingsScreen.tsx` met de module-id als key.
   - Zorg dat `settingsRoute` in de registry overeenkomt met de bestaande routerconfiguratie (`/settings/<id>`).

7. **Navigatie en UX controleren**
   - Controleer dat je module bereikbaar is via `routeBase`.
   - Controleer dat de widget zichtbaar is als hij in `homeWidgets` staat.
   - Controleer dat het settings-scherm rendert als `hasSettings` true is en `settingsRoute` klopt.

## Voorbeelden (Notes-module en templates)

- Notes-module:
  - Registry-entry: `id: 'notes'`, `labelKey: 'notes.title'`, `routeBase: '/notes'`, `hasHomeWidget: true`, `hasSettings: true`, `settingsRoute: '/settings/notes'`, `component: NotesModule`.
  - Widget: `homeWidgets` bevat `notesWidget` met `moduleId: 'notes'`, `priority: 1`, `span: 2`.
  - Settings: `ModuleSettingsScreen` koppelt `notes` → `NotesSettings`; de module gebruikt `openModuleSettings('notes')` voor navigatie.
- Templates uit Fase 19 (onder `src/modules/templates/`):
  - `ListDetailTemplate`: list/detail-flow met selectie en detail-paneel.
  - `FormTemplate`: basisformulier met validatievoorbeeld.
- Nieuwe modules kunnen direct op deze templates voortbouwen door ze te kopiëren en te specialiseren.

## Best practices

- Navigatie alleen via `useNavigation` (geen `window.location` of directe router-manipulatie).
- Tekst altijd via i18n (`useI18n`, keys in `src/locales/de.json`); label-keys in de registry verwijzen naar dezelfde i18n-keys.
- Gebruik shared services: storage (`shared/lib/storage`), API-client (`shared/lib/api`), logging en telemetry (`shared/lib/logging`, `shared/lib/telemetry`), notificaties (`shared/lib/notifications`), formulieren/validatie (`shared/lib/forms`).
- Hergebruik shared UI-componenten (`shared/ui`) en hou module-specifieke styling minimaal.
- Houd modules klein en focust; verplaats herbruikbare logica naar `shared/lib` of `shared/ui`.
- Voeg feedback toe via notificaties/toasts in plaats van `alert` of kale console-logs.

## Checklist voor een nieuwe module

- [ ] Modulemap en hoofdcomponent bestaan in `src/modules/<id>/`.
- [ ] i18n-keys staan in `src/locales/de.json` en worden gebruikt in de UI.
- [ ] Module staat geregistreerd in `src/config/moduleRegistry.ts` met de juiste velden.
- [ ] (Optioneel) Widget staat in `src/config/homeWidgets.ts`.
- [ ] (Optioneel) Settings-component is gekoppeld in `ModuleSettingsScreen`.
- [ ] Navigatie en UX zijn getest (route, widget, settings).
- [ ] `npm run build` slaagt zonder errors.


