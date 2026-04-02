/**
 * Wizard: kompakte Datenübersicht vor der PDF-Sammelspeicherung.
 * Inhalte ausschließlich aus ElterngeldApplication + buildElterngeldDocumentModel.
 */

import React, { useMemo } from 'react';
import { Card } from '../../../../shared/ui/Card';
import { formatDateGerman, parseIsoDate } from '../elterngeldDeadlines';
import {
  buildElterngeldDocumentModel,
  filterChecklistItemsForUnterlagenDisplay,
} from '../documentModel/buildElterngeldDocumentModel';
import type {
  ApplicantMode,
  BenefitModel,
  ElterngeldApplication,
  EmploymentType,
} from '../types/elterngeldTypes';
import type { CalculationResult } from '../calculation';

const APPLICANT_LABEL: Record<ApplicantMode, string> = {
  single_applicant: 'Nur ich',
  both_parents: 'Beide Elternteile',
  single_parent: 'Ich bin alleinerziehend',
};

const EMPLOYMENT_LABEL: Record<EmploymentType, string> = {
  employed: 'Angestellt',
  self_employed: 'Selbstständig',
  mixed: 'Gemischt',
  none: 'Keine Erwerbstätigkeit',
};

function benefitModelLabel(m: BenefitModel): string {
  if (m === 'basis') return 'Basiselterngeld';
  if (m === 'plus') return 'ElterngeldPlus';
  if (m === 'mixed') return 'Gemischt (Basis und Plus)';
  return m;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function displayName(first: string, last: string): string {
  const f = first.trim();
  const l = last.trim();
  if (!f && !l) return '–';
  return [f, l].filter(Boolean).join(' ');
}

type Props = {
  values: ElterngeldApplication;
  liveResult?: CalculationResult | null;
};

export const StepDocumentsDataOverview: React.FC<Props> = ({ values, liveResult }) => {
  const model = useMemo(() => buildElterngeldDocumentModel(values, liveResult), [values, liveResult]);

  const birth = parseIsoDate(model.child.birthDate);
  const expected = parseIsoDate(model.child.expectedBirthDate);
  const birthStr = birth ? formatDateGerman(birth) : '–';
  const expectedStr = expected ? formatDateGerman(expected) : '–';

  const showPartnerBlock = model.applicantMode === 'both_parents' && model.parentB;

  return (
    <div className="elterngeld-documents-data-stack">
      <Card className="still-daily-checklist__card">
        <h3 className="elterngeld-step__title">Daten für deine Dokumente</h3>
        <p className="elterngeld-step__hint elterngeld-summary__forms-hint elterngeld-documents__lead">
          Diese Angaben sind lokal gespeichert und fließen in die PDF-Ausgaben ein. Im nächsten Schritt kannst du alle
          unterstützten PDFs gemeinsam in „Dokumente“ sichern.
        </p>
      </Card>

      <Card className="still-daily-checklist__card">
        <h4 className="elterngeld-step__section-title">Grunddaten &amp; Antrag</h4>
        <div className="elterngeld-plan__summary-rows">
          <div className="elterngeld-plan__summary-row">
            <span className="elterngeld-plan__summary-label">Bundesland</span>
            <span className="elterngeld-plan__summary-value">{model.stateDisplayName}</span>
          </div>
          <div className="elterngeld-plan__summary-row">
            <span className="elterngeld-plan__summary-label">Antrag</span>
            <span className="elterngeld-plan__summary-value">{APPLICANT_LABEL[model.applicantMode]}</span>
          </div>
          <div className="elterngeld-plan__summary-row">
            <span className="elterngeld-plan__summary-label">Geburtsdatum Kind</span>
            <span className="elterngeld-plan__summary-value">{birthStr}</span>
          </div>
          <div className="elterngeld-plan__summary-row">
            <span className="elterngeld-plan__summary-label">Voraussichtlicher Termin</span>
            <span className="elterngeld-plan__summary-value">{expectedStr}</span>
          </div>
          <div className="elterngeld-plan__summary-row">
            <span className="elterngeld-plan__summary-label">Mehrlinge</span>
            <span className="elterngeld-plan__summary-value">{model.child.multipleBirth ? 'Ja' : 'Nein'}</span>
          </div>
        </div>
      </Card>

      <Card className="still-daily-checklist__card">
        <h4 className="elterngeld-step__section-title">Eltern &amp; Erwerb</h4>
        <div className="elterngeld-plan__summary-rows">
          <div className="elterngeld-plan__summary-row">
            <span className="elterngeld-plan__summary-label">Sie</span>
            <span className="elterngeld-plan__summary-value">
              {displayName(model.parentA.firstName, model.parentA.lastName)}
            </span>
          </div>
          <div className="elterngeld-plan__summary-row">
            <span className="elterngeld-plan__summary-label">Beschäftigung</span>
            <span className="elterngeld-plan__summary-value">
              {EMPLOYMENT_LABEL[model.parentA.employmentType]}
            </span>
          </div>
          {model.parentA.plannedPartTime && (
            <div className="elterngeld-plan__summary-row">
              <span className="elterngeld-plan__summary-label">Teilzeit (geplant)</span>
              <span className="elterngeld-plan__summary-value">
                {model.parentA.hoursPerWeek != null ? `${model.parentA.hoursPerWeek} Std./Woche` : 'Ja'}
              </span>
            </div>
          )}
          {showPartnerBlock && model.parentB && (
            <>
              <div className="elterngeld-plan__summary-row">
                <span className="elterngeld-plan__summary-label">Partner</span>
                <span className="elterngeld-plan__summary-value">
                  {displayName(model.parentB.firstName, model.parentB.lastName)}
                </span>
              </div>
              <div className="elterngeld-plan__summary-row">
                <span className="elterngeld-plan__summary-label">Beschäftigung</span>
                <span className="elterngeld-plan__summary-value">
                  {EMPLOYMENT_LABEL[model.parentB.employmentType]}
                </span>
              </div>
              {model.parentB.plannedPartTime && (
                <div className="elterngeld-plan__summary-row">
                  <span className="elterngeld-plan__summary-label">Teilzeit Partner (geplant)</span>
                  <span className="elterngeld-plan__summary-value">
                    {model.parentB.hoursPerWeek != null ? `${model.parentB.hoursPerWeek} Std./Woche` : 'Ja'}
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </Card>

      <Card className="still-daily-checklist__card">
        <h4 className="elterngeld-step__section-title">Einkommen</h4>
        <div className="elterngeld-plan__summary-rows">
          <div className="elterngeld-plan__summary-row">
            <span className="elterngeld-plan__summary-label">Sie</span>
            <span className="elterngeld-plan__summary-value">
              {model.parentA.incomeBeforeBirth.trim() || '–'}
            </span>
          </div>
          {showPartnerBlock && model.parentB && (
            <div className="elterngeld-plan__summary-row">
              <span className="elterngeld-plan__summary-label">Partner</span>
              <span className="elterngeld-plan__summary-value">
                {model.parentB.incomeBeforeBirth.trim() || '–'}
              </span>
            </div>
          )}
        </div>
      </Card>

      <Card className="still-daily-checklist__card">
        <h4 className="elterngeld-step__section-title">Geplanter Bezug</h4>
        <div className="elterngeld-plan__summary-rows">
          <div className="elterngeld-plan__summary-row">
            <span className="elterngeld-plan__summary-label">Modell</span>
            <span className="elterngeld-plan__summary-value">{benefitModelLabel(model.benefitPlan.model)}</span>
          </div>
          <div className="elterngeld-plan__summary-row">
            <span className="elterngeld-plan__summary-label">Ihre Monate</span>
            <span className="elterngeld-plan__summary-value">{model.benefitPlan.parentAMonths.trim() || '–'}</span>
          </div>
          <div className="elterngeld-plan__summary-row">
            <span className="elterngeld-plan__summary-label">Monate Partner</span>
            <span className="elterngeld-plan__summary-value">{model.benefitPlan.parentBMonths.trim() || '–'}</span>
          </div>
          <div className="elterngeld-plan__summary-row">
            <span className="elterngeld-plan__summary-label">Partnerschaftsbonus</span>
            <span className="elterngeld-plan__summary-value">
              {model.benefitPlan.partnershipBonus ? 'Ja' : 'Nein'}
            </span>
          </div>
        </div>
      </Card>

      {model.calculation && (
        <Card className="still-daily-checklist__card">
          <h4 className="elterngeld-step__section-title">Orientierung (unverbindliche Schätzung)</h4>
          <div className="elterngeld-plan__summary-rows">
            {model.calculation.parentTotals.map((pt) => (
              <div key={pt.label} className="elterngeld-plan__summary-row">
                <span className="elterngeld-plan__summary-label">{pt.label}</span>
                <span className="elterngeld-plan__summary-value">{formatCurrency(pt.total)}</span>
              </div>
            ))}
            <div className="elterngeld-plan__summary-row">
              <span className="elterngeld-plan__summary-label">Haushalt gesamt</span>
              <span className="elterngeld-plan__summary-value">
                {formatCurrency(model.calculation.householdTotal)}
              </span>
            </div>
          </div>
        </Card>
      )}

      <Card className="still-daily-checklist__card">
        <h4 className="elterngeld-step__section-title elterngeld-documents__checklist-heading">
          Unterlagen-Checkliste (im Kurzüberblick-PDF)
        </h4>
        <ul className="elterngeld-step__doc-list elterngeld-step__doc-list--checklist">
          {filterChecklistItemsForUnterlagenDisplay(model.checklistItems).map((doc, i) => (
            <li key={i}>{doc}</li>
          ))}
        </ul>
      </Card>

      {(model.deadlines.deadlineLabel?.trim() || model.deadlines.noticeText?.trim()) && (
        <Card className="still-daily-checklist__card">
          <h4 className="elterngeld-step__section-title">Fristen &amp; Hinweise</h4>
          <div className="elterngeld-step__hint elterngeld-documents__deadlines">
            {model.deadlines.deadlineLabel?.trim() ? <p>{model.deadlines.deadlineLabel.trim()}</p> : null}
            {model.deadlines.noticeText?.trim() ? <p>{model.deadlines.noticeText.trim()}</p> : null}
          </div>
        </Card>
      )}

      {model.stateNotes?.trim() ? (
        <Card className="still-daily-checklist__card">
          <p className="elterngeld-step__notice elterngeld-step__notice--tip elterngeld-documents__state-note">
            <strong>Hinweis zum Bundesland:</strong> {model.stateNotes.trim()}
          </p>
        </Card>
      ) : null}
    </div>
  );
};
