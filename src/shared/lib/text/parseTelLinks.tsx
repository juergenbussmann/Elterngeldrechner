import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Converts link patterns in knowledge content into clickable links.
 *
 * Supported formats:
 * 1) Tel: [Text](tel:01601749534) or (Text)(tel:01601749534) or tel:01601749534
 * 2) Internal: [Anchor-Text](/path) – z.B. [Grundlagen zum Stillen](/phase/breastfeeding)
 *
 * Security: Only /phase/* and /knowledge/* paths allowed for internal links.
 */
const TARGET_TEL = 'tel:01601749534';
const DISPLAY_TEXT = 'Jacqueline Tinz: 01601749534';

type LinkMatch =
  | { start: number; end: number; type: 'tel' }
  | { start: number; end: number; type: 'internal'; anchor: string; path: string };

function findAllMatches(text: string): LinkMatch[] {
  const matches: LinkMatch[] = [];

  // Tel patterns (existing)
  const telPattern = new RegExp(
    String.raw`\[[^\]]*\]\(${TARGET_TEL}\)|\([^\)]*\)\(${TARGET_TEL}\)|${TARGET_TEL}`,
    'g',
  );
  for (const m of text.matchAll(telPattern)) {
    const idx = m.index ?? -1;
    if (idx >= 0) matches.push({ start: idx, end: idx + m[0].length, type: 'tel' });
  }

  // Internal links: [Anchor](/path) – nur /phase/ und /knowledge/
  const internalPattern = /\[([^\]]+)\]\((\/(?:phase|knowledge)\/[^)]*)\)/g;
  for (const m of text.matchAll(internalPattern)) {
    const idx = m.index ?? -1;
    if (idx >= 0) {
      const path = m[2];
      if (path.startsWith('/phase/') || path.startsWith('/knowledge/')) {
        matches.push({
          start: idx,
          end: idx + m[0].length,
          type: 'internal',
          anchor: m[1],
          path,
        });
      }
    }
  }

  return matches.sort((a, b) => a.start - b.start).filter((m, i, arr) => m.start >= (arr[i - 1]?.end ?? 0));
}

export const parseTelLinks = (text: string): React.ReactNode[] => {
  if (!text) return [''];
  const matches = findAllMatches(text);
  if (matches.length === 0) return [text];

  const nodes: React.ReactNode[] = [];
  let cursor = 0;
  let key = 0;

  for (const match of matches) {
    if (match.start > cursor) {
      nodes.push(text.slice(cursor, match.start));
    }
    if (match.type === 'tel') {
      nodes.push(
        <a
          key={`link-${key++}`}
          href={TARGET_TEL}
          className="tel-link"
          onClick={(e) => e.stopPropagation()}
        >
          {DISPLAY_TEXT}
        </a>,
      );
    } else {
      nodes.push(
        <Link
          key={`link-${key++}`}
          to={match.path}
          className="content-internal-link"
          onClick={(e) => e.stopPropagation()}
        >
          {match.anchor}
        </Link>,
      );
    }
    cursor = match.end;
  }
  if (cursor < text.length) nodes.push(text.slice(cursor));
  return nodes;
};
