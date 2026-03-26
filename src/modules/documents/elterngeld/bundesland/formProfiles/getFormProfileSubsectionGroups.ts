import type { FormularProfil, FormProfileSubsectionGroup } from './formProfileTypes';
import { GENERIC_FORM_PROFILE_SUBSECTION_GROUPS } from './genericFormProfileGroups';
import { HESSEN_FORM_PROFILE_SUBSECTION_GROUPS } from './hessenFormProfileGroups';
import { NRW_LIKE_FORM_PROFILE_SUBSECTION_GROUPS } from './nrwFormProfileGroups';
import { ONE_TO_THIRTEEN_FORM_PROFILE_SUBSECTION_GROUPS } from './oneToThirteenFormProfileGroups';
import { SIXTEEN_FORM_PROFILE_SUBSECTION_GROUPS } from './sixteenFormProfileGroups';

export function getFormProfileSubsectionGroups(
  profil: FormularProfil
): readonly FormProfileSubsectionGroup[] {
  switch (profil) {
    case 'nrw_like':
      return NRW_LIKE_FORM_PROFILE_SUBSECTION_GROUPS;
    case 'one_to_thirteen':
      return ONE_TO_THIRTEEN_FORM_PROFILE_SUBSECTION_GROUPS;
    case 'sixteen':
      return SIXTEEN_FORM_PROFILE_SUBSECTION_GROUPS;
    case 'hessen':
      return HESSEN_FORM_PROFILE_SUBSECTION_GROUPS;
    case 'generic':
    default:
      return GENERIC_FORM_PROFILE_SUBSECTION_GROUPS;
  }
}
