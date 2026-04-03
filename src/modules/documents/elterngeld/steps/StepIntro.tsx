/**
 * Intro-Screen: Vollflächiger Hero (Landing) + CTA + Benefits im Hero – kein Wizard-Layout.
 */

import React from 'react';
import { Button } from '../../../../shared/ui/Button';

type Props = {
  onStart: () => void;
  onReset?: () => void;
};

export const StepIntro: React.FC<Props> = ({ onStart, onReset }) => (
  <div className="elterngeld-intro">
    <section className="start-hero" aria-labelledby="elterngeld-hero-heading">
      <div className="start-hero__grain" aria-hidden="true" />
      <div className="start-hero__content">
        <p className="start-hero__eyebrow">Willkommen</p>
        <h1 id="elterngeld-hero-heading" className="start-hero__title">
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
          onClick={onStart}
        >
          Jetzt planen
        </Button>
        <ul className="start-hero__benefits" aria-label="Kurzüberblick">
          <li>schnell berechnen</li>
          <li>Monate planen</li>
          <li>Bonus prüfen</li>
          <li>Antrag vorbereiten</li>
        </ul>
      </div>
    </section>

    {onReset ? (
      <button type="button" className="elterngeld-intro__reset-link" onClick={onReset}>
        Neu beginnen
      </button>
    ) : null}
  </div>
);
