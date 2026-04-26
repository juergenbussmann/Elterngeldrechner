import { useEffect } from 'react';

const DEFAULT_TITLE = 'Elterngeldrechner';
const MAX_TITLE_LENGTH = 60;
const MAX_DESCRIPTION_LENGTH = 155;

/**
 * Truncates text to maxLength at word boundary.
 * Avoids cutting words mid-way.
 */
function truncateAtWord(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  const truncated = text.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  if (lastSpace <= maxLength * 0.7) return truncated.trim();
  return truncated.slice(0, lastSpace).trim();
}

export type DocumentHeadOptions = {
  title: string;
  description: string;
  canonicalUrl?: string;
  /** Optional JSON-LD schema(s). Single object or array. Injected as script(s) type="application/ld+json". No duplicates. */
  jsonLd?: object | object[] | null;
};

/**
 * Sets document head (title, meta description, canonical, Open Graph).
 * Runs on mount and updates; restores defaults on unmount.
 * Max 60 chars title, max 155 chars description (SEO best practice).
 */
export function useDocumentHead(options: DocumentHeadOptions): void {
  const { title, description, canonicalUrl, jsonLd } = options;

  const safeTitle = truncateAtWord(title, MAX_TITLE_LENGTH);
  const safeDescription = truncateAtWord(description, MAX_DESCRIPTION_LENGTH);

  useEffect(() => {
    const prevTitle = document.title;
    document.title = safeTitle;

    let metaDesc: HTMLMetaElement | null = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.name = 'description';
      document.head.appendChild(metaDesc);
    }
    const prevDesc = metaDesc.content;
    metaDesc.content = safeDescription;

    let linkCanonical: HTMLLinkElement | null = document.querySelector('link[rel="canonical"]');
    if (canonicalUrl) {
      if (!linkCanonical) {
        linkCanonical = document.createElement('link');
        linkCanonical.rel = 'canonical';
        document.head.appendChild(linkCanonical);
      }
      linkCanonical.href = canonicalUrl;
    } else if (linkCanonical) {
      linkCanonical.remove();
      linkCanonical = null;
    }

    const ogTitle = document.querySelector('meta[property="og:title"]');
    const ogDesc = document.querySelector('meta[property="og:description"]');
    const ogUrl = document.querySelector('meta[property="og:url"]');
    if (!ogTitle) {
      const meta = document.createElement('meta');
      meta.setAttribute('property', 'og:title');
      meta.content = safeTitle;
      document.head.appendChild(meta);
    } else {
      (ogTitle as HTMLMetaElement).content = safeTitle;
    }
    if (!ogDesc) {
      const meta = document.createElement('meta');
      meta.setAttribute('property', 'og:description');
      meta.content = safeDescription;
      document.head.appendChild(meta);
    } else {
      (ogDesc as HTMLMetaElement).content = safeDescription;
    }
    if (canonicalUrl) {
      if (!ogUrl) {
        const meta = document.createElement('meta');
        meta.setAttribute('property', 'og:url');
        meta.content = canonicalUrl;
        document.head.appendChild(meta);
      } else {
        (ogUrl as HTMLMetaElement).content = canonicalUrl;
      }
    } else if (ogUrl) {
      ogUrl.remove();
    }

    const jsonLdScripts: HTMLScriptElement[] = [];
    const schemas = jsonLd
      ? Array.isArray(jsonLd)
        ? jsonLd.filter((s): s is object => s != null && typeof s === 'object')
        : [jsonLd]
      : [];
    for (const schema of schemas) {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.textContent = JSON.stringify(schema);
      document.head.appendChild(script);
      jsonLdScripts.push(script);
    }

    return () => {
      document.title = prevTitle || DEFAULT_TITLE;
      metaDesc!.content = prevDesc;
      if (linkCanonical && canonicalUrl) {
        linkCanonical.remove();
      }
      for (const script of jsonLdScripts) {
        if (script.parentNode) script.remove();
      }
    };
  }, [safeTitle, safeDescription, canonicalUrl, jsonLd]);
}
