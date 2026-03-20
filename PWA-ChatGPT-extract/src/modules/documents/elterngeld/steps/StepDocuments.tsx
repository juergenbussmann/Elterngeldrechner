import React from 'react';
import { Card } from '../../../../shared/ui/Card';
import { Button } from '../../../../shared/ui/Button';
import { useNavigation } from '../../../../shared/lib/navigation/useNavigation';
import type { ElterngeldApplication } from '../types/elterngeldTypes';

const DOCUMENT_CHECKLIST = [
  'Geburtsurkunde',
  'Einkommensnachweise',
  'Arbeitgeberbescheinigung',
  'Steuer-ID',
];

type Props = {
  values: ElterngeldApplication;
};

export const StepDocuments: React.FC<Props> = () => {
  const { goTo } = useNavigation();

  return (
    <Card className="still-daily-checklist__card">
      <h3 className="elterngeld-step__title">Was du für den Antrag brauchst</h3>
      <ul className="elterngeld-step__doc-list elterngeld-step__doc-list--checklist">
        {DOCUMENT_CHECKLIST.map((doc, i) => (
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
  );
};
