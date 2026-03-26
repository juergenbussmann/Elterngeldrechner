import { describe, it, expect } from 'vitest';
import { buildElterngeldDocumentModel } from './buildElterngeldDocumentModel';
import { INITIAL_ELTERNGELD_APPLICATION } from '../types/elterngeldTypes';

/**
 * Reihenfolge der Ausfüllhilfe-Blöcke folgt der Formularfamilie (Profil), nicht mehr nur der NW-Registry.
 */
describe('Abschnitt A: Reihenfolge aus Formularprofil', () => {
  it('Niedersachsen (1–13): Bundesland, 1., 2., Elternzeit, 10. — 7. Einkommen nur bei Daten', () => {
    const model = buildElterngeldDocumentModel({
      ...INITIAL_ELTERNGELD_APPLICATION,
      state: 'NI',
    });
    const subs = model.formSections.find((s) => s.sectionCode === 'A')!.subsections;
    expect(subs[0].subsectionTitle).toBe('Bundesland');
    expect(subs[1].subsectionTitle).toBe('1. Angaben zum Kind');
    expect(subs[2].subsectionTitle).toBe('2. Angaben zu den Eltern');
    expect(subs.map((s) => s.subsectionTitle)).not.toContain('7. Vor der Geburt: Einkommen');
    expect(subs[3].subsectionTitle).toBe('11. Nach der Geburt: Elternzeit');
    expect(subs[4].subsectionTitle).toBe('10. Planung der Elterngeld-Monate');
    expect(subs[5].subsectionTitle).toBe(
      'Weitere Angaben im Antragsformular (ohne App-Erfassung)'
    );
  });

  it('Niedersachsen: mit Einkommen — zusätzlicher Block 7.', () => {
    const model = buildElterngeldDocumentModel({
      ...INITIAL_ELTERNGELD_APPLICATION,
      state: 'NI',
      parentA: {
        ...INITIAL_ELTERNGELD_APPLICATION.parentA,
        incomeBeforeBirth: '3500',
      },
    });
    const titles = model.formSections
      .find((s) => s.sectionCode === 'A')!
      .subsections.map((s) => s.subsectionTitle);
    expect(titles).toEqual([
      'Bundesland',
      '1. Angaben zum Kind',
      '2. Angaben zu den Eltern',
      '7. Vor der Geburt: Einkommen',
      '11. Nach der Geburt: Elternzeit',
      '10. Planung der Elterngeld-Monate',
      'Weitere Angaben im Antragsformular (ohne App-Erfassung)',
    ]);
  });

  it('unbekanntes Bundesland: generische Reihenfolge (Bundesland zuerst)', () => {
    const model = buildElterngeldDocumentModel({
      ...INITIAL_ELTERNGELD_APPLICATION,
      state: 'ZZ',
    });
    const subs = model.formSections.find((s) => s.sectionCode === 'A')!.subsections;
    expect(subs[0].subsectionTitle).toBe('Bundesland');
    expect(subs[1].subsectionTitle).toBe('Kind');
  });
});
