import React, { useEffect } from 'react';
import { usePanels } from '../shared/lib/panels/PanelContext';
import { useNavigation } from '../shared/lib/navigation/useNavigation';

/**
 * Route /onboarding/due-date – öffnet den bestehenden Onboarding-Bottom-Sheet
 * und navigiert zurück, damit der Nutzer das Formular ausfüllen kann.
 */
export const OnboardingDueDateScreen: React.FC = () => {
  const { openBottomSheet } = usePanels();
  const { goBack } = useNavigation();

  useEffect(() => {
    openBottomSheet('phase-onboarding', { reason: 'settings' });
    goBack();
  }, [openBottomSheet, goBack]);

  return null;
};
