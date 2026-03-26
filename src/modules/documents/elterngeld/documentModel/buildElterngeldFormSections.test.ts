import { describe, it, expect } from 'vitest';
import { buildElterngeldDocumentModel } from './buildElterngeldDocumentModel';
import { INITIAL_ELTERNGELD_APPLICATION } from '../types/elterngeldTypes';
import { GENERIC_FORM_LABELS } from '../bundesland/genericFormLabelCatalog';
import { NRW_FORM_SECTION_A_LAYOUT } from '../bundesland/formLayout/states/nrwFormSectionALayout';
import { EMPTY_ELTERNGELD_PARENT } from '../types/elterngeldTypes';

describe('buildElterngeldFormSectionA (über buildElterngeldDocumentModel)', () => {
  it('NRW: Profil nrw_like — Gruppentitel 1.1; Kind-Felder mit NRW-Label-Overrides', () => {
    const model = buildElterngeldDocumentModel({
      ...INITIAL_ELTERNGELD_APPLICATION,
      state: 'NW',
      child: {
        birthDate: '2024-03-15',
        expectedBirthDate: '',
        multipleBirth: false,
      },
    });
    expect(model.bundeslandTier).toBe('nrw');
    const secA = model.formSections.find((s) => s.sectionCode === 'A');
    expect(secA).toBeDefined();
    const kindBlock = secA!.subsections.find((s) =>
      s.subsectionTitle.startsWith('1.1 Angaben zum Kind')
    );
    expect(kindBlock).toBeDefined();
    const birth = kindBlock!.fields.find((f) => f.id === 'childBirthDate');
    expect(birth!.label).toBe(NRW_FORM_SECTION_A_LAYOUT.labelOverrides!.childBirthDate);
    expect(birth!.value).toMatch(/15\.03\.2024/);
    expect(birth!.empty).toBe(false);
  });

  it('BW: gleicher Profiltyp wie NRW — dieselben NRW-Label-Overrides, keine „Kind“-Zwischenüberschrift', () => {
    const model = buildElterngeldDocumentModel({
      ...INITIAL_ELTERNGELD_APPLICATION,
      state: 'BW',
      child: {
        birthDate: '2024-03-15',
        expectedBirthDate: '',
        multipleBirth: false,
      },
    });
    const secA = model.formSections.find((s) => s.sectionCode === 'A');
    const kindBlock = secA!.subsections.find((s) =>
      s.subsectionTitle.startsWith('1.1 Angaben zum Kind')
    );
    const birth = kindBlock!.fields.find((f) => f.id === 'childBirthDate');
    expect(birth!.label).toBe(NRW_FORM_SECTION_A_LAYOUT.labelOverrides!.childBirthDate);
    expect(secA!.subsections.some((s) => s.subsectionTitle === 'Kind')).toBe(false);
  });

  it('Niedersachsen: Einheitlicher 1–13-Typ — keine Dummy-Abschnitte 3/4/12; 7 nur bei Einkommensdaten', () => {
    const model = buildElterngeldDocumentModel({
      ...INITIAL_ELTERNGELD_APPLICATION,
      state: 'NI',
      child: {
        birthDate: '2024-03-15',
        expectedBirthDate: '',
        multipleBirth: false,
      },
    });
    const secA = model.formSections.find((s) => s.sectionCode === 'A');
    const titles = secA!.subsections.map((s) => s.subsectionTitle);
    expect(titles).toEqual([
      'Bundesland',
      '1. Angaben zum Kind',
      '2. Angaben zu den Eltern',
      '11. Nach der Geburt: Elternzeit',
      '10. Planung der Elterngeld-Monate',
    ]);
    expect(titles.some((t) => t.includes('3.'))).toBe(false);
    expect(titles.some((t) => t.includes('4.'))).toBe(false);
    expect(titles.some((t) => t.includes('12.'))).toBe(false);
  });

  it('Berlin: 16er-Typ — Planung unter 11.; Einkommen unter 8 nur bei Daten', () => {
    const model = buildElterngeldDocumentModel({
      ...INITIAL_ELTERNGELD_APPLICATION,
      state: 'BE',
    });
    const secA = model.formSections.find((s) => s.sectionCode === 'A');
    expect(secA!.subsections.map((s) => s.subsectionTitle)).toEqual([
      'Bundesland',
      '1. Angaben zum Kind',
      '2. Angaben zu den Eltern',
      'Nach der Geburt: Elternzeit',
      '11. Planung der Elterngeld-Monate',
    ]);
  });

  it('Berlin: mit Einkommen — Block „8. Vor der Geburt: Einkommen“', () => {
    const model = buildElterngeldDocumentModel({
      ...INITIAL_ELTERNGELD_APPLICATION,
      state: 'BE',
      parentA: {
        ...INITIAL_ELTERNGELD_APPLICATION.parentA,
        incomeBeforeBirth: '4000',
      },
    });
    const titles = model.formSections
      .find((s) => s.sectionCode === 'A')!
      .subsections.map((s) => s.subsectionTitle);
    expect(titles).toContain('8. Vor der Geburt: Einkommen');
  });

  it('Hessen: generische Zwischenüberschriften + 7./11. wo passend', () => {
    const model = buildElterngeldDocumentModel({
      ...INITIAL_ELTERNGELD_APPLICATION,
      state: 'HE',
    });
    const titles = model.formSections
      .find((s) => s.sectionCode === 'A')!
      .subsections.map((s) => s.subsectionTitle);
    expect(titles[0]).toBe('Bundesland');
    expect(titles).toContain('Kind');
    expect(titles).toContain('Antragsteller-Konstellation');
    expect(titles).toContain('Eltern');
    expect(titles).toContain('11. Nach der Geburt: Elternzeit');
    expect(titles).toContain('Bezug (Überblick aus der App)');
    expect(titles).not.toContain('7. Vor der Geburt: Einkommen');
  });

  it('NRW mit zweitem Elternteil: „Formular 3 (Auszug)“ für Eltern-Teil B', () => {
    const model = buildElterngeldDocumentModel({
      ...INITIAL_ELTERNGELD_APPLICATION,
      state: 'NW',
      parentB: {
        ...EMPTY_ELTERNGELD_PARENT,
        firstName: 'B',
        lastName: 'Elternteil',
      },
    });
    const titles = model.formSections
      .find((s) => s.sectionCode === 'A')!
      .subsections.map((s) => s.subsectionTitle);
    expect(titles).toContain('Formular 3 (Auszug): zweiter Elternteil');
  });

  it('Bayern / generic: klassische Zwischenüberschrift „Eltern“', () => {
    const model = buildElterngeldDocumentModel({
      ...INITIAL_ELTERNGELD_APPLICATION,
      state: 'BY',
      child: {
        birthDate: '2024-03-15',
        expectedBirthDate: '',
        multipleBirth: false,
      },
    });
    expect(model.bundeslandTier).toBe('generic');
    const secA = model.formSections.find((s) => s.sectionCode === 'A');
    const kind = secA!.subsections.find((s) => s.subsectionTitle === 'Kind');
    const birth = kind!.fields.find((f) => f.id === 'childBirthDate');
    expect(birth!.label).toBe(GENERIC_FORM_LABELS.childBirthDate);
    expect(birth!.label).not.toBe(NRW_FORM_SECTION_A_LAYOUT.labelOverrides!.childBirthDate);
    expect(secA!.subsections.some((s) => s.subsectionTitle.startsWith('1.1'))).toBe(false);
  });

  it('leere Werte: Feld sichtbar, value leer, empty true', () => {
    const model = buildElterngeldDocumentModel({
      ...INITIAL_ELTERNGELD_APPLICATION,
      state: 'NW',
      parentA: {
        ...INITIAL_ELTERNGELD_APPLICATION.parentA,
        incomeBeforeBirth: '',
      },
    });
    const secA = model.formSections.find((s) => s.sectionCode === 'A');
    const eltern = secA!.subsections.find((s) =>
      s.subsectionTitle.startsWith('1.2 Angaben zu beiden Elternteilen')
    );
    const inc = eltern!.fields.find((f) => f.id === 'parentAIncomeBeforeBirth');
    expect(inc!.value).toBe('');
    expect(inc!.empty).toBe(true);
  });
});
