/**
 * Zentrale Registry für Themen-Reihenfolge je Rubrik (Schwangerschaft, Geburt, Stillen).
 * Wird für den "Weiter"-Button auf Themen-Detailseiten genutzt.
 */

import contentIndex from '../modules/knowledge/content/de/index.json';
import { enrichKnowledgeItems } from '../utils/search';
import { getPhaseTopics } from '../utils/search/getPhaseTopics';
import type { Topic } from '../utils/search/getPhaseTopics';

type KnowledgeIndex = { items: Topic[] };
const { items } = contentIndex as KnowledgeIndex;
const enrichedItems = enrichKnowledgeItems(items);

const pregnancyTopics = getPhaseTopics(enrichedItems, 'pregnancy');
const birthTopics = getPhaseTopics(enrichedItems, 'birth');
const breastfeedingTopics = getPhaseTopics(enrichedItems, 'breastfeeding');

export type RubrikKey = 'pregnancy' | 'birth' | 'breastfeeding';

export const topicsRegistry: Record<
  RubrikKey,
  { basePath: string; topics: { id: string; title: string }[] }
> = {
  pregnancy: {
    basePath: '/phase/pregnancy',
    topics: pregnancyTopics.map((t) => ({ id: t.id, title: t.title })),
  },
  birth: {
    basePath: '/phase/birth',
    topics: birthTopics.map((t) => ({ id: t.id, title: t.title })),
  },
  breastfeeding: {
    basePath: '/phase/breastfeeding',
    topics: breastfeedingTopics.map((t) => ({ id: t.id, title: t.title })),
  },
};

/** Ermittelt die Rubrik eines Themas anhand seiner ID. */
export function getRubrikByTopicId(topicId: string): RubrikKey | null {
  for (const rubrik of Object.keys(topicsRegistry) as RubrikKey[]) {
    const cfg = topicsRegistry[rubrik];
    if (cfg.topics.some((t) => t.id === topicId)) {
      return rubrik;
    }
  }
  return null;
}
