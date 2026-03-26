import { describe, it, expect } from 'vitest';
import { resolveBundeslandForDocuments } from './elterngeldBundeslandRegistry';
import { ELTERNGELD_APPLICATION_PDF_OUTPUT_KIND } from '../documentModel/elterngeldOutputKindConstants';

describe('resolveBundeslandForDocuments', () => {
  it('Bayern: bekannt, generisches Profil, keine NRW-documentOutputKinds', () => {
    const r = resolveBundeslandForDocuments('BY');
    expect(r.displayName).toBe('Bayern');
    expect(r.isKnownBundesland).toBe(true);
    expect(r.tier).toBe('generic');
    expect(r.documentOutputKinds).toEqual([]);
  });

  it('Nordrhein-Westfalen: NRW-Profil inkl. Kennzeichnung application_pdf', () => {
    const r = resolveBundeslandForDocuments('NW');
    expect(r.isKnownBundesland).toBe(true);
    expect(r.tier).toBe('nrw');
    expect(r.documentOutputKinds).toContain(ELTERNGELD_APPLICATION_PDF_OUTPUT_KIND);
  });

  it('unbekannter Code: generisch, kein NRW-Fallback', () => {
    const r = resolveBundeslandForDocuments('ZZ');
    expect(r.isKnownBundesland).toBe(false);
    expect(r.displayName).toBe('ZZ');
    expect(r.tier).toBe('generic');
    expect(r.documentOutputKinds).toEqual([]);
  });

  it('leer: Platzhalter-Anzeige, generisch', () => {
    const r = resolveBundeslandForDocuments('');
    expect(r.stateCode).toBe('');
    expect(r.displayName).toBe('–');
    expect(r.isKnownBundesland).toBe(false);
    expect(r.documentOutputKinds).toEqual([]);
  });
});
