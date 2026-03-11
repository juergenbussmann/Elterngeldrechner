# Einstieg in eine neue PWA (Skeleton V3)

Dieser Leitfaden beschreibt die Schritte, um von Skeleton V3 zu einer neuen PWA zu gelangen. Verwende die Checklisten am Ende, um nichts zu übersehen.

## 1. Voraussetzungen

- Node.js (LTS)
- npm
- Git

## 2. Repository vorbereiten

1. Klone dieses Repo oder verwende es als Vorlage für dein neues Projekt.
2. Passe das Git-Remote auf dein eigenes Repository an.
3. Führe `npm install` aus.

## 3. Basiskonfiguration und Branding

1. Öffne `templates/pwa-config/appConfig.example.ts` als Referenz.
2. Fülle `src/config/appConfig.ts` aus (appName, shortName, description, primaryColor, logoPath).
3. Prüfe die PWA-Icons in `public/icons/` und aktualisiere sie bei Bedarf.
4. Aktualisiere die Manifest-Farben (`THEME_COLOR`, `BACKGROUND_COLOR`) bei Bedarf.

## 4. Module hinzufügen

1. Wähle den Modultyp:
   - Einfaches Modul → kopiere `templates/module-basic/*`.
   - Heavy Modul (AI + Pipeline) → kopiere `templates/module-ai-heavy/*`.
2. Folge `MODULE_AUTHOR_GUIDE_V3.md` für die Registrierung in `moduleRegistry`, Routen und Settings.
3. Füge i18n-Keys in `src/locales/de.json` hinzu (und in weiteren Sprachen, falls verwendet).

## 5. Theme und i18n einrichten

1. Passe Basis-Keys über `templates/pwa-config/i18n-example.*.json` an.
2. Prüfe Theme-Einstellungen über `src/core/theme` und appConfig-Farben.
3. Teste den Sprachwechsel über die Settings in der App.

## 6. Telemetry, AI und Pipelines

- Telemetry: konfiguriere Endpoint und Defaults in `appConfig.ts` (über `DEFAULT_TELEMETRY_CONFIG`).
- AI: verwende `runAiTask` wie in der `GlobalSettingsScreen`-Demo; für Heavy-Module siehe Template.
- Pipelines: verwende `usePipeline` und definiere eine `PipelineDefinition` (siehe Heavy-Template).

## Checkliste: Neue PWA

- [ ] Repo geklont / eigenes Remote eingerichtet.
- [ ] `npm install` ausgeführt.
- [ ] `src/config/appConfig.ts` ausgefüllt (Branding, Farben, Logo).
- [ ] i18n-Keys aktualisiert (Titel, Navigation, Basiscopy).
- [ ] Module in `src/config/moduleRegistry.ts` aktiviert.
- [ ] (Optional) Telemetry-Config eingerichtet.
- [ ] (Optional) AI/Pipeline-Endpoints und -Keys konfiguriert.
- [ ] `npm run lint` und `npm run test` laufen erfolgreich.
- [ ] `npm run build` erzeugt einen erfolgreichen Build.

