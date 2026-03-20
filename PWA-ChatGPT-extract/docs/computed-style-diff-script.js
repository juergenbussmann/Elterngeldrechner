/**
 * DevTools Console Script: Computed-Style-Diff für Phase vs BegleitungPlus BottomSheet
 *
 * Verwendung:
 * 1) Phase BottomSheet öffnen → Script ausführen → Ergebnis kopieren (Phase)
 * 2) Phase schließen, BegleitungPlus BottomSheet öffnen → Script ausführen → Ergebnis kopieren (BegleitungPlus)
 * 3) Beide Ausgaben vergleichen
 *
 * Oder: Script zweimal ausführen und in sessionStorage speichern, dann Diff anzeigen.
 */
(function () {
  const PROPS = [
    'background-color',
    'background-image',
    'opacity',
    'backdrop-filter',
    '-webkit-backdrop-filter',
    'filter',
    'border',
    'border-radius',
    'box-shadow',
    'color',
    'mix-blend-mode',
    'transform',
    'position',
  ];

  function getComputed(el, label) {
    if (!el) return { label, error: 'Element nicht gefunden' };
    const s = getComputedStyle(el);
    const out = { label };
    PROPS.forEach((p) => {
      const v = s.getPropertyValue(p.replace(/([A-Z])/g, '-$1').toLowerCase()) || s[p];
      if (v) out[p] = v;
    });
    return out;
  }

  const scrim = document.querySelector('[data-debug="scrim"]');
  const surface = document.querySelector('[data-debug="surface"]');
  const body = document.querySelector('[data-debug="body"]');

  const result = {
    panel: document.querySelector('.panel-surface--bottom') ? 'bottom-sheet' : 'none',
    scrim: getComputed(scrim, 'scrim'),
    surface: getComputed(surface, 'surface'),
    body: getComputed(body, 'body'),
  };

  console.table(result.scrim);
  console.table(result.surface);
  console.table(result.body);
  console.log('Vollständiges Ergebnis:', result);
  return result;
})();
