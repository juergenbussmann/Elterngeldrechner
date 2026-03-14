import React from 'react';
import { Card } from '../../../../shared/ui/Card';
import type { ElterngeldApplication } from '../types/elterngeldTypes';

const BASE_DOCUMENTS = [
  'Geburtsurkunde',
  'Einkommensnachweise',
  'Bankverbindung',
];

function getDynamicDocuments(values: ElterngeldApplication): string[] {
  const docs: string[] = [];
  if (values.parentA.employmentType === 'employed' || values.parentA.employmentType === 'mixed') {
    docs.push('Arbeitgeberbescheinigung');
  }
  if (values.parentA.employmentType === 'self_employed' || values.parentA.employmentType === 'mixed') {
    docs.push('Nachweise bei Selbstständigkeit');
  }
  const showParentB = values.applicantMode === 'single_applicant' || values.applicantMode === 'both_parents';
  if (showParentB && values.parentB) {
    docs.push('Nachweis Vaterschaft / Anerkennung (falls zutreffend)');
  }
  if (values.applicantMode === 'both_parents' && values.parentB) {
    if (values.parentB.employmentType === 'employed' || values.parentB.employmentType === 'mixed') {
      docs.push('Arbeitgeberbescheinigung (Elternteil B)');
    }
    if (values.parentB.employmentType === 'self_employed' || values.parentB.employmentType === 'mixed') {
      docs.push('Nachweise bei Selbstständigkeit (Elternteil B)');
    }
  }
  return docs;
}

type Props = {
  values: ElterngeldApplication;
};

export const StepDocuments: React.FC<Props> = ({ values }) => {
  const dynamic = getDynamicDocuments(values);
  const all = [...BASE_DOCUMENTS, ...dynamic];

  return (
    <Card className="still-daily-checklist__card">
      <h3 className="elterngeld-step__title">Unterlagen</h3>
      <p className="elterngeld-step__hint">
        Typische Unterlagen für den Elterngeld-Antrag:
      </p>
      <ul className="elterngeld-step__doc-list">
        {all.map((doc, i) => (
          <li key={i}>{doc}</li>
        ))}
      </ul>
    </Card>
  );
};
