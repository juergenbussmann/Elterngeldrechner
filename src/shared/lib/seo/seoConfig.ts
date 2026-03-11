/**
 * Central SEO configuration for phase and knowledge pages.
 * Main pillar and sub-pillars have explicit definitions.
 * Fallback rules for knowledge items without seoTitle/seoDescription.
 */

const MAX_DESC_LENGTH = 155;

export type PhaseSeoConfig = {
  seoTitle: string;
  seoDescription: string;
};

const PHASE_SEO: Record<string, PhaseSeoConfig> = {
  breastfeeding: {
    seoTitle: 'Stillen – Anleitung, Stillprobleme & Tipps',
    seoDescription:
      'Umfassender Leitfaden rund ums Stillen: Stillstart, Stillprobleme, Milchmenge, Abstillen und mehr.',
  },
  pregnancy: {
    seoTitle: 'Schwangerschaft – Vorbereitung auf die Stillzeit',
    seoDescription:
      'Wissenswertes zur Vorbereitung aufs Stillen in der Schwangerschaft. Körper, Ernährung und mentale Vorbereitung.',
  },
  birth: {
    seoTitle: 'Geburt – stillfreundlicher Start',
    seoDescription:
      'Ruhe, Hautkontakt und stillfreundliche Entscheidungen bei der Geburt. Oxytocin und erster Stillstart.',
  },
};

export function getPhaseSeo(phaseId: string): PhaseSeoConfig | undefined {
  return PHASE_SEO[phaseId];
}

export type KnowledgeSeoInput = {
  title: string;
  summary: string;
  seoTitle?: string | null;
  seoDescription?: string | null;
};

/**
 * Resolves SEO metadata for a knowledge item.
 * Fallback: seoTitle = title (ohne Branding), seoDescription = summary (max 155 chars).
 */
export function getKnowledgeSeo(
  input: KnowledgeSeoInput,
): { seoTitle: string; seoDescription: string } {
  const title = input.seoTitle?.trim() || input.title;
  let desc = input.seoDescription?.trim();
  if (!desc) {
    desc = input.summary.trim().replace(/\s+/g, ' ');
  }
  if (desc.length > MAX_DESC_LENGTH) {
    const lastSpace = desc.lastIndexOf(' ', MAX_DESC_LENGTH);
    desc = lastSpace > MAX_DESC_LENGTH * 0.7 ? desc.slice(0, lastSpace) : desc.slice(0, MAX_DESC_LENGTH);
  }

  return { seoTitle: title, seoDescription: desc };
}

/** Production base URL for canonical and OG. Always use for SEO consistency. */
export const SEO_BASE_URL = 'https://www.stillberatung-jt.de';

/**
 * Builds canonical URL. Always uses production base URL for SEO consistency.
 */
export function buildCanonicalUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${SEO_BASE_URL}${normalized}`;
}
