import React from 'react';
import { useNavigate } from 'react-router-dom';
import { topicsRegistry, getRubrikByTopicId } from '../data/topicsRegistry';
import { TopicCard } from './TopicCard';
import { useI18n } from '../shared/lib/i18n';

type NextTopicButtonProps = {
  currentTopicId: string;
};

/**
 * Zeigt einen "Weiter"-Button: Nächstes Thema in der Rubrik oder "Zurück zur Übersicht".
 * Nutzt die bestehende Topic-Card-Optik.
 */
export function NextTopicButton({ currentTopicId }: NextTopicButtonProps) {
  const navigate = useNavigate();
  const { t } = useI18n();
  const rubrik = getRubrikByTopicId(currentTopicId);
  if (!rubrik) return null;

  const cfg = topicsRegistry[rubrik];
  const idx = cfg.topics.findIndex((tpc) => tpc.id === currentTopicId);
  if (idx < 0) return null;

  const next = idx < cfg.topics.length - 1 ? cfg.topics[idx + 1] : null;
  const label = next ? `${t('knowledge.nextTopic.weiter')}${next.title}` : t('knowledge.nextTopic.backToOverview');
  const target = next ? `/knowledge/${next.id}` : cfg.basePath;

  return (
    <TopicCard
      title={label}
      onClick={() => navigate(target)}
      style={{ cursor: 'pointer', marginTop: '1rem' }}
    />
  );
}
