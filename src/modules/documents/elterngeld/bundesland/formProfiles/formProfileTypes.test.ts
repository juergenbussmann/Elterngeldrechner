import { describe, it, expect } from 'vitest';
import {
  getFormularProfil,
  listStateCodesForFormularProfil,
  type FormularProfil,
} from './formProfileTypes';

const EXPECTED: Record<string, FormularProfil> = {
  NW: 'nrw_like',
  BW: 'nrw_like',
  NI: 'one_to_thirteen',
  RP: 'one_to_thirteen',
  ST: 'one_to_thirteen',
  SH: 'one_to_thirteen',
  HH: 'one_to_thirteen',
  HB: 'one_to_thirteen',
  BE: 'sixteen',
  SN: 'sixteen',
  HE: 'hessen',
  BY: 'generic',
  BB: 'generic',
  MV: 'generic',
  SL: 'generic',
  TH: 'generic',
};

describe('getFormularProfil', () => {
  it('ordnet alle 16 Bundesländer den dokumentierten Familien zu', () => {
    for (const [code, profil] of Object.entries(EXPECTED)) {
      expect(getFormularProfil(code)).toBe(profil);
    }
  });

  it('unbekannter Code → generic', () => {
    expect(getFormularProfil('ZZ')).toBe('generic');
    expect(getFormularProfil(undefined)).toBe('generic');
    expect(getFormularProfil('')).toBe('generic');
  });

  it('listStateCodesForFormularProfil ist konsistent mit Einzelauflösung', () => {
    const profiles: FormularProfil[] = [
      'nrw_like',
      'one_to_thirteen',
      'sixteen',
      'hessen',
      'generic',
    ];
    for (const p of profiles) {
      const codes = listStateCodesForFormularProfil(p);
      for (const c of codes) {
        expect(getFormularProfil(c)).toBe(p);
      }
    }
  });
});
