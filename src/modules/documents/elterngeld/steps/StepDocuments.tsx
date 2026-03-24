import React, { useMemo } from 'react';
import { Card } from '../../../../shared/ui/Card';
import { Button } from '../../../../shared/ui/Button';
import { useNavigation } from '../../../../shared/lib/navigation/useNavigation';
import type { ElterngeldApplication } from '../types/elterngeldTypes';
import type { CalculationResult } from '../calculation';
import { buildElterngeldDocumentModel } from '../documentModel/buildElterngeldDocumentModel';
import { getElterngeldDocumentOutputRows } from '../documentModel/elterngeldDocumentOutputs';
import { formatDateGerman, parseIsoDate } from '../elterngeldDeadlines';

type Props = {
  values: ElterngeldApplication;
  liveResult?: CalculationResult | null;
  onCreatePdf: () => void;
  isSubmitting: boolean;
  onCreateApplicationPdf: () => void;
  isApplicationPdfSubmitting: boolean;
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export const StepDocuments: React.FC<Props> = ({
  values,
  liveResult,
  onCreatePdf,
  isSubmitting,
  onCreateApplicationPdf,
  isApplicationPdfSubmitting,
}) => {
  const { goTo } = useNavigation();
  const model = useMemo(() => buildElterngeldDocumentModel(values, liveResult), [values, liveResult]);
  const outputRows = useMemo(() => getElterngeldDocumentOutputRows(model), [model]);

  const birthDate = parseIsoDate(model.child.birthDate);
  const birthStr = birthDate ? formatDateGerman(birthDate) : '–';
  const expectedDate = parseIsoDate(model.child.expectedBirthDate);
  const expectedStr = expectedDate ? formatDateGerman(expectedDate) : '–';

  const scrollToChecklist = (): void => {
    document.getElementById('elterngeld-documents-checklist')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  return (
    <>
      <Card className="still-daily-checklist__card elterngeld-documents__intro-card">
        <h3 className="elterngeld-step__title">Vorbereitung für deinen Antrag</h3>
        <p className="elterngeld-step__hint elterngeld-summary__forms-hint elterngeld-documents__lead">
          Hier siehst du, welche Ausgaben es gibt, was sie enthalten und was als Nächstes sinnvoll ist.
        </p>
        <div className="elterngeld-documents__overview elterngeld-step__hint elterngeld-summary__forms-hint">
          <p>Bundesland: {model.stateDisplayName}</p>
          <p>
            Geburtsdatum: {birthStr} · Voraussichtlicher Termin: {expectedStr}
          </p>
          <p>
            {model.parentA.firstName} {model.parentA.lastName}
            {model.parentB
              ? ` · ${model.parentB.firstName} ${model.parentB.lastName}`
              : null}
          </p>
          <p>
            Modell {model.benefitPlan.model}
            {model.benefitPlan.partnershipBonus ? ' · Partnerschaftsbonus' : ''}
          </p>
          {model.calculation ? (
            <p>
              Orientierung Haushalt: {formatCurrency(model.calculation.householdTotal)} (Schätzung)
            </p>
          ) : null}
        </div>
      </Card>

      <div className="elterngeld-documents__output-list">
        {outputRows.map((row) => (
          <Card key={row.id} className="still-daily-checklist__card elterngeld-documents__output-card">
            <div className="elterngeld-documents__output-head">
              <h4 className="elterngeld-step__title elterngeld-documents__output-title">{row.title}</h4>
              <span
                className={`elterngeld-documents__status elterngeld-documents__status--${row.status}`}
              >
                {row.statusLabel}
              </span>
            </div>
            <p className="elterngeld-documents__output-desc">{row.description}</p>
            <div className="elterngeld-documents__output-actions">
              {row.action === 'summaryPdf' ? (
                <Button
                  type="button"
                  variant="primary"
                  className="next-steps__button btn--softpill"
                  onClick={onCreatePdf}
                  disabled={isSubmitting || isApplicationPdfSubmitting}
                >
                  {isSubmitting ? 'Wird erstellt…' : 'PDF Übersicht erstellen'}
                </Button>
              ) : null}
              {row.action === 'scrollChecklist' ? (
                <Button
                  type="button"
                  variant="secondary"
                  className="next-steps__button btn--softpill"
                  onClick={scrollToChecklist}
                >
                  Zur Checkliste
                </Button>
              ) : null}
              {row.action === 'applicationPdf' ? (
                <Button
                  type="button"
                  variant="primary"
                  className="next-steps__button btn--softpill"
                  onClick={onCreateApplicationPdf}
                  disabled={isSubmitting || isApplicationPdfSubmitting}
                >
                  {isApplicationPdfSubmitting ? 'Wird erstellt…' : 'Antrags-PDF erstellen'}
                </Button>
              ) : null}
            </div>
          </Card>
        ))}
      </div>

      <Card className="still-daily-checklist__card" id="elterngeld-documents-checklist">
        <h4 className="elterngeld-step__title elterngeld-documents__checklist-heading">
          Unterlagen-Checkliste
        </h4>
        <ul className="elterngeld-step__doc-list elterngeld-step__doc-list--checklist">
          {model.checklistItems.map((doc, i) => (
            <li key={i}>✓ {doc}</li>
          ))}
        </ul>

        <div className="elterngeld-step__doc-actions">
          <Button
            type="button"
            variant="ghost"
            className="next-steps__button"
            onClick={() => goTo('/notifications')}
          >
            Erinnerung setzen
          </Button>
        </div>
      </Card>
    </>
  );
};
