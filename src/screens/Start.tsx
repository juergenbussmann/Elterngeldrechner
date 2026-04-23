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
        </div>
      </section>
    </div>
  );
}
