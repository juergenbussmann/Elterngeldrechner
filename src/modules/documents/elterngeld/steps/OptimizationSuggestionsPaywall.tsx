import React from 'react';

export type OptimizationSuggestionsPaywallProps = {
  formatCurrency: (n: number) => string;
  headlineDeltaEuro: number | null;
  currentTotal: number;
  bestOptimizedTotal: number;
  improvedVariantCount: number;
  onUnlock: () => void;
  onBackToGoalSelection: () => void;
  /** Overlay: „Zurück zur Zielwahl“; Wizard-Zusammenfassung: z. B. „Zurück zur Planung“. */
  backButtonLabel?: string;
};

export function OptimizationSuggestionsPaywall({
  formatCurrency,
  headlineDeltaEuro,
  currentTotal,
  bestOptimizedTotal,
  improvedVariantCount,
  onUnlock,
  onBackToGoalSelection,
  backButtonLabel = 'Zurück zur Zielwahl',
}: OptimizationSuggestionsPaywallProps) {
  const hasMehrwert = headlineDeltaEuro != null && headlineDeltaEuro > 0;
  const headline = hasMehrwert
    ? `Mit Optimierung sind bis zu +${new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 }).format(headlineDeltaEuro)} € möglich`
    : 'Mit Optimierung kannst du dein Elterngeld besser planen';

  const lockedHint =
    improvedVariantCount === 1
      ? '1 bessere Variante verfügbar'
      : `${improvedVariantCount} bessere Varianten verfügbar`;

  return (
    <div className="elterngeld-optimization-paywall-wrap">
      <div
        className="elterngeld-optimization-paywall"
        role="region"
        aria-labelledby="elterngeld-opt-paywall-headline"
      >
        <h2 id="elterngeld-opt-paywall-headline" className="elterngeld-optimization-paywall__headline">
          {headline}
        </h2>
        <div className="elterngeld-optimization-paywall__compare">
          <p className="elterngeld-optimization-paywall__compare-line">
            <span className="elterngeld-optimization-paywall__compare-label">Aktueller Plan:</span>{' '}
            <span className="elterngeld-optimization-paywall__compare-value">{formatCurrency(currentTotal)}</span>
          </p>
          <p className="elterngeld-optimization-paywall__compare-line">
            <span className="elterngeld-optimization-paywall__compare-label">Optimiert möglich:</span>{' '}
            <span className="elterngeld-optimization-paywall__compare-value">{formatCurrency(bestOptimizedTotal)}</span>
          </p>
        </div>
        <ul className="elterngeld-optimization-paywall__list">
          <li>Beste Elterngeld-Strategie</li>
          <li>Alle Varianten sichtbar</li>
          <li>Optimierter Monatsplan</li>
          <li>PDF &amp; Antrag</li>
        </ul>
        <div className="elterngeld-optimization-paywall__price-block">
          <p className="elterngeld-optimization-paywall__price-main">38 € / Jahr</p>
          <p className="elterngeld-optimization-paywall__price-sub">entspricht ca. 3,16 € / Monat</p>
        </div>
        <button type="button" className="elterngeld-optimization-paywall__cta" onClick={onUnlock}>
          Optimierung freischalten
        </button>
        <button type="button" className="elterngeld-optimization-paywall__back" onClick={onBackToGoalSelection}>
          {backButtonLabel}
        </button>
      </div>
      <p className="elterngeld-optimization-paywall__locked-hint">{lockedHint}</p>
    </div>
  );
}
