# Optimierungs-Einstieg im Wizard – Analyse

## Phase 1: Analyse

### 1.1 Aktuelle Einstiegspunkte

| Ort | Bedingung für Anzeige | Label |
|-----|----------------------|-------|
| **StepPlan** | hasPartner && partnerBonusValidation.isValid && optimizationSummary.hasAnySuggestions && !(mainHint mit anderer Aktion) | „Optimierung ansehen“ |
| **StepPlan** (mainHint) | mainHint.action === 'openOptimization' – wird von getHintActionFromWarning **nie** zurückgegeben | – |
| **StepSummary** | displayHint.type === 'optimization' → nur wenn **keine** Errors/Warnings UND hasAnySuggestions | „Optimierung ansehen“ |

### 1.2 Problem: Einstieg oft unsichtbar

**StepPlan – Button wird versteckt wenn:**
- Kein Partner (Single Parent) → Button erscheint nie
- Partner-Bonus ungültig → Button erscheint nie
- mainHint mit anderer Aktion (z. B. „Monat X anpassen“, „Einkommen anpassen“) → eigener Optimierungs-Button wird durch mainHint-Card ersetzt, die eine andere Aktion hat
- Keine Optimierungsvorschläge → Button erscheint nie

**StepSummary – Button wird versteckt wenn:**
- Validation-Errors oder -Warnings → displayHint = critical, Optimierungs-Hinweis wird nicht angezeigt
- Keine Optimierungsvorschläge → displayHint ≠ optimization

### 1.3 Fazit

Der Optimierungs-Einstieg ist stark an Bedingungen geknüpft. In vielen realistischen Szenarien (z. B. Single Parent, Validierungswarnungen, Bonus noch nicht passend) ist **kein** sichtbarer Einstieg vorhanden.

---

## Phase 2: Validierung

| Regel | Status | Begründung |
|-------|--------|------------|
| R1 – Einstieg muss sichtbar sein | ✗ | Oft versteckt durch Bedingungen |
| R2 – Kontextbezogen | ✓ | Plan-Screen / Summary – wenn sichtbar |
| R3 – Kein versteckter Einstieg | ✗ | Nutzer muss Bedingungen erfüllen |
| R4 – Kein alter Flow | ✓ | Nutzt OptimizationOverlay |

---

## Phase 3: Umsetzung (erledigt)

### StepPlan
- **Vorher:** Button nur bei hasPartner && partnerBonusValidation.isValid && hasAnySuggestions && !mainHint
- **Nachher:** Button bei optimizationSummary.hasAnySuggestions && onShowOptimizationOverlay
- Text angepasst: „Dein Plan funktioniert…“ bei Partner + gültigem Bonus, sonst „Du kannst prüfen, ob eine andere Aufteilung vorteilhafter wäre.“

### StepSummary
- **Neu:** Button „Optimierung ansehen“ in den Actions, wenn hasAnySuggestions && onOpenOptimization
- Zusätzlich zum bestehenden displayHint-Block (optimization), wenn keine Errors/Warnings
