/**
 * Bildschirm-Vorschau der Antrags-Ausfüllhilfe (Abschnitte A–E + Anhang) — inhaltlich abgestimmt mit buildElterngeldApplicationPdf.
 */

import React from 'react';
import { Card } from '../../../../shared/ui/Card';
import type { ElterngeldDocumentModel } from '../documentModel/buildElterngeldDocumentModel';
import {
  ANHANG_CHECKLIST_INTRO,
  ANHANG_CHECKLIST_TITLE,
  ANHANG_DEADLINES_TITLE,
  APPLICATION_FORM_DOCUMENT_TITLE,
  getApplicationFormIntroParagraph,
  APPLICATION_FORM_SECTION_C_TEXT,
  CALCULATION_UNAVAILABLE_BODY,
  CALCULATION_UNAVAILABLE_TITLE,
  formatConcreteMonthLines,
  MONTH_DISTRIBUTION_FOOTNOTE,
  MONTH_DISTRIBUTION_INTRO_LINES,
  SECTION_ANHANG_TITLE,
  SECTION_B_NO_DISTRIBUTION_HINT,
  SECTION_B_TITLE,
  SECTION_C_TITLE,
  SECTION_D_MISSING_CATEGORIES,
  SECTION_D_MISSING_HEADING,
  SECTION_D_TITLE,
  SECTION_E_LINES,
  SECTION_E_TITLE,
  SUBSECTION_CALCULATION,
  SUBSECTION_MONTHLY_SPLIT,
} from './elterngeldApplicationFormLabels';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export interface ElterngeldApplicationFormFillHelperPreviewProps {
  model: ElterngeldDocumentModel;
}

export const ElterngeldApplicationFormFillHelperPreview: React.FC<
  ElterngeldApplicationFormFillHelperPreviewProps
> = ({ model }) => {
  const sortedDist = [...model.documentMonthDistribution].sort((a, b) => a.month - b.month);
  const hasMonthBezug = sortedDist.some((e) => e.modeA !== 'none' || e.modeB !== 'none');

  return (
    <>
      <Card className="still-daily-checklist__card">
        <h3 className="elterngeld-step__title">{APPLICATION_FORM_DOCUMENT_TITLE}</h3>
        <p className="elterngeld-step__hint elterngeld-summary__forms-hint elterngeld-documents__lead">
          {getApplicationFormIntroParagraph(model)}
        </p>
      </Card>

      <Card className="still-daily-checklist__card">
        {model.formSections
          .filter((s) => s.sectionCode === 'A')
          .map((sec) => (
            <React.Fragment key={sec.sectionCode}>
              <h4 className="elterngeld-step__section-title">{sec.sectionHeading}</h4>
              {sec.subsections.map((sub) => (
                <React.Fragment key={sub.subsectionTitle}>
                  <p className="elterngeld-step__section-title elterngeld-step__section-title--nested">
                    {sub.subsectionTitle}
                  </p>
                  <div className="elterngeld-plan__summary-rows">
                    {sub.fields.map((f) => (
                      <div
                        key={f.source === 'app' ? f.id : f.displayKey}
                        className="elterngeld-plan__summary-row"
                      >
                        <span className="elterngeld-plan__summary-label">{f.label}</span>
                        <span className="elterngeld-plan__summary-value">
                          {f.empty && f.hint ? (
                            <span className="elterngeld-step__hint elterngeld-summary__forms-hint">{f.hint}</span>
                          ) : (
                            f.value
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                </React.Fragment>
              ))}
            </React.Fragment>
          ))}
      </Card>

      <Card className="still-daily-checklist__card">
        <h4 className="elterngeld-step__section-title">{SECTION_B_TITLE}</h4>
        {hasMonthBezug ? (
          <>
            <p className="elterngeld-step__section-title elterngeld-step__section-title--nested">
              {SUBSECTION_MONTHLY_SPLIT}
            </p>
            <p className="elterngeld-step__hint elterngeld-summary__forms-hint">{MONTH_DISTRIBUTION_INTRO_LINES[0]}</p>
            <p className="elterngeld-step__hint elterngeld-summary__forms-hint">{MONTH_DISTRIBUTION_INTRO_LINES[1]}</p>
            <ul className="elterngeld-step__doc-list">
              {sortedDist.map((entry) => {
                const lines = formatConcreteMonthLines(model, entry.month, entry.modeA, entry.modeB);
                return (
                  <li key={entry.month}>
                    {lines.map((line, idx) => (
                      <div key={idx}>{line}</div>
                    ))}
                  </li>
                );
              })}
            </ul>
            <p className="elterngeld-step__hint elterngeld-summary__forms-hint">{MONTH_DISTRIBUTION_FOOTNOTE}</p>
          </>
        ) : (
          <p className="elterngeld-step__hint elterngeld-summary__forms-hint">{SECTION_B_NO_DISTRIBUTION_HINT}</p>
        )}

        <p className="elterngeld-step__section-title elterngeld-step__section-title--nested">{SUBSECTION_CALCULATION}</p>
        {model.calculation ? (
          <div className="elterngeld-plan__summary-rows">
            {model.calculation.parentTotals.map((pt) => (
              <div key={pt.label} className="elterngeld-plan__summary-row">
                <span className="elterngeld-plan__summary-label">{pt.label}</span>
                <span className="elterngeld-plan__summary-value">{formatCurrency(pt.total)}</span>
              </div>
            ))}
            <div className="elterngeld-plan__summary-row">
              <span className="elterngeld-plan__summary-label">Haushalt gesamt (Schätzung)</span>
              <span className="elterngeld-plan__summary-value">
                {formatCurrency(model.calculation.householdTotal)}
              </span>
            </div>
          </div>
        ) : (
          <div className="elterngeld-step__notice elterngeld-step__notice--tip">
            <p className="elterngeld-summary__hint-text">{CALCULATION_UNAVAILABLE_TITLE}</p>
            <p className="elterngeld-step__hint">{CALCULATION_UNAVAILABLE_BODY}</p>
          </div>
        )}
      </Card>

      <Card className="still-daily-checklist__card">
        <h4 className="elterngeld-step__section-title">{SECTION_C_TITLE}</h4>
        <p className="elterngeld-step__hint elterngeld-summary__forms-hint">{APPLICATION_FORM_SECTION_C_TEXT}</p>
      </Card>

      <Card className="still-daily-checklist__card">
        <h4 className="elterngeld-step__section-title">{SECTION_D_TITLE}</h4>
        <p className="elterngeld-step__hint elterngeld-summary__forms-hint elterngeld-summary__hint-text">
          {SECTION_D_MISSING_HEADING}
        </p>
        <ul className="elterngeld-step__doc-list">
          {SECTION_D_MISSING_CATEGORIES.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </Card>

      <Card className="still-daily-checklist__card">
        <h4 className="elterngeld-step__section-title">{SECTION_E_TITLE}</h4>
        <ul className="elterngeld-step__doc-list">
          {SECTION_E_LINES.map((line) => (
            <li key={line}>
              <strong>{line}</strong>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="still-daily-checklist__card">
        <h4 className="elterngeld-step__section-title">{SECTION_ANHANG_TITLE}</h4>
        <p className="elterngeld-step__section-title elterngeld-step__section-title--nested">{ANHANG_CHECKLIST_TITLE}</p>
        <p className="elterngeld-step__hint elterngeld-summary__forms-hint">{ANHANG_CHECKLIST_INTRO}</p>
        <ul className="elterngeld-step__doc-list elterngeld-step__doc-list--checklist">
          {model.checklistItems.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
        {(model.deadlines.deadlineLabel?.trim() || model.deadlines.noticeText?.trim()) && (
          <>
            <p className="elterngeld-step__section-title elterngeld-step__section-title--nested">
              {ANHANG_DEADLINES_TITLE}
            </p>
            <div className="elterngeld-step__hint elterngeld-documents__deadlines">
              {model.deadlines.deadlineLabel?.trim() ? <p>{model.deadlines.deadlineLabel.trim()}</p> : null}
              {model.deadlines.noticeText?.trim() ? <p>{model.deadlines.noticeText.trim()}</p> : null}
            </div>
          </>
        )}
      </Card>
    </>
  );
};
