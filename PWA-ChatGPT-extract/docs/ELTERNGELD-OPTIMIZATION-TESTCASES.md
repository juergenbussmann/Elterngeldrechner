# Elterngeld-Optimierung – Testfälle und Auswertung

## Testfall-Definitionen

### A) Ähnliche Einkommen beider Eltern

**A1:** Beide 2500€, Mutter 2 Basis (Monate 1–2), Vater 2 Basis (Monate 3–4)
- **Erwartung:** maxMoney oft keine oder nur geringe Verbesserung
- **Begründung:** Bei gleichem Einkommen bringt Verschiebung zwischen Eltern keinen Vorteil

### B) Deutlich höheres Einkommen bei einem Elternteil

**B1:** Mutter 1200€, Vater 3500€ – Mutter hat 2 Basis (1–2), Vater 0
- **Erwartung:** Shifts sollten echte Verbesserungen finden (Monate zum Vater verschieben)

**B2:** Mutter 3500€, Vater 1200€ – Vater hat 2 Basis (3–4), Mutter 0
- **Erwartung:** Shifts sollten echte Verbesserungen finden (Monate zur Mutter verschieben)

### C) Bereits gut verteilter Ausgangsplan

**C1:** Mutter 1200€, Vater 3500€ – Vater (höherer Verdienst) hat bereits alle 4 Basis-Monate
- **Erwartung:** Keine Verbesserung

### D) Plan mit Plus-Monaten

**D1:** Beide 2000€, Mutter 2 Plus (1–2), Vater 2 Plus (3–4)
- **Erwartung:** Prüfen, ob Plus->Basis bei maxMoney echte Mehrsumme liefert

### E) Konstellation mit möglichem Partnerbonus

**E1:** Beide 2000€, beide haben überlappende Plus-Monate (1–2)
- **Erwartung:** partnerBonus sollte Partnerbonus-Monate ermöglichen

### F) longerDuration

**F1:** Mutter 2000€, 2 Basis (1–2), Vater 0
- **Erwartung:** Basis->Plus kann Bezugsdauer verlängern (wenn freie Monate vorhanden)

---

## Auswertung pro Testfall (Testergebnis)

| Fall | Ausgangssumme | Ziel | Rohkandidaten | Verbesserte | Top-Delta | improvedByShift | improvedByPlusToBasis |
|------|---------------|------|----------------|-------------|-----------|-----------------|------------------------|
| A1 | 6.500 € | maxMoney | 0 | 0 | – | 0 | 0 |
| B1 | 1.608 € | maxMoney | 3 | 3 | +1.992 € | 3 | 0 |
| B2 | 1.608 € | maxMoney | 3 | 3 | +1.992 € | 3 | 0 |
| C1 | 7.200 € | maxMoney | 0 | 0 | – | 0 | 0 |
| D1 | 2.600 € | maxMoney | 10 | 10 | +1.300 € | 0 | 10 |
| E1 | 1.952 € | partnerBonus | 1 | 1 | +2 Partnerbonus-Monate | – | – |
| F1 | 2.600 € | longerDuration | 3 | 0 | – | – | – |

---

## Erkenntnisse

1. **maxMoney bei ähnlichen Einkommen (A1):** Keine Verbesserung – korrekt.
2. **maxMoney bei unterschiedlichen Einkommen (B1, B2):** Shifts liefern deutliche Verbesserungen (+1.992 €).
3. **maxMoney bei gut verteiltem Plan (C1):** Keine Verbesserung – korrekt.
4. **Plus->Basis bei maxMoney (D1):** Liefert echte Verbesserungen – alle 10 verbesserten Kandidaten stammen von Plus->Basis, Top-Delta +1.300 €.
5. **partnerBonus (E1):** Findet 1 Kandidaten mit 2 zusätzlichen Partnerbonus-Monaten.
6. **longerDuration (F1):** Keine Verbesserung – Basis->Plus verlängert hier die Dauer nicht (keine freien Monate für Streckung).
