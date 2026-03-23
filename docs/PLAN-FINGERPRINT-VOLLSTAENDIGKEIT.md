# Analyse: Vollständigkeit von planFingerprint (strukturelle Gleichheit)

**Stand:** Faktenbasierte Code-Analyse. Keine Änderungen.

---

## 1. Implementierung von planFingerprint

**Datei:** `src/modules/documents/elterngeld/calculation/elterngeldOptimization.ts` (Zeile 1059–1070)

**Code:**
```ts
function planFingerprint(plan: ElterngeldCalculationPlan): string {
  const parts: string[] = [];
  for (const p of plan.parents) {
    const modes = p.months
      .filter((m) => m.mode !== 'none')
      .map((m) => `${m.month}:${m.mode}`)
      .sort((a, b) => parseInt(a.split(':')[0], 10) - parseInt(b.split(':')[0], 10))
      .join(',');
    parts.push(modes);
  }
  return parts.join('|');
}
```

### Einfließende Felder

| Quelle | Feld | Eingesetzt |
|--------|------|------------|
| `plan.parents` | Array-Indizes (0 = Mutter, 1 = Vater) | Ja |
| `p.months` | Array von Monatsobjekten | Ja |
| `m.month` | Lebensmonat (1–14/24/36) | Ja |
| `m.mode` | `'basis' \| 'plus' \| 'partnerBonus'` | Ja |

### Nicht einfließende Felder

| Feld | Auswirkung auf Berechnung |
|------|---------------------------|
| `m.incomeDuringNet` | `loss = incomeBeforeNet - incomeDuringNet` → beeinflusst Betrag |
| `m.hoursPerWeek` | Validierung (>32 Warnung), nicht direkt Betrag |
| `m.hasMaternityBenefit` | Nur Hinweis im Breakdown, nicht Betrag |
| `p.incomeBeforeNet` | Betrag – aber pro Elternteil, nicht pro Monat |
| `plan.childBirthDate`, `hasSiblingBonus`, `additionalChildren` | Kontext für Berechnung, nicht Monatsverteilung |

### Codierung der Monatsstruktur

- Nur Monate mit `mode !== 'none'` gehen ein.
- Format pro Elternteil: `"month:mode,month:mode,..."` (aufsteigend nach Monat sortiert).
- Elternteile mit `|` getrennt: `"Parent0_modes|Parent1_modes"`.

### Mutter/Vater

- `plan.parents[0]` → erster Teil vor `|`
- `plan.parents[1]` → zweiter Teil nach `|`
- Reihenfolge bleibt erhalten.

### Modus

- `basis`, `plus`, `partnerBonus` werden explizit übernommen.
- `none` wird ignoriert (Monat entfällt im Fingerprint).
- Es gibt kein `both` – „beide“ ist über zwei Einträge (je Parent) mit `partnerBonus` abgebildet.

---

## 2. Abdeckung der Monatsstruktur

### Monate 1–14 / 1–24

- Keine feste Obergrenze: Alle Monate mit `mode !== 'none'` werden einbezogen.
- Monate ohne Belegung sind implizit abwesend (kein Eintrag im Fingerprint).
- Plan A: Monate 1–3 Basis, Rest none → `"1:basis,2:basis,3:basis|"`.
- Plan B: Nur Einträge 1–3 → dasselbe.

### modeA / modeB

- modeA ≈ `parents[0].months`
- modeB ≈ `parents[1].months`
- Beide Eltern fließen separat ein (beide Teile des Fingerprints).

### „None“-Monate

- Explizit ausgeschlossen: `.filter((m) => m.mode !== 'none')`.
- Keine explizite Codierung; Lücken entstehen durch fehlende Einträge.
- Zwei Pläne mit gleichen belegten Monaten/Modi sind strukturell äquivalent.

---

## 3. Bonusmonate / Partnerbonus

- `partnerBonus` ist ein eigener Modus.
- Partnerbonus-Monate erscheinen als `"month:partnerBonus"` für beide Eltern.
- Beispiel: LM 1–4 Bonus für beide → `"1:partnerBonus,2:partnerBonus,3:partnerBonus,4:partnerBonus|1:partnerBonus,2:partnerBonus,3:partnerBonus,4:partnerBonus"`.
- Bonusmonate werden damit vollständig im Fingerprint abgebildet.

---

## 4. Dauer / Bezugsmonate

- Dauer = Anzahl Monate mit `mode !== 'none'` (über beide Eltern, keine Doppelzählung bei Überlappung).
- Aus dem Fingerprint ableitbar: Anzahl `month:mode`-Einträge pro Elternteil; Überlappungen durch Vergleichen beider Teile.
- Keine Ambiguität: Gleicher Fingerprint ⇒ gleiche Belegung und damit gleiche Dauer.

---

## 5. Modellunterschiede (basis / plus)

- Pro Monat wird der Modus explizit gespeichert (`basis`, `plus`, `partnerBonus`).
- Unterschiede z.B. 1:basis vs. 1:plus führen zu unterschiedlichen Fingerprints.
- Keine Kollisionen zwischen basis und plus.

---

## 6. Edge Cases

### Gleicher Monat, unterschiedliche Elternverteilung

- Mutter LM 1 Basis, Vater LM 1 none: `"1:basis|"`.
- Mutter LM 1 none, Vater LM 1 Basis: `"|1:basis"`.
- Verschiedene Fingerprints.

### Sortierung

- `.sort((a, b) => parseInt(a.split(':')[0], 10) - parseInt(b.split(':')[0], 10))`.
- Sortierung nach Monatsnummer ist deterministisch.

### Lücken vs. Belegung

- Nur belegte Monate sind im Fingerprint.
- Gleich belegte Pläne (sparse vs. voller Horizont) ergeben denselben Fingerprint.

### Gleiche belegte Monate, unterschiedliche Modi

- 1:basis vs. 1:plus → unterschiedliche Fingerprints.
- Kein Informationsverlust für die Modusverteilung.

### incomeDuringNet

- Nicht im Fingerprint.
- Berechnung: `loss = incomeBeforeNet - incomeDuringNet`.
- Zwei Pläne mit gleicher Monatsverteilung, aber unterschiedlichem `incomeDuringNet` → gleicher Fingerprint, evtl. unterschiedlicher Betrag.
- Im Optimizer-Flow: `createReferencePlan`, `createBothBalancedPlan` etc. setzen `incomeDuringNet` konsistent auf 0.
- In `applicationToCalculationPlan`: ebenfalls 0.
- Im aktuellen System wird `incomeDuringNet` praktisch immer 0 gesetzt; Kollision ist damit theoretisch möglich, im Ist-Zustand aber nicht relevant.

### hoursPerWeek

- Nicht im Fingerprint.
- Beeinflusst nur Validierung (Warnung bei >32) und ggf. Partnerbonus-Validierung, nicht den Betrag.
- Kollision hätte nur Auswirkung auf Warnungen, nicht auf Idempotenz des Optimierungsergebnisses.

---

## 7. Ergebnis

### Deckt planFingerprint die vollständige fachliche Struktur ab?

Für die Optimierungslogik: **ja**, mit der unten genannten Ausnahme.

### Gibt es konkrete Kollisionen?

**Theoretisch ja: `incomeDuringNet`**

- Zwei Pläne mit gleicher Monatsverteilung (modeA/modeB), aber unterschiedlichem `incomeDuringNet`.
- Gleicher Fingerprint, unterschiedliche Beträge.
- **Wo die Information fehlt:** Der Fingerprint nutzt nur `month` und `mode`, nicht `incomeDuringNet`.
- Im aktuellen Code fließt `incomeDuringNet` nirgends als Nutzereingabe ein und wird in der Optimierung immer 0 gesetzt.

### Geeignet für strukturelle Gleichheit

- **Ja** für den Idempotenz-Fix in der Optimierung:
  - Alle Pläne aus dem Optimizer haben `incomeDuringNet = 0`.
  - Die relevanten Strukturmerkmale (Monatsverteilung pro Elternteil, Modi, Bonusmonate) sind vollständig abgebildet.
- **Bedingt** allgemein:
  - Falls irgendwann `incomeDuringNet` fachlich unterschiedlich gesetzt wird, würden solche Pläne den Fingerprint teilen und dadurch fälschlich als gleich gelten.

---

**Zusammenfassung**

| Aspekt | Vollständigkeit |
|--------|-----------------|
| Monatsbelegung (modeA/modeB je Monat) | Vollständig |
| Dauer / Bezugsmonate | Ableitbar |
| Bonusmonate | Explizit |
| basis vs. plus | Explizit |
| incomeDuringNet | Nicht enthalten (praktisch 0 im System) |
| hoursPerWeek, hasMaternityBenefit | Nicht enthalten (ohne Einfluss auf Betrag) |
| **Einschätzung für Idempotenz-Fix** | **Geeignet** |
