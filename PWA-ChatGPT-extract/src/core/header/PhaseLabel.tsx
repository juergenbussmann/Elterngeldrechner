import React from 'react';
import { usePhase } from '../phase/usePhase';

export const PhaseLabel: React.FC = () => {
  const { profile, snapshot } = usePhase();

  if (!profile || !snapshot?.label) {
    return null;
  }

  return (
    <span
      className="app-shell__phase-label"
      aria-label={snapshot.label}
    >
      {snapshot.label}
    </span>
  );
};
