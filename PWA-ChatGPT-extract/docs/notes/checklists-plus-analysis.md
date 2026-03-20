# PHASE 0 – Checklisten Plus: Analyse

## 1. Datenquellen der System-Checklisten

| Rubrik | Datei | Struktur | Storage |
|--------|-------|----------|---------|
| Schwangerschaft | `src/modules/checklists/domain/checklistItems.ts` → `schwangerschaftItems` | `{ id, labelKey }[]` | localStorage `checklistSchwangerschaftState.v1` → `ChecklistState` |
| Geburt | `checklistItems.ts` → `geburtItems` | `{ id, labelKey }[]` | localStorage `checklistGeburtState.v1` → `ChecklistState` |
| Stillen | `src/modules/still-daily-checklist/domain/template.ts` → `stillDailyChecklistTemplate` | `{ id, label }[]` (label = string | ReactNode) | localStorage `stillDailyChecklistState.v1` → `ChecklistState` |

**ChecklistState** (`still-daily-checklist/domain/types.ts`): `{ items: Record<string, boolean>; updatedAt: number }`

Systemlisten sind **nicht** in einer zentralen JSON-Datei; sie sind in TS-Dateien hardcodiert.

## 2. Routen

| Route | Komponente |
|-------|------------|
| `/checklists` | `ChecklistsScreen` – Übersicht mit 3 Links |
| `/checklists/schwangerschaft` | `ChecklistsPregnancyPage` |
| `/checklists/geburt` | `ChecklistsBirthPage` |
| `/checklists/stillen` | `ChecklistsBreastfeedingPage` (nutzt `StillDailyChecklistPage`) |

Keine Detail-Route mit dynamischer ID. Jede Rubrik ist eine eigene Seite.

## 3. UI-Komponenten (wiederverwenden)

- **Button**: `src/shared/ui/Button.tsx` – `variant`: primary | secondary | ghost, `fullWidth`
- **Card**: `src/shared/ui/Card.tsx`
- **SectionHeader**: `src/shared/ui/SectionHeader.tsx`
- **ChecklistRubricSection**: `src/modules/checklists/ui/ChecklistRubricSection.tsx` – Card mit Checkboxen, Reset, Back
- **StillDailyChecklistPage**: ähnliches Layout, eigener Template

**Styles**: `btn--softpill`, `next-steps__button`, `next-steps__stack`, `still-daily-checklist__card`, `still-daily-checklist__list`, `still-daily-checklist__item`, `settings-checkbox`, `checklists__rubric`, `checklists__nav-link`

## 4. Plus-Mechanismus

- **Hook**: `useBegleitungPlus()` → `{ isPlus, hasFeature, limits, entitlements, activate, deactivate }`
- **Store**: `begleitungPlusStore.ts` – `getEntitlements()`, `activatePlus()`, `deactivatePlus()`
- **Config**: `config/begleitungPlus.ts` – `FeatureKey`, `FEATURE_PLUS_MAP`, `isFeaturePlus()`
- **Upsell**: `openBegleitungPlusUpsell({ reason, feature })` für Nicht-Plus

Kein `window.__PLUS__`. Plus = `entitlements.isPremium` aus localStorage.

## 5. IndexedDB

- `src/shared/lib/storage/indexedDb.ts`: `openDB`, `put`, `get`, `getAll`, `deleteItem`, `waitForTransaction`
- Keine Dexie; reine IDB-API.

## 6. Datenfluss (aktuell)

1. Page lädt → `getValue(key)` aus localStorage
2. `mergeWithTemplate(loaded, template)` → State
3. Toggle/Reset → `setValue(key, next)` + `setState`
4. Export (nur Plus): `openBottomSheet('export', { scope: 'checklists', data })`

## 7. Wiederverwendung für Plus

- **Button**: `btn--softpill` + `next-steps__button` für Konsistenz
- **Card**: `still-daily-checklist__card` für Checklisten-Items
- **Layout**: `screen-placeholder checklists-screen`, `checklists__rubric`, `next-steps__stack`
- **Plus-Check**: `useBegleitungPlus().isPlus` – UI-Gating; Service braucht `requirePlus()`-Guard

---

## PHASE 3 – Manuelle Test-Checkliste

1. **Nicht-Plus**: Keine Edit-Buttons, alles wie vorher. ✓
2. **Plus**: "Neue Checkliste" erstellen → erscheint in Übersicht, editierbar. ✓
3. **Plus**: Systemliste öffnen → "Anpassen" → Override entsteht, Änderungen bleiben nach Reload. ✓
4. **Reset auf Standard**: Override löschen → Systemliste wieder sichtbar. ✓
5. **DB-Fallback**: Wenn DB ausfällt, App crasht nicht; Systemlisten funktionieren. ✓
