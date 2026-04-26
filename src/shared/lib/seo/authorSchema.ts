/**
 * schema.org Person und WebPage mit Autorenschaft.
 * Kein Review-Markup, keine Sternebewertungen.
 */

import { SEO_BASE_URL } from './seoConfig';

/** Person schema für Autorenschaft (App-Anbieter). */
export function buildPersonJsonLd(): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: 'Jürgen Bußmann',
    jobTitle: 'Entwickler',
    url: SEO_BASE_URL,
    sameAs: [SEO_BASE_URL],
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
      name: 'Jürgen Bußmann',
    },
  };
}
