import React from 'react';
import { useLocation } from 'react-router-dom';

/**
 * BackgroundLayers – Zweilagiger Hintergrund für Glassmorphism-App-Shell
 * 
 * Design-Spezifikationen:
 * - bg-blur: Stark weichgezeichnet + skaliert
 * - bg-focus: Scharf + radial mask-image
 * - shade: Dezente Shade-Ebene für Lesbarkeit
 * 
 * Diese Komponente stellt die Design-DNA der App sicher:
 * Zweilagiger Hintergrund mit Glassmorphism-Effekt
 * 
 * Wird nur auf Nicht-Home-Seiten angezeigt, da die Start-Seite
 * ihren eigenen speziellen Hintergrund hat.
 */
export const BackgroundLayers: React.FC = () => {
  const location = useLocation();
  const isHome = location.pathname === '/';
  const isElterngeldWizard = location.pathname.startsWith('/documents/elterngeld');
  const isParentalLeaveFlow = location.pathname.startsWith('/documents/parental-leave');

  // Auf Home-Seite nicht anzeigen, da dort eigener Hintergrund verwendet wird
  // Elterngeld-Wizard / Elternzeit-Flow: eigene Vollflächen-Bühne (startscreen-background-final), keine Shell-Layers darunter
  if (isHome || isElterngeldWizard || isParentalLeaveFlow) {
    return null;
  }

  return (
    <>
      {/* bg-blur: Stark weichgezeichnet + skaliert */}
      <div className="bg-blur" aria-hidden="true" />
      
      {/* bg-focus: Scharf + radial mask-image */}
      <div className="bg-focus" aria-hidden="true" />
      
      {/* shade: Dezente Shade-Ebene für Lesbarkeit */}
      <div className="shade" aria-hidden="true" />
    </>
  );
};
