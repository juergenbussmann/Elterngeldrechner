# Module template (basic)

Dit is een lichtgewicht startpunt voor een nieuwe module (lijst + detail of eenvoudig formulier) zonder AI- of pipeline-afhankelijkheden.

## Gebruik

1. Kopieer deze map naar `src/modules/<module-id>/`.
2. Vervang **alle** voorkomens van `__MODULE_ID__` en `__ModuleName__` (en hernoem de bestanden `__MODULE_NAME__*.tsx`) naar je echte module-id en componentnaam.
3. Vul de UI-teksten in `src/locales/de.json` aan met i18n-keys zoals `modules.<id>.title`, `modules.<id>.form.titleLabel`, enz.
4. Registreer de module in `src/config/moduleRegistry.ts` met `id`, `labelKey`, `routeBase`, `component`, `hasSettings`, enz.
5. (Optioneel) Koppel een widget of settings volgens `MODULE_AUTHOR_GUIDE_V3.md`.

Zie `MODULE_AUTHOR_GUIDE_V3.md` voor het volledige proces en checklists.

