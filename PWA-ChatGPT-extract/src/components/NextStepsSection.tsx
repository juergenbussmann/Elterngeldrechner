import React from 'react';
import { Card } from '../shared/ui/Card';
import { Button } from '../shared/ui/Button';
import { SectionHeader } from '../shared/ui/SectionHeader';
import { useNavigation } from '../shared/lib/navigation/useNavigation';

export type NextStepItem = {
  label: string;
  to: string;
};

export type NextStepsSectionProps = {
  /**
   * Darstellung der Sektion.
   * - "card": Standard für Start-/Phasen-Seiten (mit Card-Container)
   * - "plain": Nur Überschrift + Button-Stack ohne Card-Rahmen
   */
  variant?: 'card' | 'plain';
  title?: string;
  items: NextStepItem[];
};

export const NextStepsSection: React.FC<NextStepsSectionProps> = ({
  variant = 'card',
  title = 'Nächste Schritte',
  items,
}) => {
  const { goTo, goBack } = useNavigation();

  if (!items || items.length === 0) {
    return null;
  }

  const buttons = (
    <>
      <div className="next-steps__stack">
        {items.map((item) => (
          <Button
            key={`${item.to}-${item.label}`}
            type="button"
            variant="secondary"
            fullWidth
            className="next-steps__button btn--softpill"
            onClick={() => goTo(item.to)}
          >
            {item.label}
          </Button>
        ))}

        {/* NEU: Zurück-Button im gleichen Stil */}
        <Button
          type="button"
          variant="secondary"
          fullWidth
          className="next-steps__button btn--softpill next-steps__back-button"
          onClick={goBack}
        >
          Zurück
        </Button>
      </div>

      {/* NEU: Abstand zum Footer */}
      <div className="next-steps__footer-spacer" aria-hidden="true" />
    </>
  );

  return (
    <section
      className={variant === 'plain' ? 'next-steps next-steps--plain' : 'home-section next-steps'}
    >
      {title ? <SectionHeader title={title} /> : null}

      {variant === 'card' ? (
        <Card className="next-steps__card">{buttons}</Card>
      ) : (
        buttons
      )}
    </section>
  );
};

