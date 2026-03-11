/* eslint-disable react-refresh/only-export-components */
import { useMemo, useState, type FormEvent } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import type { PwaFactoryModule } from '../../core/contracts/moduleContract';
import { useI18n } from '../../shared/lib/i18n';
import { useNavigation } from '../../shared/lib/navigation/useNavigation';
import { parseTelLinks } from '../../shared/lib/text/parseTelLinks';
import { Button } from '../../shared/ui/Button';
import { enrichKnowledgeItems, getPhaseTopics, type Phase } from '../../utils/search';
import { SectionHeader } from '../../shared/ui/SectionHeader';
import { Card } from '../../shared/ui/Card';
import { NextStepsSection } from '../../components/NextStepsSection';
import { PlusSection } from '../../core/begleitungPlus/ui/PlusSection';
import contentIndex from './content/de/index.json';
import {
  searchKnowledgeQuestion,
  type SearchResult,
  type KnowledgeIndexItem,
} from './search/questionSearch';
import {
  useDocumentHead,
  hasFaqContent,
  extractFaqFromContent,
  buildFaqJsonLd,
} from '../../shared/lib/seo';
import { getKnowledgeSeo, buildCanonicalUrl } from '../../shared/lib/seo/seoConfig';

type KnowledgeCategory = {
  id: string;
  title: string;
  summary: string;
};

type KnowledgeContentSection = {
  heading: string;
  body: string;
  bullets?: string[];
  image?: string;
};

type KnowledgeContent = {
  title: string;
  intro: string;
  topImage?: string;
  sections: KnowledgeContentSection[];
  warnings?: string[];
  whenToSeekHelp?: string;
};

type KnowledgeIndex = {
  categories: KnowledgeCategory[];
  items: KnowledgeIndexItem[];
};

const contentModules = import.meta.glob('./content/de/**/*.json', {
  eager: true,
}) as Record<string, { default: KnowledgeContent | KnowledgeIndex }>;

const contentByFile = Object.fromEntries(
  Object.entries(contentModules)
    .filter(([path]) => path !== './content/de/index.json')
    .map(([path, module]) => [path.replace('./content/de/', ''), module.default as KnowledgeContent])
);

const { categories, items } = contentIndex as KnowledgeIndex;
const enrichedItems = enrichKnowledgeItems(items);

const normalizeText = (value: string) =>
  value
    .replace(/\s+/g, ' ')
    .replace(/\u00a0/g, ' ')
    .trim()
    .toLowerCase();

const isDuplicateText = (a?: string, b?: string) => {
  if (!a || !b) return false;
  const na = normalizeText(a);
  const nb = normalizeText(b);
  if (!na || !nb) return false;
  return na === nb || na.startsWith(nb) || nb.startsWith(na);
};

const KNOWLEDGE_LIST_SEO = {
  title: 'Wissensartikel – Themen rund ums Stillen',
  description:
    'Stillartikel zu Anlegen, Stillproblemen, Milchbildung, Ernährung und Abstillen. Fachlich fundiert und verständlich.',
};

const KnowledgeScreen: React.FC = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { navigateToTopic } = useNavigation();
  const { topicId } = useParams<{ topicId?: string }>();
  const location = useLocation();

  const topic = topicId ? items.find((item) => item.id === topicId) ?? null : null;
  const headSeo = useMemo(() => {
    if (topic) {
      const { seoTitle, seoDescription } = getKnowledgeSeo(topic);
      const content = contentByFile[topic.contentFile] as KnowledgeContent | undefined;
      let jsonLd: object | null = null;
      if (content && hasFaqContent(content, topic.title)) {
        const faqItems = extractFaqFromContent(content, topic.title);
        jsonLd = buildFaqJsonLd(faqItems);
      }
      return {
        title: seoTitle,
        description: seoDescription,
        canonicalUrl: buildCanonicalUrl(`/knowledge/${topic.id}`),
        jsonLd,
      };
    }
    if (topicId && !topic) {
      return {
        title: 'Seite nicht gefunden',
        description: 'Der angeforderte Artikel konnte nicht gefunden werden.',
        canonicalUrl: undefined,
      };
    }
    return {
      title: KNOWLEDGE_LIST_SEO.title,
      description: KNOWLEDGE_LIST_SEO.description,
      canonicalUrl: buildCanonicalUrl('/knowledge'),
    };
  }, [topic, topicId]);
  useDocumentHead(headSeo);
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const imagePreferenceKey = 'pref.showKnowledgeImages';
  const [showImages, setShowImages] = useState(() => {
    if (typeof window === 'undefined') {
      return true;
    }
    try {
      const stored = localStorage.getItem(imagePreferenceKey);
      if (stored === null) {
        return true;
      }
      return stored === 'true';
    } catch {
      return true;
    }
  });

  const toggleImages = () => {
    setShowImages((previous) => {
      const nextValue = !previous;
      try {
        localStorage.setItem(imagePreferenceKey, String(nextValue));
      } catch {
        // Ignore storage errors to keep content accessible.
      }
      return nextValue;
    });
  };

  if (topicId) {
    const content = topic ? contentByFile[topic.contentFile] : undefined;

    const state = (location.state ?? null) as { from?: string } | null;
    const fromPath = state?.from ?? '/knowledge';

    const derivePhase = (categoryId: string): Phase => {
      if (categoryId === 'pregnancy') return 'pregnancy';
      if (categoryId === 'birth') return 'birth';
      return 'breastfeeding';
    };

    const phase = topic ? derivePhase(topic.categoryId) : 'breastfeeding';
    const phaseTopics = getPhaseTopics(enrichedItems, phase);
    const currentIndex = topic ? phaseTopics.findIndex((t) => t.id === topic.id) : -1;
    const nextTopic =
      currentIndex >= 0 && currentIndex < phaseTopics.length - 1
        ? phaseTopics[currentIndex + 1]
        : null;

    const overviewPath =
      phase === 'pregnancy' ? '/phase/pregnancy' : phase === 'birth' ? '/phase/birth' : '/phase/breastfeeding';
    const nextLabel = nextTopic
      ? t('knowledge.nextTopic.buttonWithTitle').replace('{{title}}', nextTopic.title ?? '')
      : t('knowledge.nextTopic.backToOverview');

    const hasImages = Boolean(
      content?.topImage || content?.sections?.some((section) => Boolean(section.image)),
    );

    if (!topic || !content) {
      return (
        <div className="screen-placeholder">
          <SectionHeader as="h1" title={t('home.sections.knowledge.title')} />
          <p>{t('common.notFound')}</p>
        </div>
      );
    }

    return (
      <div className="screen-placeholder">
        <SectionHeader as="h1" title={topic.title} />
        {(() => {
          const hasIntro = Boolean(content.intro);
          const hasSummary = Boolean(topic.summary);

          if (hasIntro) {
            return (
              <>
                {!isDuplicateText(topic.summary, content.intro) && hasSummary && (
                  <p>{parseTelLinks(topic.summary)}</p>
                )}
                <p>{parseTelLinks(content.intro!)}</p>
              </>
            );
          }

          if (!hasIntro && hasSummary) {
            return <p>{parseTelLinks(topic.summary!)}</p>;
          }

          return null;
        })()}
        {hasImages && (
          <Button type="button" variant="ghost" onClick={toggleImages}>
            {showImages ? 'Bilder ausblenden' : 'Bilder anzeigen'}
          </Button>
        )}
        {showImages && content.topImage && (
          <img
            src={content.topImage}
            alt={content.title}
            style={{ width: '100%', borderRadius: '0.75rem', margin: '1rem 0' }}
          />
        )}
        {content.sections.length > 0 && (
          <div key={`${topic.id}-section-0`} style={{ marginTop: '1rem' }}>
            <h3>{content.sections[0].heading}</h3>
            <p>{parseTelLinks(content.sections[0].body)}</p>
            {showImages && content.sections[0].image && (
              <img
                src={content.sections[0].image}
                alt={content.sections[0].heading}
                style={{ width: '100%', borderRadius: '0.75rem', marginTop: '0.75rem' }}
              />
            )}
            {content.sections[0].bullets && content.sections[0].bullets.length > 0 && (
              <ul>
                {content.sections[0].bullets.map((bullet) => (
                  <li key={`${topic.id}-${content.sections[0].heading}-${bullet}`}>
                    {parseTelLinks(bullet)}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        {content.sections.length > 1 && (
          <PlusSection title={t('plusSection.title')} teaser={t('plusSection.teaser')}>
            {content.sections.slice(1).map((section) => (
              <div key={`${topic.id}-${section.heading}`} style={{ marginTop: '1rem' }}>
                <h3>{section.heading}</h3>
                <p>{parseTelLinks(section.body)}</p>
                {showImages && section.image && (
                  <img
                    src={section.image}
                    alt={section.heading}
                    style={{ width: '100%', borderRadius: '0.75rem', marginTop: '0.75rem' }}
                  />
                )}
                {section.bullets && section.bullets.length > 0 && (
                  <ul>
                    {section.bullets.map((bullet) => (
                      <li key={`${topic.id}-${section.heading}-${bullet}`}>
                        {parseTelLinks(bullet)}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </PlusSection>
        )}
        {content.warnings?.map((warning) => (
          <p key={`${topic.id}-${warning}`}>{parseTelLinks(warning)}</p>
        ))}
        {content.whenToSeekHelp && <p>{parseTelLinks(content.whenToSeekHelp)}</p>}
        <div style={{ marginTop: '1rem' }}>
          <Button
            variant="primary"
            fullWidth
            onClick={() => {
              if (nextTopic) {
                navigateToTopic(nextTopic.id, fromPath);
              } else {
                navigate(overviewPath);
              }
            }}
          >
            {nextLabel}
          </Button>
        </div>
        <NextStepsSection
          variant="plain"
          title={t('knowledge.nextSteps.title')}
          items={[
            { label: t('knowledge.nextSteps.appointment'), to: '/appointments' },
            { label: t('knowledge.nextSteps.contact'), to: '/contacts' },
            { label: t('knowledge.nextSteps.note'), to: '/notes' },
          ]}
        />
      </div>
    );
  }

  const categoriesWithItems = categories
    .map((category) => ({
      category,
      items: items.filter((item) => item.categoryId === category.id),
    }))
    .filter((entry) => entry.items.length > 0);

  const itemById = new Map(items.map((item) => [item.id, item]));
  const minScore = 6;
  const hasValidResults = results.length > 0 && results[0].score >= minScore;
  const filteredResults = hasValidResults
    ? results.filter((result) => {
        if (!selectedCategoryId) {
          return true;
        }
        const item = itemById.get(result.itemId);
        return item?.categoryId === selectedCategoryId;
      })
    : [];

  const categoryCounts = hasValidResults
    ? results.reduce<Record<string, number>>((acc, result) => {
        const item = itemById.get(result.itemId);
        if (!item) {
          return acc;
        }
        acc[item.categoryId] = (acc[item.categoryId] || 0) + 1;
        return acc;
      }, {})
    : {};

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setHasSearched(true);
      setResults([]);
      setSelectedCategoryId(null);
      return;
    }
    const nextResults = searchKnowledgeQuestion(trimmed, items);
    setResults(nextResults);
    setHasSearched(true);
    setSelectedCategoryId(null);
  };

  return (
    <div className="screen-placeholder">
      <SectionHeader as="h1" title={t('home.sections.knowledge.title')} />
      <Card style={{ marginBottom: '1.5rem' }}>
        <form onSubmit={handleSearchSubmit}>
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={t('knowledge.search.placeholder')}
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '0.75rem',
              border: '1px solid #d7dce3',
              marginBottom: '0.75rem',
            }}
          />
          <Button type="submit" fullWidth>
            {t('knowledge.search.submit')}
          </Button>
        </form>
      </Card>
      {hasSearched && searchQuery.trim() && !hasValidResults && (
        <Card style={{ marginBottom: '1.5rem' }}>
          <p style={{ margin: 0 }}>{t('knowledge.search.noResults')}</p>
        </Card>
      )}
      {hasValidResults && (
        <Card style={{ marginBottom: '1.5rem' }}>
          <h2>{t('knowledge.search.bestMatches')}</h2>
          {filteredResults.map((result) => {
            const item = itemById.get(result.itemId);
            if (!item) {
              return null;
            }
            const reasons = result.reasons.slice(0, 2);
            return (
              <Button
                key={item.id}
                type="button"
                variant="ghost"
                fullWidth
                style={{ marginTop: '0.75rem', textAlign: 'left' }}
                onClick={() => navigateToTopic(item.id, location.pathname)}
              >
                <div>
                  <h3 style={{ margin: 0 }}>{item.title}</h3>
                  <p style={{ margin: '0.35rem 0 0' }}>{item.summary}</p>
                  {reasons.length > 0 && (
                    <p style={{ margin: '0.35rem 0 0', fontSize: '0.85rem', opacity: 0.8 }}>
                      {t('knowledge.search.reasonPrefix')} {reasons.join(', ')}
                    </p>
                  )}
                </div>
              </Button>
            );
          })}
        </Card>
      )}
      {hasValidResults && Object.keys(categoryCounts).length > 0 && (
        <Card style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ marginTop: 0 }}>{t('knowledge.search.filterByCategory')}</h3>
          {Object.entries(categoryCounts).map(([categoryId, count]) => {
            const category = categories.find((entry) => entry.id === categoryId);
            if (!category) {
              return null;
            }
            const active = selectedCategoryId === categoryId;
            return (
              <Button
                key={categoryId}
                type="button"
                variant="ghost"
                style={{
                  marginRight: '0.5rem',
                  marginBottom: '0.5rem',
                  border: active ? '1px solid #3b5bfd' : '1px solid #d7dce3',
                }}
                onClick={() => setSelectedCategoryId(active ? null : categoryId)}
              >
                {category.title} ({count})
              </Button>
            );
          })}
        </Card>
      )}
      {categoriesWithItems.map(({ category, items: categoryItems }) => (
        <Card key={category.id} style={{ marginBottom: '1.5rem' }}>
          <h2>{category.title}</h2>
          <p>{category.summary}</p>
          {categoryItems.map((item) => (
            <Button
              key={item.id}
              type="button"
              variant="ghost"
              fullWidth
              style={{ marginTop: '0.75rem', textAlign: 'left' }}
              onClick={() => navigateToTopic(item.id, location.pathname)}
            >
              <div>
                <h3 style={{ margin: 0 }}>{item.title}</h3>
                <p style={{ margin: '0.35rem 0 0' }}>{item.summary}</p>
              </div>
            </Button>
          ))}
        </Card>
      ))}
    </div>
  );
};

export const KnowledgeModule: PwaFactoryModule = {
  id: 'std.knowledge',
  displayName: 'knowledge',
  getRoutes: () => [
    {
      path: '/knowledge',
      element: <KnowledgeScreen />,
    },
    {
      path: '/knowledge/:topicId',
      element: <KnowledgeScreen />,
    },
  ],
};

