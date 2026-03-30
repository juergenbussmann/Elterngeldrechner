/**
 * Texte für Partnerschaftsbonus-Hinweise – ableitbar aus bestehenden Validierungsmeldungen
 * (partnerBonusValidation / calculationEngine), keine neue Fachlogik.
 */

/** Erkennt Warnungen, die sich auf den Partnerschaftsbonus beziehen (gleiche Textmuster wie in der Validierung). */
export function isPartnerschaftsbonusWarningMessage(w: string): boolean {
  if (w.includes('Partnerschaftsbonus') || w.includes('Partnerbonus')) return true;
  if (/^Monat \d+:/.test(w.trim()) && (w.includes('Elternteile') || w.includes('Wochenstunden'))) return true;
  return false;
}

/**
 * Kurzer Handlungsimpuls aus der ersten konkreten Validierungszeile (keine neuen Regeln).
 */
export function getPartnerschaftsbonusHandlungshinweis(primaryWarning: string): string {
  if (primaryWarning.includes('24–32') || primaryWarning.includes('Wochenstunden')) {
    return 'Passe die geplanten Wochenstunden je Elternteil an (24–32 Stunden in den Bonusmonaten).';
  }
  if (primaryWarning.includes('beide Elternteile im selben Monat')) {
    return 'Plane denselben Lebensmonat für beide mit ElterngeldPlus und Bezug „Beide“ inkl. Bonus.';
  }
  if (primaryWarning.includes('2–4 zusammenhängende')) {
    return 'Schaffe 2–4 direkt aufeinander folgende Monate, in denen beide den Bonus gemeinsam beziehen.';
  }
  return 'Nutze die Schaltflächen unten, um zulässige Korrekturen direkt zu übernehmen oder zum passenden Schritt zu springen.';
}

export const PARTNERSCHAFTSBONUS_KARTE_TITEL =
  'Der Partnerschaftsbonus ist in deinem Plan derzeit nicht erfüllt.';

export const PARTNERSCHAFTSBONUS_OVERLAY_AKTION = 'Bonus prüfen und anpassen';
