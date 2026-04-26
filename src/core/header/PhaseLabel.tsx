import React from 'react';
import { useLocation } from 'react-router-dom';
import { usePhase } from '../phase/usePhase';

/** SSW/Phasen-Kurzlabel nur außerhalb von Dokumenten-, Elterngeld- und Einstellungs-Flows. */
function isPregnancyPhaseHeaderContext(pathname: string): boolean {
  if (pathname.startsWith('/documents')) return false;
  if (pathname.startsWith('/settings')) return false;
  return true;
}

export const PhaseLabel: React.FC = () => {
  const { pathname } = useLocation();
  const { profile, snapshot } = usePhase();

  if (!isPregnancyPhaseHeaderContext(pathname)) {
    return null;
  }

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
