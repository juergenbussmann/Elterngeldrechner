import React from 'react';
import { SectionHeader } from '../../../shared/ui/SectionHeader';
import { Button } from '../../../shared/ui/Button';
import { Card } from '../../../shared/ui/Card';
import { useNavigation } from '../../../shared/lib/navigation/useNavigation';
import './DocumentsFamilyOverviewPage.css';
import '../../checklists/styles/softpill-buttons-in-cards.css';
import '../../checklists/styles/softpill-cards.css';

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
    description: 'Antrag vorbereiten, Unterlagen planen und Fristen im Blick behalten',
    route: '/documents/elterngeld',
  },
  {
    id: 'elterngeld-calculation',
    title: 'Elterngeld – Berechnung',
    description: 'Unverbindliche Schätzung: Monat für Monat planen und Beträge überschlagen',
    route: '/documents/elterngeld-calculation',
  },
] as const;

export const DocumentsFamilyOverviewPage: React.FC = () => {
  const { goTo } = useNavigation();

  return (
    <div className="screen-placeholder documents-family-screen">
      <section className="next-steps next-steps--plain documents-family__section">
        <SectionHeader as="h1" title="Anträge & Vorbereitung" />
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
