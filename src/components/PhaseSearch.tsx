import React, { useMemo, useState, useEffect, useRef } from 'react';
import Fuse from 'fuse.js';
import { useLocation } from 'react-router-dom';
import { useNavigation } from '../shared/lib/navigation/useNavigation';
import { useI18n } from '../shared/lib/i18n';
import { type Phase, type Topic } from '../utils/search';
import { searchWithScoring } from '../utils/search/searchWithScoring';

const MAX_RESULTS = 6;
const SNIPPET_MAX_LEN = 120;

/** Kürzt Text auf eine Zeile für Snippet */
function getSnippet(item: Topic): string {
  const text = item.summary || '';
  const trimmed = text.trim();
  if (!trimmed) return '';
  if (trimmed.length <= SNIPPET_MAX_LEN) return trimmed;
  const cut = trimmed.slice(0, SNIPPET_MAX_LEN).trim();
  const lastSpace = cut.lastIndexOf(' ');
  const end = lastSpace > SNIPPET_MAX_LEN * 0.5 ? lastSpace : SNIPPET_MAX_LEN;
  return cut.slice(0, end) + '…';
}

/** Hebt Suchbegriffe im Text hervor (case-insensitive) */
function highlight(text: string, queryTokens: string[]): React.ReactNode {
  const terms = queryTokens.filter((t) => t.length > 1);
  if (terms.length === 0) return text;
  const escaped = terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const re = new RegExp(`(${escaped.join('|')})`, 'gi');
  const parts = text.split(re);
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <span key={i} className="phase-search__hl">
        {part}
      </span>
    ) : (
      part
    )
  );
}

type PhaseSearchProps = {
  phase: Phase;
  topics: Topic[];
};

export const PhaseSearch: React.FC<PhaseSearchProps> = ({ phase, topics }) => {
  const { t } = useI18n();
  const { navigateToTopic } = useNavigation();
  const location = useLocation();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const searchRef = useRef<HTMLFormElement>(null);

  const trimmedQuery = query.trim();
  const searchableTopics = useMemo(() => {
    return topics.map((t) => ({
      ...t,
      synonyme: t.synonyme ?? [],
      searchText: [t.title, t.summary, ...(t.tags ?? []), ...(t.synonyme ?? []), (t.searchTerms ?? []).join(' ')].join(' '),
    }));
  }, [topics]);

  const fuse = useMemo(
    () =>
      new Fuse(searchableTopics, {
        includeScore: true,
        threshold: 0.35,
        ignoreLocation: true,
        minMatchCharLength: 2,
        keys: [
          { name: 'title', weight: 0.40 },
          { name: 'tags', weight: 0.28 },
          { name: 'synonyme', weight: 0.22 },
          { name: 'summary', weight: 0.20 },
        ],
      }),
    [searchableTopics]
  );

  const suggestions = useMemo(() => {
    if (!trimmedQuery || trimmedQuery.length < 2) return [];

    const results = searchWithScoring(trimmedQuery, topics, phase, fuse);
    return results.slice(0, MAX_RESULTS).map((r) => ({
      id: r.item.id,
      title: r.item.title,
      summary: r.item.summary,
      item: r.item,
    }));
  }, [trimmedQuery, phase, topics, fuse]);

  const queryTerms = trimmedQuery
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => t.replace(/[.,!?;:]+$/, ''));

  // Escape Key Handler
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Click Outside Handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Auto-open when typing (if query >= 2 chars)
  useEffect(() => {
    if (trimmedQuery.length >= 2 && suggestions.length > 0) {
      setIsOpen(true);
    } else if (trimmedQuery.length === 0) {
      setIsOpen(false);
    }
  }, [trimmedQuery, suggestions.length]);

  const shouldShowResults = isOpen && trimmedQuery.length >= 2 && suggestions.length > 0;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (suggestions.length > 0) {
      navigateToTopic(suggestions[0].id, location.pathname);
      setIsOpen(false);
    }
  };

  const handleItemClick = (id: string) => {
    navigateToTopic(id, location.pathname);
    setIsOpen(false);
    setQuery('');
  };

  const placeholderKey =
    phase === 'pregnancy'
      ? 'phase.search.placeholder.pregnancy'
      : phase === 'birth'
        ? 'phase.search.placeholder.birth'
        : 'phase.search.placeholder.breastfeeding';

  return (
    <form
      ref={searchRef}
      className="home-screen__search phase-search"
      onSubmit={handleSubmit}
      role="search"
    >
      <div className="home-screen__search-input">
        <span className="home-screen__search-icon" aria-hidden="true">
          🔍
        </span>
        <input
          type="search"
          placeholder={t(placeholderKey)}
          aria-label={t(placeholderKey)}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
      {shouldShowResults && (
        <div className="phase-search__results" role="listbox" aria-label={t('home.search.suggestions.ariaLabel')}>
          {suggestions.map((suggestion) => {
            const snippet = getSnippet(suggestion.item);
            return (
              <button
                key={suggestion.id}
                type="button"
                role="option"
                className="phase-search__item"
                onClick={() => handleItemClick(suggestion.id)}
              >
                <div className="phase-search__title">
                  {highlight(suggestion.title, queryTerms)}
                </div>
                {snippet && (
                  <div className="phase-search__snippet">
                    {highlight(snippet, queryTerms)}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </form>
  );
};
