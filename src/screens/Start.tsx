/**
 * STARTSEITE – geschützter Bereich
 * Ein Einstieg zum Elterngeld-Wizard (screen-placeholder, Hero, bestehende Tokens).
 */
import React from 'react';
import { Button } from '../shared/ui/Button';
import { useNavigation } from '../shared/lib/navigation/useNavigation';
import { useDocumentHead, buildCanonicalUrl } from '../shared/lib/seo';

const START_BENEFITS = [
  'schnell berechnen',
  'Monate planen',
  'Bonus prüfen',
  'Antrag vorbereiten',
] as const;

/** Gleiche Route wie in DocumentsFamilyOverviewPage (Elternzeit / ParentLeaveFormPage). */
const PARENTAL_LEAVE_DOCUMENTS_ROUTE = '/documents/parental-leave';

export function Start() {
  const { goTo } = useNavigation();

  useDocumentHead({
    title: 'Stillberatung – Wissen rund ums Stillen',
    description:
      'Fachlich fundierte Informationen rund ums Stillen: Stillstart, Stillprobleme, Milchmenge und Abstillen.',
    canonicalUrl: buildCanonicalUrl('/'),
  });

  return (
    <div className="home-screen screen-placeholder home-start">
      <section className="start-hero" aria-labelledby="home-start-title">
        <div className="start-hero__content">
          <h1 id="home-start-title" className="start-hero__title">
            Elterngeld planen
          </h1>
          <p className="start-hero__subline">
            In wenigen Minuten zu deiner Orientierung und deinem Plan
          </p>
          <Button
            type="button"
            variant="primary"
            fullWidth
            className="start-hero__cta"
            onClick={() => goTo('/documents/elterngeld')}
          >
            Jetzt planen
          </Button>
          <ul className="start-hero__benefits" aria-label="Vorteile">
            {START_BENEFITS.map((line) => (
              <li key={line}>
                <span className="start-hero__benefit-icon" aria-hidden>
                  ✓
                </span>
                {line}
              </li>
            ))}
          </ul>

          <div className="start-hero__elternzeit" aria-labelledby="home-start-elternzeit-title">
            <h2 id="home-start-elternzeit-title" className="start-hero__section-title">
              Elternzeit
            </h2>
            <p className="start-hero__subline">
              Bereite hier deinen Antrag auf Elternzeit vor und erstelle die wichtigsten Angaben für deinen
              Arbeitgeber.
            </p>
            <Button
              type="button"
              variant="primary"
              fullWidth
              className="start-hero__cta"
              onClick={() => goTo(PARENTAL_LEAVE_DOCUMENTS_ROUTE)}
            >
              Elternzeit beantragen
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
