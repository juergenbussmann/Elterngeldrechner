/**
 * Testseite – Layout-Reuse.
 * Verwendet exakt dasselbe Layout-System wie die App:
 * Glas-Box, Glass-Button, content-area, Design-Tokens.
 * Keine neuen Styles.
 */

import React from 'react';
import { useNavigation } from '../shared/lib/navigation/useNavigation';
import { GlassBox, GlassButton } from '../components/layout';

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2.5" fill="none">
    <path d="M20 7 10.5 16.5 6 12" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const Testseite: React.FC = () => {
  const { goTo } = useNavigation();

  return (
    <div className="content-area">
      <GlassBox>
        <h2 className="settings-layout__section-title">Testseite</h2>
        <p className="settings-layout__muted">
          Gleiche Glas-Box-Struktur, gleiches Button-System.
        </p>
        <GlassButton icon={<CheckIcon />} onClick={() => goTo('/')}>
          Zur Startseite
        </GlassButton>
      </GlassBox>
    </div>
  );
};
