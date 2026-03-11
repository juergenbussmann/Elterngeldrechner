/**
 * Query-Normalisierung für robuste Suche.
 *
 * Schritte:
 * - trim + lowercase
 * - Unicode normalize (NFD) + diacritics entfernen (é -> e)
 * - Umlaute/ß ersetzen: ä->ae, ö->oe, ü->ue, ß->ss
 * - Satzzeichen entfernen (alles außer a-z, 0-9 und Leerzeichen)
 * - Mehrfachspaces zu einem Space reduzieren
 */
export function normalize(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // diacritics
    .replace(/ß/g, 'ss')
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/[^a-z0-9\s]/g, ' ') // punctuation -> space
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Deutsche Wortvarianten: Schmerz, Schmerzen, schmerzt, schmerzhaft -> Stamm "schmerz".
 * Gibt alle Suchvarianten zurück, damit z.B. "Schmerzen" auch "schmerzhaft" findet.
 */
const WORD_VARIANT_GROUPS: Record<string, string[]> = {
  schmerz: ['schmerz', 'schmerzen', 'schmerzt', 'schmerzhaft', 'schmerzhafte', 'schmerzende'],
  rueckenschmerz: ['rueckenschmerz', 'rueckenschmerzen', 'kreuzschmerz', 'kreuzschmerzen'],
  brustschmerz: ['brustschmerz', 'brustschmerzen', 'brustspannen', 'brustspannung', 'gespannt'],
  bauchschmerz: ['bauchschmerz', 'bauchschmerzen', 'bauchweh', 'bauch schmerz'],
  wehen: ['wehen', 'wehe', 'wehenschmerz'],
  wunde: ['wunde', 'wunden', 'wund'],
  entzuendung: ['entzuendung', 'entzuendungen', 'entzuendet'],
  milchstau: ['milchstau', 'milch staue'],
  stillen: ['stillen', 'stillt', 'still', 'gestillt'],
  anlegen: ['anlegen', 'angelegt', 'anlege', 'anlegen'],
};

/**
 * Normalisierte Query-Tokens um Wortvarianten erweitern.
 * Wenn z.B. "Schmerzen" im Query ist, werden auch "schmerzhaft", "schmerz" etc. ergänzt.
 */
export function expandWordVariants(tokens: string[]): string[] {
  const out = new Set<string>(tokens);
  for (const token of tokens) {
    if (token.length < 3) continue;
    for (const variants of Object.values(WORD_VARIANT_GROUPS)) {
      if (variants.some((v) => v === token || token.includes(v) || v.includes(token))) {
        variants.forEach((v) => out.add(v));
        break;
      }
    }
  }
  return Array.from(out);
}

/** Alias für Legacy-Aufrufer – nutzt die neue Normalisierung. */
export function normalizeQuery(query: string): string {
  return normalize(query);
}

/** Für Fuse-Index: Text für Fuzzy-Match vorbereiten. */
export function normalizeForSearch(text: string): string {
  return normalize(text);
}
