import { describe, it, expect } from 'vitest';
import { getFormProfileSubsectionGroups } from './getFormProfileSubsectionGroups';
import { NRW_LIKE_FORM_PROFILE_SUBSECTION_GROUPS } from './nrwFormProfileGroups';
import { ONE_TO_THIRTEEN_FORM_PROFILE_SUBSECTION_GROUPS } from './oneToThirteenFormProfileGroups';
import { SIXTEEN_FORM_PROFILE_SUBSECTION_GROUPS } from './sixteenFormProfileGroups';
import { GENERIC_FORM_PROFILE_SUBSECTION_GROUPS } from './genericFormProfileGroups';

describe('getFormProfileSubsectionGroups', () => {
  it('nrw_like: Formular-1-Unterpunkte 1.1–1.3 + Bundesland', () => {
    const g = getFormProfileSubsectionGroups('nrw_like');
    expect(g).toEqual(NRW_LIKE_FORM_PROFILE_SUBSECTION_GROUPS);
    expect(g[1].displayTitle).toMatch(/^1\.1 Angaben zum Kind/);
    expect(g[2].displayTitle).toMatch(/^1\.2 Angaben zu beiden Elternteilen/);
    expect(g[3].displayTitle).toMatch(/^1\.3 Angabe der Monate/);
  });

  it('one_to_thirteen: Abschnitte 1, 2, 10 + Bundesland', () => {
    const g = getFormProfileSubsectionGroups('one_to_thirteen');
    expect(g).toEqual(ONE_TO_THIRTEEN_FORM_PROFILE_SUBSECTION_GROUPS);
    expect(g.map((x) => x.displayTitle)).toEqual([
      'Bundesland',
      '1. Angaben zum Kind',
      '2. Angaben zu den Eltern',
      '10. Planung der Elterngeld-Monate',
    ]);
  });

  it('sixteen: Planung unter 11.', () => {
    const g = getFormProfileSubsectionGroups('sixteen');
    expect(g).toEqual(SIXTEEN_FORM_PROFILE_SUBSECTION_GROUPS);
    expect(g[3].displayTitle).toBe('11. Planung der Elterngeld-Monate');
  });

  it('generic entspricht GENERIC_FORM_PROFILE_SUBSECTION_GROUPS', () => {
    expect(getFormProfileSubsectionGroups('generic')).toEqual(GENERIC_FORM_PROFILE_SUBSECTION_GROUPS);
  });

  it('hessen nutzt die gleiche Gruppenliste wie generic', () => {
    expect(getFormProfileSubsectionGroups('hessen')).toEqual(GENERIC_FORM_PROFILE_SUBSECTION_GROUPS);
  });
});
