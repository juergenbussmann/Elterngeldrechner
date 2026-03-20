import contentIndex from '../content/de/index.json';
import { intentMap } from './intentMap';

export type SearchResult = {
  itemId: string;
  score: number;
  reasons: string[];
  matchedTerms: string[];
};

export type KnowledgeIndexItem = {
  id: string;
  categoryId: string;
  title: string;
  summary: string;
  tags: string[];
  readingTime: string;
  contentFile: string;
  /** Optional SEO override. Fallback: title (ohne Branding) */
  seoTitle?: string | null;
  /** Optional SEO override. Fallback: summary truncated to 155 chars */
  seoDescription?: string | null;
  /** Optional canonical URL override */
  canonicalUrl?: string | null;
};

type KnowledgeCategory = {
  id: string;
  title: string;
  summary: string;
};

type KnowledgeIndex = {
  categories: KnowledgeCategory[];
};

const STOPWORDS = new Set([
  'ich',
  'du',
  'und',
  'oder',
  'der',
  'die',
  'das',
  'ein',
  'eine',
  'bitte',
  'kann',
  'wie',
  'was',
  'warum',
  'ist',
  'sind',
  'habe',
  'mein',
  'meine',
  'beim',
]);

const QUESTION_WORDS = new Set([
  'wie',
  'was',
  'warum',
  'wieso',
  'weshalb',
  'kann',
  'darf',
  'soll',
  'wann',
  'wo',
  'wer',
  'welche',
  'welcher',
  'welches',
]);

const PROBLEM_TOKENS = [
  'schmerz',
  'schmerzen',
  'wunde',
  'problem',
  'hilfe',
  'stillstreik',
  'milchstau',
  'zu wenig',
  'unruhig',
  'schwierig',
  'klappt nicht',
  'nicht richtig',
  'verweigert',
  'verweigerung',
  'entzundung',
  'fieber',
  'spucken',
  'reflux',
  'uebergeben',
];

const { categories } = contentIndex as KnowledgeIndex;
const categoryById = Object.fromEntries(categories.map((category) => [category.id, category]));

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const unique = (values: string[]) => Array.from(new Set(values));

const normalizedIntentMap = Object.fromEntries(
  Object.entries(intentMap).map(([key, values]) => [
    normalizeText(key),
    values.map((value) => normalizeText(value)),
  ]),
);

const normalizedProblemTokens = PROBLEM_TOKENS.map((token) => normalizeText(token));

const buildTokens = (query: string) => {
  const normalized = normalizeText(query);
  const words = normalized.split(' ').filter(Boolean);
  const baseWords = words.filter((word) => !STOPWORDS.has(word));
  const bigrams = baseWords
    .map((word, index) => (index < baseWords.length - 1 ? `${word} ${baseWords[index + 1]}` : ''))
    .filter(Boolean);

  return { words, baseTokens: unique([...baseWords, ...bigrams]) };
};

const expandTokens = (baseTokens: string[]) => {
  const expanded = baseTokens.flatMap((token) => {
    const synonyms = normalizedIntentMap[token] ?? [];
    return synonyms.map((synonym) => ({ token: synonym, weight: 0.5, isSynonym: true }));
  });

  const baseEntries = baseTokens.map((token) => ({ token, weight: 1, isSynonym: false }));
  return [...baseEntries, ...expanded];
};

const isQuestionQuery = (rawQuery: string, words: string[]) =>
  rawQuery.includes('?') || words.some((word) => QUESTION_WORDS.has(word));

const hasProblemSignal = (text: string) =>
  normalizedProblemTokens.some((token) => text.includes(token));

export const searchKnowledgeQuestion = (
  query: string,
  items: KnowledgeIndexItem[],
): SearchResult[] => {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return [];
  }

  const { words, baseTokens } = buildTokens(trimmedQuery);
  if (baseTokens.length === 0) {
    return [];
  }

  const tokenEntries = expandTokens(baseTokens);
  const questionQuery = isQuestionQuery(trimmedQuery, words);

  const results = items
    .map((item) => {
      const normalizedTitle = normalizeText(item.title);
      const normalizedSummary = normalizeText(item.summary);
      const normalizedTags = normalizeText(item.tags.join(' '));
      const category = categoryById[item.categoryId];
      const normalizedCategory = category
        ? `${normalizeText(category.title)} ${normalizeText(category.summary)}`
        : '';
      const problemText = `${normalizedSummary} ${normalizedTags}`;

      let score = 0;
      const reasons: string[] = [];
      const matchedTerms: string[] = [];
      const matchedBaseTokens = new Set<string>();

      tokenEntries.forEach(({ token, weight, isSynonym }) => {
        if (!token) {
          return;
        }

        const inTitle = normalizedTitle.includes(token);
        const inTags = normalizedTags.includes(token);
        const inSummary = normalizedSummary.includes(token);
        const inCategory = normalizedCategory.includes(token);

        if (inTitle) {
          score += 10 * weight;
          if (!reasons.includes('Treffer im Titel')) {
            reasons.push('Treffer im Titel');
          }
        }

        if (inTags) {
          score += 6 * weight;
          if (!reasons.includes('Treffer in Tags')) {
            reasons.push('Treffer in Tags');
          }
        }

        if (inSummary) {
          score += 4 * weight;
          if (!reasons.includes('Treffer in Zusammenfassung')) {
            reasons.push('Treffer in Zusammenfassung');
          }
        }

        if (inCategory) {
          score += 2 * weight;
          if (!reasons.includes('Treffer in Rubrik')) {
            reasons.push('Treffer in Rubrik');
          }
        }

        if (inTitle || inTags || inSummary || inCategory) {
          matchedTerms.push(token);
          if (!isSynonym) {
            matchedBaseTokens.add(token);
          }
        }
      });

      if (matchedBaseTokens.size >= 3) {
        score += 8;
        reasons.push('Mehrere Treffer');
      }

      if (questionQuery && hasProblemSignal(problemText)) {
        score += 5;
        reasons.push('Problembezug');
      }

      return {
        itemId: item.id,
        score,
        reasons,
        matchedTerms: unique(matchedTerms),
      };
    })
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  return results;
};
