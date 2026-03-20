/**
 * FAQ-Schema (JSON-LD) für Knowledge-Artikel.
 * Nutzt nur vorhandene Frage-Abschnitte (Überschriften mit ?) und Frage-Titel.
 */

export type KnowledgeContentSection = {
  heading: string;
  body: string;
  bullets?: string[];
};

export type KnowledgeContent = {
  title: string;
  intro: string;
  sections: KnowledgeContentSection[];
};

export type FaqItem = {
  question: string;
  answer: string;
};

const MAX_FAQ_PER_PAGE = 8;
const MIN_FAQ_PER_PAGE = 2;

/**
 * Entfernt Markdown-Links [Text](/path) und behält nur den Anzeigetext.
 * Keine HTML-Tags im Schema.
 */
function stripMarkdownForSchema(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\(\/[^)]+\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function isQuestion(text: string): boolean {
  return text.trim().endsWith('?');
}

/**
 * Extrahiert FAQ-Einträge aus Knowledge-Content.
 * - Artikel-Titel mit ? → Frage, Antwort = Intro + erste Sektion
 * - Sektions-Überschrift mit ? → Frage, Antwort = body
 * Max. 5–8 Fragen, nur echte Fragen.
 */
export function extractFaqFromContent(
  content: KnowledgeContent,
  _topicTitle: string,
): FaqItem[] {
  const items: FaqItem[] = [];
  const seen = new Set<string>();

  const addIfNew = (q: string, a: string) => {
    const key = q.toLowerCase().trim();
    if (seen.has(key) || !a.trim()) return;
    seen.add(key);
    items.push({ question: q, answer: stripMarkdownForSchema(a) });
  };

  // Artikel-Titel aus Content (Quelle der Frage), topicTitle nur für Anzeige
  const displayTitle = content.title;

  // 1. Artikel-Titel als Frage (wenn mit ?)
  if (isQuestion(displayTitle)) {
    const answerParts: string[] = [];
    if (content.intro) answerParts.push(content.intro);
    for (const s of content.sections) {
      if (s.body) answerParts.push(s.body);
      if (s.bullets?.length) answerParts.push(s.bullets.join('. '));
    }
    const answer = answerParts.join(' ');
    if (answer.trim()) addIfNew(displayTitle, answer);
  }

  // 2. Sektions-Überschriften als Fragen
  for (const section of content.sections) {
    if (items.length >= MAX_FAQ_PER_PAGE) break;
    if (!isQuestion(section.heading)) continue;

    let answer = section.body;
    if (section.bullets?.length) {
      answer += ' ' + section.bullets.join('. ');
    }
    addIfNew(section.heading, answer);
  }

  return items.slice(0, MAX_FAQ_PER_PAGE);
}

/**
 * Prüft, ob der Artikel FAQ-taugliche Inhalte hat.
 */
export function hasFaqContent(content: KnowledgeContent, _topicTitle?: string): boolean {
  if (isQuestion(content.title)) return true;
  return content.sections.some((s) => isQuestion(s.heading));
}

/**
 * Erzeugt FAQPage JSON-LD Schema.
 */
export function buildFaqJsonLd(items: FaqItem[]): object | null {
  if (items.length < MIN_FAQ_PER_PAGE) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map(({ question, answer }) => ({
      '@type': 'Question',
      name: question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: answer,
      },
    })),
  };
}
