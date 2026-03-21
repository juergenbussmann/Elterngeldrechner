# Elterngeld-Berechnung – MVP-Grenzen und Annahmen

## Übersicht

Die Elterngeld-Berechnung ist eine **unverbindliche Schätzung** zur Orientierung. Sie ersetzt keine amtliche Prüfung.

## Bewusst vereinfachte Annahmen (MVP)

### Ersatzrate
- Vereinfachte Staffelung: unter 1000 € ansteigend bis 100 %, 1000–1200 € ≈ 67 %, 1200–1240 € ≈ 66 %, darüber 65 %
- **TODO:** Offizielle Berechnung nutzt komplexere Staffelung und Steuerfreibeträge

### Geschwisterbonus
- 10 % des Betrags, mindestens 75 € – korrekt umgesetzt

### Mehrlingszuschlag
- +300 € pro zusätzlichem Kind – korrekt umgesetzt

### Mutterschutz
- Strukturell vorbereitet (`hasMaternityBenefit` im Datenmodell)
- **TODO:** Noch nicht in der Berechnung berücksichtigt

### Selbstständigkeit / Misch-Einkünfte
- `employmentType` im Modell vorbereitet
- **TODO:** Keine spezielle Logik für Selbstständige

### Partnerschaftsbonus
- MVP-Regeln: beide 24–32 h/Woche, 2–4 zusammenhängende Monate
- **TODO:** Weitere amtliche Bedingungen prüfen

### Steuerliche Netto-Berechnung
- **NICHT** umgesetzt: Elterngeld ist steuerfrei, aber Progressionsvorbehalt wird nicht berücksichtigt

### Einkommensgrenze (zvE)
- **Paare:** 175.000 € zu versteuerndes Einkommen (Jahreswert) – einzige harte Entscheidungsgrundlage
- **Alleinerziehende:** 150.000 € zvE (Jahreswert)
- Monatswerte (≈ 14.583 € / 12.500 €) nur als Orientierung, nicht als harte Grenze
- Schätzung: `monthlyIncome × 12` aus Monatsangaben; keine Berechnung bei Überschreitung

## Nächste Ausbauschritte

1. Mutterschutz in die Monatsberechnung integrieren
2. Selbstständigenlogik ergänzen (falls Bedarf)
3. Ersatzraten-Staffelung an offizielle Vorgaben anpassen
4. Optional: Datenübernahme aus Elterngeld-Vorbereitung
