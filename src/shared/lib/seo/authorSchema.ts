/**
 * schema.org Person und WebPage mit Autorenschaft.
 * Kein Review-Markup, keine Sternebewertungen.
 */

const AUTHOR_URL = 'https://www.stillberatung-jt.de';

/** Person schema für fachliche Autorenschaft */
export function buildPersonJsonLd(): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: 'Jacqueline Tinz',
    jobTitle: 'Stillberaterin',
    url: AUTHOR_URL,
    sameAs: [AUTHOR_URL],
  };
}

/** WebPage schema mit author-Verknüpfung zur Person */
export function buildWebPageWithAuthorJsonLd(
  pageName: string,
  pageUrl: string,
): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: pageName,
    url: pageUrl,
    author: {
      '@type': 'Person',
      name: 'Jacqueline Tinz',
    },
  };
}
