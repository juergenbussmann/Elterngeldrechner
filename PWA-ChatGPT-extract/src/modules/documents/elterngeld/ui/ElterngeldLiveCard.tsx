/**
 * Gemeinsame Live-Anzeige für Vorbereitung und Berechnung.
 * Zeigt den Gesamtüberblick: Mutter / Partner / Gesamtbetrag.
 * Gleiche Darstellung und visuelle Hierarchie an beiden Stellen.
 */

import React from 'react';
import { Card } from '../../../../shared/ui/Card';
import type { CalculationResult } from '../calculation';

const formatCurrency = (amount: number): string =>
  new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

export interface ElterngeldLiveCardProps {
  result: CalculationResult;
  title?: string;
}

export const ElterngeldLiveCard: React.FC<ElterngeldLiveCardProps> = ({
  result,
  title = 'Voraussichtliches Elterngeld',
}) => {
  return (
    <Card className="still-daily-checklist__card elterngeld-live-card">
      <h3 className="elterngeld-live-card__title">{title}</h3>
      <div className="elterngeld-live-card__rows">
        {result.parents.map((p) => (
          <div key={p.id} className="elterngeld-live-card__row">
            <span className="elterngeld-live-card__label">{p.label}:</span>
            <span className="elterngeld-live-card__value">{formatCurrency(p.total)}</span>
          </div>
        ))}
        <div className="elterngeld-live-card__row elterngeld-live-card__row--total">
          <span className="elterngeld-live-card__label">Gesamt:</span>
          <span className="elterngeld-live-card__value">
            {formatCurrency(result.householdTotal)}
          </span>
        </div>
      </div>
    </Card>
  );
};
