# Projekt-Kontext für ChatGPT

**Stillberatung PWA** – React/TypeScript PWA mit Elterngeld-Modul, Capacitor/Android.

---

## Tech-Stack

- React 18, TypeScript, Vite
- React Router, Capacitor (Android)
- Vitest, Playwright

---

## Elterngeld-Modul

### Routen

| Pfad | Komponente | Beschreibung |
|------|------------|--------------|
| `/documents/elterngeld` | ElterngeldWizardPage | Wizard-Flow (Vorbereitung) |
| `/documents/elterngeld-calculation` | ElterngeldCalculationPage | Berechnungs-Flow |

### Wichtige Dateien

- `src/modules/documents/elterngeld/steps/StepPlan.tsx` – Wizard-Schritt „Monate planen“, Monatsdialog
- `src/modules/documents/elterngeld/steps/CalculationMonthPanel.tsx` – Monatsdialog im Berechnungs-Flow
- `src/modules/documents/elterngeld/steps/PartnerBonusCheckDialog.tsx` – Dialog „Partnerschaftsbonus prüfen“
- `src/modules/documents/elterngeld/applicationToCalculationPlan.ts` – Mapping Wizard → Berechnung

### Partnerschaftsbonus – 4 Fälle im Monatsdialog

| Fall | Bedingung | Text | Button |
|------|-----------|------|--------|
| A | Basiselterngeld + Beide | Für Partnerschaftsbonus in diesem Monat auf ElterngeldPlus wechseln. | Auf ElterngeldPlus umstellen |
| B | ElterngeldPlus + NICHT Beide | Für Partnerschaftsbonus müssen in diesem Monat beide Eltern ausgewählt sein. | Beide auswählen |
| C | Basiselterngeld + NICHT Beide | Für Partnerschaftsbonus in diesem Monat ElterngeldPlus und 'Beide' wählen. | Diesen Monat als Bonusmonat setzen |
| D | ElterngeldPlus + Beide | Dieser Monat ist als gemeinsamer Bonusmonat geeignet. | keiner |

### Nicht ändern

- `calculatePlan`, `applicationToCalculationPlan`
- `partnerBonusValidation`, `validatePartnerBonus`
- Datenmodell, Berechnungslogik

---

## Befehle

```bash
npm run dev          # Dev-Server (Port 5173)
npm run build        # Production-Build
npx tsx scripts/verify-wizard-month-dialog.ts  # Sichtprüfung Wizard-Dialog
```

---

## Sprache

Antworten auf Deutsch.
