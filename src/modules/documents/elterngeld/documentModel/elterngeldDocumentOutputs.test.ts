import { describe, it, expect } from 'vitest';
import { getElterngeldDocumentOutputRows } from './elterngeldDocumentOutputs';
import type { ElterngeldDocumentModel } from './buildElterngeldDocumentModel';
import { buildElterngeldDocumentModel } from './buildElterngeldDocumentModel';
import { INITIAL_ELTERNGELD_APPLICATION } from '../types/elterngeldTypes';
import { ELTERNGELD_APPLICATION_PDF_OUTPUT_KIND } from './elterngeldOutputKindConstants';

function minimalModel(overrides: Partial<ElterngeldDocumentModel>): ElterngeldDocumentModel {
  return {
    stateCode: 'NW',
    stateDisplayName: 'Nordrhein-Westfalen',
    applicantMode: 'single_applicant',
    parentA: {
      firstName: '',
      lastName: '',
      employmentType: 'employed',
      incomeBeforeBirth: '',
      plannedPartTime: false,
    },
    parentB: null,
    child: { birthDate: '', expectedBirthDate: '', multipleBirth: false },
    benefitPlan: {
      model: 'basis',
      parentAMonths: '',
      parentBMonths: '',
      partnershipBonus: false,
    },
    deadlines: { noticeText: 'Tipp', noticeLevel: 'tip' },
    checklistItems: ['A', 'B'],
    documentOutputKinds: [],
    stateNotes: undefined,
    calculation: null,
    ...overrides,
  };
}

describe('getElterngeldDocumentOutputRows', () => {
  it('enthält Zusammenfassung-PDF und Checkliste als verfügbar', () => {
    const rows = getElterngeldDocumentOutputRows(minimalModel({}));
    const pdf = rows.find((r) => r.id === 'output-summary-pdf');
    const cl = rows.find((r) => r.id === 'output-checklist');
    expect(pdf?.status).toBe('available');
    expect(pdf?.action).toBe('summaryPdf');
    expect(cl?.status).toBe('available');
    expect(cl?.action).toBe('scrollChecklist');
  });

  it('ohne documentOutputKinds: Platzhalter für Antragsvorbereitung (PDF)', () => {
    const rows = getElterngeldDocumentOutputRows(minimalModel({ documentOutputKinds: [] }));
    const form = rows.find((r) => r.id === 'output-form-state');
    expect(form).toBeDefined();
    expect(form?.status).toBe('planned');
  });

  it('application_pdf in documentOutputKinds → verfügbar mit Aktion applicationPdf', () => {
    const rows = getElterngeldDocumentOutputRows(
      minimalModel({ documentOutputKinds: [ELTERNGELD_APPLICATION_PDF_OUTPUT_KIND] })
    );
    const appRow = rows.find((r) => r.action === 'applicationPdf');
    expect(appRow).toBeDefined();
    expect(appRow?.title).toBe('Antragsvorbereitung (PDF)');
    expect(appRow?.status).toBe('available');
    expect(rows.some((r) => r.id === 'output-form-state')).toBe(false);
  });

  it('Nordrhein-Westfalen laut stateConfig: Modell enthält application_pdf und Zeile ist verfügbar', () => {
    const model = buildElterngeldDocumentModel({
      ...INITIAL_ELTERNGELD_APPLICATION,
      state: 'NW',
    });
    expect(model.documentOutputKinds).toContain(ELTERNGELD_APPLICATION_PDF_OUTPUT_KIND);
    const rows = getElterngeldDocumentOutputRows(model);
    expect(rows.some((r) => r.action === 'applicationPdf')).toBe(true);
  });

  it('mit documentOutputKinds: je Kind eine geplante Zeile, kein generischer Formular-Platzhalter', () => {
    const rows = getElterngeldDocumentOutputRows(
      minimalModel({ documentOutputKinds: ['landesformular', 'custom_kind'] })
    );
    expect(rows.some((r) => r.id === 'output-form-state')).toBe(false);
    expect(rows.filter((r) => r.id.startsWith('output-kind-')).length).toBe(2);
    expect(rows.some((r) => r.title === 'Landesformular (geplant)')).toBe(true);
    expect(rows.some((r) => r.title === 'Ausgabe (custom_kind)')).toBe(true);
  });

  it('stateNotes → Zeile Hinweise zum Bundesland', () => {
    const rows = getElterngeldDocumentOutputRows(
      minimalModel({ stateNotes: '  Landes-Hinweis  ' })
    );
    const n = rows.find((r) => r.id === 'output-state-notes');
    expect(n?.description).toBe('Landes-Hinweis');
    expect(n?.status).toBe('info');
  });

  it('deadlines aus Modell → Zeile Fristen', () => {
    const rows = getElterngeldDocumentOutputRows(
      minimalModel({
        deadlines: { deadlineLabel: 'Bis X', noticeText: 'Bitte Y' },
      })
    );
    const d = rows.find((r) => r.id === 'output-deadlines');
    expect(d?.description).toContain('Bis X');
    expect(d?.description).toContain('Bitte Y');
  });
});
