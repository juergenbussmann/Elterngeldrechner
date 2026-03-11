import { useEffect, useRef } from 'react';
import { usePhase } from './usePhase';
import { usePanels } from '../../shared/lib/panels';

const DISMISSED_KEY = 'app_phase_onboarding_dismissed_v1';

export const PhaseOnboardingGate: React.FC = () => {
  const { profile } = usePhase();
  const { openBottomSheet } = usePanels();
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    if (profile) return;
    try {
      if (localStorage.getItem(DISMISSED_KEY)) return;
    } catch {
      return;
    }
    hasRun.current = true;
    openBottomSheet('phase-onboarding', { reason: 'first_run' });
  }, [profile, openBottomSheet]);

  return null;
};
