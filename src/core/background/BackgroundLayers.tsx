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

  // Auf Home-Seite nicht anzeigen, da dort eigener Hintergrund verwendet wird
  if (isHome) {
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
