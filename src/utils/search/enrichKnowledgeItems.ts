/**
 * Anreicherung von Wissenseinträgen für die Suche:
 * - synonyme[] bleibt unverändert (aus index.json)
 * - searchTerms = auto-generiert aus title + tags + synonyme (normalisiert, dedupliziert)
 */

import type { Topic } from './getPhaseTopics';
import { normalize } from './normalize';

/** Generiert searchTerms aus title, tags, synonyme */
function buildSearchTerms(item: Topic): string[] {
  const parts = [
    item.title,
    ...(item.tags ?? []),
    ...(item.synonyme ?? []),
  ].filter(Boolean);
  const normalized = normalize(parts.join(' '));
  const tokens = normalized.split(/\s+/).filter((t) => t.length >= 2);
  return Array.from(new Set(tokens));
}

/**
 * Reichert Wissenseinträge um searchTerms an.
 * synonyme[] kommt aus den Rohdaten, searchTerms wird berechnet.
 */
export function enrichKnowledgeItems(items: Topic[]): Topic[] {
  return items.map((item) => ({
    ...item,
    synonyme: item.synonyme ?? [],
    searchTerms: buildSearchTerms({ ...item, synonyme: item.synonyme ?? [] }),
  }));
}
