/**
 * DevTools Console Script: Theme-Variable-Diff Phase vs BegleitungPlus
 *
 * Verwendung:
 * 1) Phase BottomSheet öffnen → Script ausführen → "phase" speichern
 * 2) Phase schließen, BegleitungPlus BottomSheet öffnen → Script ausführen → "bp" speichern
 * 3) Diff vergleichen
 *
 * Oder: Beide nacheinander ausführen, dann wird der Diff automatisch geloggt.
 */
(function () {
  const vars = [
    '--color-surface',
    '--shadow-md',
    '--color-text-primary',
    '--color-border',
    '--color-background',
    '--ui-surface-1',
    '--ui-surface-2',
    '--ui-border',
    '--ui-shadow',
    '--pill-bg-top',
    '--pill-border',
  ];

  const dump = (label, el) => {
    if (!el) return { label, error: 'Element nicht gefunden' };
    const s = getComputedStyle(el);
    const out = { label };
    vars.forEach((v) => {
      const val = s.getPropertyValue(v).trim();
      if (val) out[v] = val;
    });
    return out;
  };

  const surface = document.querySelector('section.panel-surface');
  const card = document.querySelector('.phase-onboarding-panel');
  const root = document.documentElement;

  const result = {
    root: dump('document.documentElement', root),
    surface: dump('panel-surface', surface),
    card: dump('phase-onboarding-panel', card),
  };

  console.table([result.root, result.surface, result.card]);
  console.log('Ergebnis:', result);
  return result;
})();
