/**
 * Intro-Screen vor dem Elterngeld-Wizard.
 */

import React from 'react';
import { Card } from '../../../../shared/ui/Card';
import { Button } from '../../../../shared/ui/Button';

type Props = {
  onStart: () => void;
};

export const StepIntro: React.FC<Props> = ({ onStart }) => (
  <Card className="still-daily-checklist__card elterngeld-intro-card">
    <h2 className="elterngeld-intro__title">Elterngeld planen</h2>
    <p className="elterngeld-intro__text">Mit diesem Planer kannst du:</p>
    <ul className="elterngeld-intro__list elterngeld-intro__list--check">
      <li>dein voraussichtliches Elterngeld schätzen und planen</li>
      <li>Monate zwischen Eltern aufteilen</li>
      <li>typische Grenzen und den Partnerschaftsbonus prüfen</li>
      <li>eine Übersicht für den Antrag erstellen</li>
    </ul>
    <p className="elterngeld-intro__duration">Dauer: ca. 2–3 Minuten</p>
    <Button
      type="button"
      variant="primary"
      fullWidth
      className="next-steps__button btn--softpill elterngeld-intro__cta"
      onClick={onStart}
    >
      Jetzt planen
    </Button>
  </Card>
);
