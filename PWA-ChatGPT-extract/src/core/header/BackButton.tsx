import React from 'react';
import { useNavigation } from '../../shared/lib/navigation/useNavigation';
import { useI18n } from '../../shared/lib/i18n';
import { useLocation } from 'react-router-dom';

/**
 * BackButton – Glass-Style Back-Button für App-Shell Header
 * 
 * Design-Spezifikationen:
 * - 56x56px Touch-Area (Mobile First)
 * - Glassmorphism-Style mit .glass Klasse
 * - Chevron SVG Icon (stroke-width 2.5)
 * - Positioniert links im Header
 */
export const BackButton: React.FC = () => {
  const { goBack, goTo } = useNavigation();
  const { t } = useI18n();
  const location = useLocation();

  // Back-Button nur anzeigen, wenn nicht auf Home-Seite
  const isHome = location.pathname === '/';
  if (isHome) {
    return null;
  }

  const handleClick = () => {
    // Spezielle Behandlung für Knowledge-Detail-Seiten
    const isKnowledgeDetail = location.pathname.startsWith('/knowledge/');
    if (isKnowledgeDetail) {
      const state = location.state as { from?: string } | null | undefined;
      const from = state?.from;

      if (from?.startsWith('/phase/')) {
        goTo(from);
        return;
      }

      if (from === '/knowledge') {
        goTo('/knowledge');
        return;
      }
    }

    goBack();
  };

  return (
    <button
      type="button"
      className="app-shell__back-button glass"
      onClick={handleClick}
      aria-label={t('common.back')}
      title={t('common.back')}
    >
      <svg
        className="app-shell__back-button-icon"
        viewBox="0 0 24 24"
        role="img"
        aria-hidden="true"
      >
        <path d="M15 18l-6-6 6-6" />
      </svg>
    </button>
  );
};
