import React from 'react';
import { Button } from '../shared/ui/Button';
import { useNavigation } from '../shared/lib/navigation/useNavigation';
import { usePhase } from '../core/phase/usePhase';
import { getChildDateContext } from '../shared/lib/childDateContext';
import '../modules/checklists/styles/softpill-buttons-in-cards.css';

export interface PhaseShortcutProps {
  title: string;
  route: string;
}

/**
 * Platzhalter-CTA für Phase-Screens. Wird nur angezeigt, wenn ein Datum
 * (Geburtstermin oder Geburtsdatum) im Profil gesetzt ist.
 */
export const PhaseShortcut: React.FC<PhaseShortcutProps> = ({ title, route }) => {
  const { profile } = usePhase();
  const { goTo } = useNavigation();

  const child = getChildDateContext(profile);
  const hasDate = child.effectiveDate !== null;

  if (!hasDate) {
    return null;
  }

  return (
    <Button
      type="button"
      variant="secondary"
      fullWidth
      className="next-steps__button btn--softpill"
      onClick={() => goTo(route)}
    >
      {title}
    </Button>
  );
};
