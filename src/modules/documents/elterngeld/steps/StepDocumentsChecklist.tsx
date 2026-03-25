/**
 * Wizard-Schritt 2 der Ausgabestrecke: nur Unterlagen-Checkliste.
 */

import React from 'react';
import { Card } from '../../../../shared/ui/Card';
import { Button } from '../../../../shared/ui/Button';
import type { ElterngeldApplication } from '../types/elterngeldTypes';
import type { CalculationResult } from '../calculation';
import { buildElterngeldDocumentModel } from '../documentModel/buildElterngeldDocumentModel';

type Props = {
  values: ElterngeldApplication;
  liveResult?: CalculationResult | null;
  onContinue: () => void;
};

export const StepDocumentsChecklist: React.FC<Props> = ({ values, liveResult, onContinue }) => {
  const model = buildElterngeldDocumentModel(values, liveResult);
  const dl = model.deadlines;
  const stateNotes = model.stateNotes?.trim();

  return (
    <>
      <Card className="still-daily-checklist__card elterngeld-documents__intro-card">
        <h3 className="elterngeld-step__title">Unterlagen-Checkliste</h3>
        <p className="elterngeld-step__hint elterngeld-summary__forms-hint elterngeld-documents__lead">
          Prüfe diese Liste – sie ergibt sich aus deinen Angaben und dem gewählten Bundesland.
        </p>
      </Card>

      <Card className="still-daily-checklist__card" id="elterngeld-documents-checklist">
        <ul className="elterngeld-step__doc-list elterngeld-step__doc-list--checklist">
          {model.checklistItems.map((doc, i) => (
            <li key={i}>✓ {doc}</li>
          ))}
        </ul>
      </Card>

      {stateNotes ? (
        <Card className="still-daily-checklist__card">
          <p className="elterngeld-step__notice elterngeld-step__notice--tip elterngeld-documents__state-note">
            <strong>Hinweis zum Bundesland:</strong> {stateNotes}
          </p>
        </Card>
      ) : null}

      {dl.deadlineLabel?.trim() || dl.noticeText?.trim() ? (
        <Card className="still-daily-checklist__card">
          <div className="elterngeld-step__hint elterngeld-documents__deadlines">
            {dl.deadlineLabel?.trim() ? <p>{dl.deadlineLabel.trim()}</p> : null}
            {dl.noticeText?.trim() ? <p>{dl.noticeText.trim()}</p> : null}
          </div>
        </Card>
      ) : null}

      <div className="elterngeld-documents__output-actions">
        <Button
          type="button"
          variant="primary"
          fullWidth
          className="next-steps__button btn--softpill"
          onClick={onContinue}
        >
          Weiter zur Antragsvorbereitung
        </Button>
      </div>
    </>
  );
};
