import type { Phase } from './getPhaseTopics';
import { pregnancySynonyms, birthSynonyms, breastfeedingSynonyms } from './synonyms';
import { getExpandedSearchTokens } from './searchWithScoring';
import { normalize } from './normalize';

/**
 * Query-Expansion: Normalisierung + Wortvarianten + Domain-Thesaurus + Legacy-Synonyme.
 * Gibt erweiterten Such-String zurück (für Fuse-Fallback oder Legacy-Aufrufer).
 */
export function expandQuery(query: string, phase: Phase): string {
  const tokens = getExpandedSearchTokens(query, phase);
  const expanded = new Set(tokens);

  const map =
    phase === 'pregnancy'
      ? pregnancySynonyms
      : phase === 'birth'
        ? birthSynonyms
        : phase === 'breastfeeding'
          ? breastfeedingSynonyms
          : {};
  const q = normalize(query);

  for (const [key, synonyms] of Object.entries(map)) {
    const keyN = normalize(key);
    const synN = synonyms.map((s) => normalize(s)).filter(Boolean);
    const hit = synN.some((s) => s && q.includes(s));
    if (hit) {
      expanded.add(keyN);
      synN.forEach((s) => expanded.add(s));
    }
  }

  return Array.from(expanded).join(' ');
}

