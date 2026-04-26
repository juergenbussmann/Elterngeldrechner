import React from 'react';
import { SectionHeader } from '../../../shared/ui/SectionHeader';
import { Button } from '../../../shared/ui/Button';
import { useI18n } from '../../../shared/lib/i18n';
import { useNavigation } from '../../../shared/lib/navigation/useNavigation';
import './DocumentsFamilyOverviewPage.css';
import '../../../styles/softpill-buttons-in-cards.css';
import '../../../styles/softpill-cards.css';

const ENTRY_OPTIONS = [
  {
    id: 'parental-leave',
    title: 'Elternzeit',
    description: 'Schreiben für den Arbeitgeber mit Fristen und PDF-Ausgabe',
    route: '/documents/parental-leave',
  },
  {
    id: 'elterngeld',
    title: 'Elterngeld – Vorbereitung',
    description: 'Antrag vorbereiten, Planung prüfen und Orientierung erhalten',
    route: '/documents/elterngeld',
  },
] as const;

export const DocumentsFamilyOverviewPage: React.FC = () => {
  const { t } = useI18n();
  const { goTo } = useNavigation();

  return (
    <div className="screen-placeholder documents-family-screen">
      <section className="next-steps next-steps--plain documents-family__section">
        <SectionHeader as="h1" title={t('documents.family.sectionHeading')} />
        <div className="documents-family__entries">
          {ENTRY_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              className="documents-family__entry documents-family__entry--card"
              onClick={() => goTo(opt.route)}
            >
              <span className="documents-family__entry-title">{opt.title}</span>
              <span className="documents-family__entry-desc">{opt.description}</span>
            </button>
          ))}
        </div>
        <div className="documents-family__footer">
          <Button
            type="button"
            variant="secondary"
            className="next-steps__button btn--softpill"
            onClick={() => goTo('/documents/list')}
          >
            Meine Dokumente
          </Button>
        </div>
      </section>
    </div>
  );
};
