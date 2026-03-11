/**
 * Suchlogik mit Scoring: Titel > Tags > Synonyme > Body (Summary)
 * Fuzzy (Fuse) nur als Fallback bei fehlenden exakten Treffern.
 *
 * TECHNISCHE DOKUMENTATION
 * -------------------------
 * 1. Normalisierung (normalize.ts):
 *    - lowercasing, Umlaute/ß -> ae/oe/ue/ss
 *    - Wortvarianten: Schmerz/Schmerzen/schmerzhaft -> gemeinsame Stammformen
 *
 * 2. Domain-Thesaurus (data/thesaurus.de.json):
 *    - Flach: schwangerschaft/geburt/stillen -> topicKey (z.B. schmerzen) -> terms[]
 *    - Query "Schmerzen" expandiert zu brustschmerzen, brustspannen, bauchschmerzen etc.
 *
 * 3. Query-Expansion (getExpandedSearchTokens):
 *    - normalize() -> expandWordVariants() -> expandWithThesaurus()
 *
 * 4. Scoring (scoreTopic): Titel > Tags > Synonyme > Body > Fuzzy
 *    - Titel: 10, Tags: 6, Synonyme-Feld: 5, Thesaurus-Treffer in Summary: 4, Summary: 2
 *
 * 5. Fuzzy-Fallback:
 *    - Wenn kein Treffer >= MIN_SCORE_FOR_EXACT: Fuse.js mit erweiterter Query
 *    - threshold 0.35, Ergebnisse mit score <= 0.5 übernommen
 */

import type { Phase, Topic } from './getPhaseTopics';
import { normalize, expandWordVariants } from './normalize';
import thesaurusDe from '../../../data/thesaurus.de.json';
import type Fuse from 'fuse.js';

const SCORE_TITLE = 10;
const SCORE_TAGS = 6;
const SCORE_SYNONYME = 5;
const SCORE_SYNONYM = 4;
const SCORE_SUMMARY = 2;
const MIN_SCORE_FOR_EXACT = 1;
const FUZZY_THRESHOLD = 0.5;

/** Phase -> Thesaurus (topicKey -> terms[]) */
const PHASE_KEY: Record<Phase, string> = {
  pregnancy: 'schwangerschaft',
  birth: 'geburt',
  breastfeeding: 'stillen',
};

type ThesaurusData = Record<string, Record<string, string[]>>;
const thesaurus = thesaurusDe as ThesaurusData;

/**
 * Erweitert Query-Tokens um Domain-Thesaurus (flache Struktur: phase -> topic -> terms):
 * "Schmerzen" in Schwangerschaft -> brustschmerzen, brustspannen, bauchschmerzen etc.
 */
export function expandWithThesaurus(tokens: string[], phase: Phase): string[] {
  const out = new Set<string>(tokens);
  const phaseKey = PHASE_KEY[phase];
  const phaseData = thesaurus[phaseKey];
  if (!phaseData || typeof phaseData !== 'object') return Array.from(out);

  for (const token of tokens) {
    if (token.length < 2) continue;
    for (const [topicKey, terms] of Object.entries(phaseData)) {
      if (!Array.isArray(terms)) continue;
      const topicN = normalize(topicKey);
      const termsN = terms.map((s) => normalize(s)).filter(Boolean);
      const allTerms = [topicN, ...termsN];
      const hit =
        allTerms.some((t) => t === token || t.includes(token) || token.includes(t)) ||
        termsN.some((s) => s.includes(token));

      if (hit) {
        out.add(topicN);
        termsN.forEach((s) => out.add(s));
      }
    }
  }
  return Array.from(out);
}

/**
 * Vollständige Token-Expansion: Normalisierung + Wortvarianten + Thesaurus.
 */
export function getExpandedSearchTokens(query: string, phase: Phase): string[] {
  const q = normalize(query);
  if (!q) return [];
  let tokens = q.split(' ').filter((t) => t.length >= 2);
  tokens = expandWordVariants(tokens);
  tokens = expandWithThesaurus(tokens, phase);
  return Array.from(new Set(tokens));
}

/**
 * Gibt die gefundenen Tokens im Text zurück (für differenziertes Scoring).
 */
function getMatchingTokensInText(text: string, tokens: string[]): string[] {
  const t = normalize(text);
  return tokens.filter((tok) => tok.length >= 2 && t.includes(tok));
}

/** Bewertet ein Topic: Titel > Tags > Synonyme > Body > Fuzzy. */
function scoreTopic(
  topic: Topic,
  searchTokens: string[],
  isSynonymToken: (t: string) => boolean
): number {
  const titleN = normalize(topic.title);
  const tagsN = normalize((topic.tags ?? []).join(' '));
  const synonymeN = normalize((topic.synonyme ?? []).join(' '));
  const summaryN = normalize(topic.summary ?? '');

  const inTitle = getMatchingTokensInText(titleN, searchTokens);
  const inTags = getMatchingTokensInText(tagsN, searchTokens);
  const inSynonyme = getMatchingTokensInText(synonymeN, searchTokens);
  const inSummary = getMatchingTokensInText(summaryN, searchTokens);

  let score = 0;
  inTitle.forEach(() => {
    score += SCORE_TITLE;
  });
  inTags.forEach(() => {
    score += SCORE_TAGS;
  });
  inSynonyme.forEach(() => {
    score += SCORE_SYNONYME;
  });
  inSummary.forEach((t) => {
    score += isSynonymToken(t) ? SCORE_SYNONYM : SCORE_SUMMARY;
  });
  return score;
}

/**
 * Hauptsuchfunktion: Scoring-basierte Suche mit Fuzzy-Fallback.
 */
export function searchWithScoring(
  query: string,
  topics: Topic[],
  phase: Phase,
  fuse: Fuse<unknown>
): { item: Topic; score: number }[] {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) return [];

  const expandedTokens = getExpandedSearchTokens(trimmed, phase);
  const directQueryTokens = new Set(
    normalize(trimmed)
      .split(' ')
      .filter((t) => t.length >= 2)
  );
  const isSynonym = (t: string) => !directQueryTokens.has(t);

  const scored = topics.map((topic) => {
    const score = scoreTopic(topic, expandedTokens, isSynonym);
    return { item: topic, score };
  });

  const filtered = scored.filter((s) => s.score >= MIN_SCORE_FOR_EXACT);
  filtered.sort((a, b) => b.score - a.score);

  if (filtered.length > 0) {
    return filtered;
  }

  const expandedQuery = expandedTokens.join(' ');
  const fuseResults = fuse.search(expandedQuery) as { item: Topic; score?: number }[];
  return fuseResults
    .filter((r) => (r.score ?? 1) <= FUZZY_THRESHOLD)
    .map((r) => ({ item: r.item, score: 1 - (r.score ?? 0) }));
}
