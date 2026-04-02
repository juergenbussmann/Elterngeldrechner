import { describe, it, expect } from 'vitest';
import { buildElterngeldDocumentModel } from './buildElterngeldDocumentModel';
import { INITIAL_ELTERNGELD_APPLICATION } from '../types/elterngeldTypes';
import { GENERIC_FORM_LABELS } from '../bundesland/genericFormLabelCatalog';
import { NRW_FORM_SECTION_A_LAYOUT } from '../bundesland/formLayout/states/nrwFormSectionALayout';
import { ONE_TO_THIRTEEN_FORM_SECTION_A_LAYOUT } from '../bundesland/formLayout/states/oneToThirteenFormSectionALayout';
import { EMPTY_ELTERNGELD_PARENT } from '../types/elterngeldTypes';
import { resolveFormFieldLabel } from '../bundesland/resolveFormFieldLabel';
import { GENERIC_FORM_FIELD_HINTS, resolveFormFieldHint } from '../bundesland/formFieldHints';
import {
  SUBSECTION_TITLE_OFFICIAL_FORM_ONLY_FIELDS,
  getOfficialFormOnlyFieldDefs,
} from '../bundesland/formProfiles/officialFormOnlyFields';

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
    const birth = kindBlock!.fields.find((f) => f.source === 'app' && f.id === 'childBirthDate');
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
    const birth = kindBlock!.fields.find((f) => f.source === 'app' && f.id === 'childBirthDate');
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

  it('Niedersachsen (1–13): Antragsteller-Label wie in Profildoku („Wer stellt den Antrag?“)', () => {
    const model = buildElterngeldDocumentModel({
      ...INITIAL_ELTERNGELD_APPLICATION,
      state: 'NI',
    });
    const secA = model.formSections.find((s) => s.sectionCode === 'A');
    const elternBlock = secA!.subsections.find((s) => s.subsectionTitle === '2. Angaben zu den Eltern');
    const applicant = elternBlock!.fields.find(
      (f) => f.source === 'app' && f.id === 'applicantConstellation'
    );
    expect(applicant?.label).toBe(
      ONE_TO_THIRTEEN_FORM_SECTION_A_LAYOUT.labelOverrides!.applicantConstellation
    );
  });

  it('Bayern (generic): kein 1–13-Label-Override für Antragsteller', () => {
    const model = buildElterngeldDocumentModel({
      ...INITIAL_ELTERNGELD_APPLICATION,
      state: 'BY',
    });
    const secA = model.formSections.find((s) => s.sectionCode === 'A');
    const antragBlock = secA!.subsections.find((s) => s.subsectionTitle === 'Antragsteller-Konstellation');
    const applicant = antragBlock!.fields.find(
      (f) => f.source === 'app' && f.id === 'applicantConstellation'
    );
    expect(applicant?.label).toBe(GENERIC_FORM_LABELS.applicantConstellation);
  });

  it('Berlin (sixteen): weiterhin generisches Antragsteller-Label (kein 1–13-Layout)', () => {
    expect(resolveFormFieldLabel('applicantConstellation', 'BE')).toBe(
      GENERIC_FORM_LABELS.applicantConstellation
    );
  });

  it('NRW/BW: Antragsteller weiterhin generischer Katalog (kein NRW-Override)', () => {
    expect(resolveFormFieldLabel('applicantConstellation', 'NW')).toBe(
      GENERIC_FORM_LABELS.applicantConstellation
    );
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
    const birth = kind!.fields.find((f) => f.source === 'app' && f.id === 'childBirthDate');
    expect(birth!.label).toBe(GENERIC_FORM_LABELS.childBirthDate);
    expect(birth!.label).not.toBe(NRW_FORM_SECTION_A_LAYOUT.labelOverrides!.childBirthDate);
    expect(secA!.subsections.some((s) => s.subsectionTitle.startsWith('1.1'))).toBe(false);
  });

  it('leere Werte: Feld sichtbar, value leer, empty true, Hint aus Mapping', () => {
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
    const inc = eltern!.fields.find(
      (f) => f.source === 'app' && f.id === 'parentAIncomeBeforeBirth'
    );
    expect(inc!.value).toBe('');
    expect(inc!.empty).toBe(true);
    expect(inc!.hint).toBe(GENERIC_FORM_FIELD_HINTS.parentAIncomeBeforeBirth);
    expect(inc!.label).toBe(GENERIC_FORM_LABELS.parentAIncomeBeforeBirth);
  });

  it('gefülltes Feld: kein Hint', () => {
    const model = buildElterngeldDocumentModel({
      ...INITIAL_ELTERNGELD_APPLICATION,
      state: 'NW',
      parentA: {
        ...INITIAL_ELTERNGELD_APPLICATION.parentA,
        incomeBeforeBirth: '3000',
      },
    });
    const secA = model.formSections.find((s) => s.sectionCode === 'A');
    const eltern = secA!.subsections.find((s) =>
      s.subsectionTitle.startsWith('1.2 Angaben zu beiden Elternteilen')
    );
    const inc = eltern!.fields.find(
      (f) => f.source === 'app' && f.id === 'parentAIncomeBeforeBirth'
    );
    expect(inc!.empty).toBe(false);
    expect(inc!.hint).toBeNull();
  });

  it('NRW: leeres Kind-Geburtsdatum — Hint aus NRW-Layout (nicht generisch)', () => {
    const model = buildElterngeldDocumentModel({
      ...INITIAL_ELTERNGELD_APPLICATION,
      state: 'NW',
      child: { birthDate: '', expectedBirthDate: '', multipleBirth: false },
    });
    const kindBlock = model.formSections
      .find((s) => s.sectionCode === 'A')!
      .subsections.find((s) => s.subsectionTitle.startsWith('1.1'))!;
    const birth = kindBlock.fields.find((f) => f.source === 'app' && f.id === 'childBirthDate')!;
    expect(birth.empty).toBe(true);
    expect(birth.hint).toBe(NRW_FORM_SECTION_A_LAYOUT.hintOverrides!.childBirthDate);
    expect(birth.hint).not.toBe(GENERIC_FORM_FIELD_HINTS.childBirthDate);
  });

  it('resolveFormFieldHint: 1–13-Profil (NI) nutzt Antragsteller-Override, sixteen (BE) generisch', () => {
    expect(resolveFormFieldHint('applicantConstellation', 'NI')).toBe(
      ONE_TO_THIRTEEN_FORM_SECTION_A_LAYOUT.hintOverrides!.applicantConstellation
    );
    expect(resolveFormFieldHint('applicantConstellation', 'BE')).toBe(
      GENERIC_FORM_FIELD_HINTS.applicantConstellation
    );
  });

  it('Abschluss: formularsichere Zusatzfelder (Bank, Steuer-ID) ohne App-Wert, mit Hint', () => {
    const model = buildElterngeldDocumentModel({
      ...INITIAL_ELTERNGELD_APPLICATION,
      state: 'NI',
    });
    const officialBlock = model.mainDocumentFlow.find((b) => b.kind === 'official_form_only');
    expect(officialBlock).toBeDefined();
    const officialSub = officialBlock!.subsection;
    expect(officialSub.fields).toHaveLength(getOfficialFormOnlyFieldDefs('one_to_thirteen').length);
    const bank = officialSub.fields.find((f) => f.source === 'official_form_only' && f.displayKey === 'official_bank_iban')!;
    expect(bank.value).toBe('');
    expect(bank.empty).toBe(true);
    expect(bank.hint).toContain('Bankverbindung');
    expect(bank.hint).toMatch(/IBAN/i);
    const tax = officialSub.fields.find((f) => f.source === 'official_form_only' && f.displayKey === 'official_tax_identification')!;
    expect(tax.label).toBe('Steuer-Identifikationsnummer');
  });

  it('kein Duplikat: reine Formularfelder haben keine App-id', () => {
    const model = buildElterngeldDocumentModel({ ...INITIAL_ELTERNGELD_APPLICATION, state: 'NW' });
    const secA = model.formSections.find((s) => s.sectionCode === 'A')!;
    const officialCount = model.mainDocumentFlow
      .filter((b) => b.kind === 'official_form_only')
      .flatMap((b) => b.subsection.fields)
      .filter((f) => f.source === 'official_form_only').length;
    expect(officialCount).toBe(getOfficialFormOnlyFieldDefs('nrw_like').length);
  });
});
