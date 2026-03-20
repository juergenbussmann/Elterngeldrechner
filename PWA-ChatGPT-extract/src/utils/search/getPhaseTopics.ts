/**
 * Phase-Filterung: Topics den Phasen Schwangerschaft, Geburt und Stillen zuordnen.
 * Explizite Zuordnung pro Phase – keine impliziten "sonst alle" Regeln.
 *
 * - pregnancy: categoryId === 'pregnancy'
 * - birth: categoryId === 'birth'
 * - breastfeeding: nur Kategorien aus der expliziten Liste (Legacy-Mapping,
 *   da im Datenmodell keine categoryId 'breastfeeding' existiert)
 */

export type Phase = 'pregnancy' | 'birth' | 'breastfeeding';

export type Topic = {
  id: string;
  categoryId: string;
  title: string;
  summary: string;
  tags: string[];
  /** Suchrelevante Synonyme (z.B. "brust tut weh", "ziehen in der brust") */
  synonyme?: string[];
  /** Auto-generiert: normalisierte Tokens aus title + tags + synonyme */
  searchTerms?: string[];
};

const PREGNANCY_CATEGORY = 'pregnancy';
const BIRTH_CATEGORY = 'birth';

/** Explizite Kategorien, die zur Stillzeit gehören (Legacy-Mapping). */
const BREASTFEEDING_CATEGORIES: ReadonlySet<string> = new Set([
  'breastfeeding', // falls künftig im Datenmodell vorhanden
  'latch',
  'nutrition',
  'challenges',
  'start',
  'supply_pumping',
  'weaning',
]);

export function getPhaseTopics(
  items: Topic[],
  phase: Phase
): Topic[] {
  switch (phase) {
    case 'pregnancy':
      return items.filter((item) => item.categoryId === PREGNANCY_CATEGORY);
    case 'birth':
      return items.filter((item) => item.categoryId === BIRTH_CATEGORY);
    case 'breastfeeding':
      return items.filter((item) => BREASTFEEDING_CATEGORIES.has(item.categoryId));
    default:
      return [];
  }
}
