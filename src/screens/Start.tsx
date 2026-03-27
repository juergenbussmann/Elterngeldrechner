/**
 * STARTSEITE – geschützter Bereich
 * Ein Einstieg zum Elterngeld-Wizard (screen-placeholder, ui-card, bestehende Stacks).
 */
import React from 'react';
import { Card } from '../shared/ui/Card';
import { Button } from '../shared/ui/Button';
import { SectionHeader } from '../shared/ui/SectionHeader';
import { useNavigation } from '../shared/lib/navigation/useNavigation';
import { useDocumentHead, buildCanonicalUrl } from '../shared/lib/seo';
import '../styles/softpill-buttons-in-cards.css';
import '../styles/softpill-cards.css';

const ELTERNGELD_INTRO_BULLETS = [
  'dein voraussichtliches Elterngeld schätzen und planen',
  'Monate zwischen Eltern aufteilen',
  'typische Grenzen und den Partnerschaftsbonus prüfen',
  'eine Übersicht für den Antrag erstellen',
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
    <div className="home-screen screen-placeholder">
      <section className="home-section">
        <SectionHeader as="h1" title="Willkommen" />
        <p className="home-section__placeholder-text">Schön, dass du hier bist!</p>
      </section>

      <section className="next-steps settings__global-stack">
        <Card className="ui-card">
          <div className="form-screen__section">
            <h3 className="home-section__knowledge-card-title">Elterngeld planen</h3>
            <p className="home-section__knowledge-card-description">
              Mit diesem Planer kannst du dein voraussichtliches Elterngeld schätzen und planen. Dauer: ca. 2–3 Minuten
            </p>
            <Button
              type="button"
              variant="secondary"
              fullWidth
              className="btn--softpill"
              onClick={() => goTo('/documents/elterngeld')}
            >
              Jetzt planen
            </Button>
          </div>
        </Card>

        <Card className="ui-card">
          <div className="form-screen__section">
            <h3 className="home-section__knowledge-card-title">Was dich erwartet</h3>
            <p className="home-section__knowledge-card-description">Mit diesem Planer kannst du:</p>
            <ul className="home-section__checklist-items">
              {ELTERNGELD_INTRO_BULLETS.map((line) => (
                <li key={line} className="home-section__checklist-item-label">
                  {line}
                </li>
              ))}
            </ul>
          </div>
        </Card>
      </section>
    </div>
  );
}
