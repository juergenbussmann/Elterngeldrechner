/**
 * Baut Abschnitt A der Ausfüllhilfe als gemappte Felder (nur Darstellung, keine neuen Daten).
 * Formularfamilie aus Bundesland; feingliedrige Blöcke nur, wo App-Daten eindeutig passen
 * (keine leeren Pflicht-Abschnitte, keine neuen Feld-IDs).
 */

import type { ElterngeldApplication } from '../types/elterngeldTypes';
import type { ResolvedBundeslandForDocuments } from '../bundesland/elterngeldBundeslandRegistry';
import { formatDateGerman, parseIsoDate } from '../elterngeldDeadlines';
import {
  formatApplicantMode,
  formatBenefitModel,
  formatEmploymentType,
  SECTION_A_TITLE,
} from '../applicationForm/elterngeldApplicationFormLabels';
import { resolveFormFieldLabel } from '../bundesland/resolveFormFieldLabel';
import type { ElterngeldFormFieldId } from '../bundesland/elterngeldFormFieldIds';
import type { FormSubsectionKey } from '../bundesland/formLayout/formSubsectionKeys';
import { getBundeslandFormSectionALayout } from '../bundesland/formLayout/bundeslandFormLayoutRegistry';
import type { BundeslandFormSectionALayout } from '../bundesland/formLayout/bundeslandFormLayoutTypes';
import { getFormularProfil, type FormularProfil } from '../bundesland/formProfiles/formProfileTypes';
import { getFormProfileSubsectionGroups } from '../bundesland/formProfiles/getFormProfileSubsectionGroups';
import {
  DEFAULT_FORM_SUBSECTION_TITLES,
} from '../bundesland/formLayout/genericFormSectionADefaults';
import type {
  ElterngeldDocumentFormField,
  ElterngeldDocumentFormSection,
  ElterngeldDocumentFormSubsection,
} from './elterngeldDocumentFormTypes';

/** Titel aus einheitlichem Antrag (1–13) — NI/RLP/ST u. a.; Abschnitt 3/4/12 ohne passende App-Felder: nicht ausgespielt. */
const TITLE_1_KIND = '1. Angaben zum Kind';
const TITLE_2_ELTERN = '2. Angaben zu den Eltern';
const TITLE_7_EINKOMMEN_VOR_GEBURT = '7. Vor der Geburt: Einkommen';
const TITLE_10_PLANUNG = '10. Planung der Elterngeld-Monate';
const TITLE_11_ELTERNZEIT = '11. Nach der Geburt: Elternzeit';

/** 16-Abschnitte-Variante (BE/SN): v.a. andere Nummer für Planung und Einkommen vor Geburt (Recherche-PDF SN 04/2024). */
const TITLE_8_EINKOMMEN_VOR_GEBURT = '8. Vor der Geburt: Einkommen';
const TITLE_11_PLANUNG = '11. Planung der Elterngeld-Monate';
/** Ohne Nummer: im 16er-PDF kollidiert „11.“ mit der Planung — nur neutraler Formulierungsanker. */
const TITLE_ELTERNZEIT_NEUTRAL = 'Nach der Geburt: Elternzeit';

const TITLE_NRW_11_KIND = '1.1 Angaben zum Kind, für das Elterngeld beantragt wird';
const TITLE_NRW_12_ELTERN = '1.2 Angaben zu beiden Elternteilen';
const TITLE_NRW_13_MONATE =
  '1.3 Angabe der Monate, für die Elterngeld beantragt wird (Bezugszeitraum)';
const TITLE_NRW_FORM3_AUSZUG = 'Formular 3 (Auszug): zweiter Elternteil';

function partTimeValue(planned: boolean, hours: number | undefined): { value: string; empty: boolean } {
  if (!planned) return { value: 'Nein', empty: false };
  if (hours != null) return { value: `${hours} h/Woche`, empty: false };
  return { value: 'Ja, Stunden nicht angegeben', empty: false };
}

function field(
  id: ElterngeldFormFieldId,
  stateCode: string | undefined,
  value: string,
  empty: boolean
): ElterngeldDocumentFormField {
  return { id, label: resolveFormFieldLabel(id, stateCode), value, empty };
}

type SubsectionDraft = ElterngeldDocumentFormSubsection;

function sortFieldsByLayout(
  fields: ElterngeldDocumentFormField[],
  key: FormSubsectionKey,
  layout: BundeslandFormSectionALayout | undefined
): ElterngeldDocumentFormField[] {
  const order = layout?.fieldOrder?.[key];
  if (!order?.length) return fields;
  const byId = new Map(fields.map((f) => [f.id, f]));
  const out: ElterngeldDocumentFormField[] = [];
  for (const id of order) {
    const f = byId.get(id);
    if (f) out.push(f);
  }
  for (const f of fields) {
    if (!out.some((x) => x.id === f.id)) out.push(f);
  }
  return out;
}

function pickElternFieldsById(
  elternFields: ElterngeldDocumentFormField[],
  ids: readonly ElterngeldFormFieldId[]
): ElterngeldDocumentFormField[] {
  const byId = new Map(elternFields.map((f) => [f.id, f]));
  const out: ElterngeldDocumentFormField[] = [];
  for (const id of ids) {
    const f = byId.get(id);
    if (f) out.push(f);
  }
  return out;
}

function stammIds(parentB: boolean): readonly ElterngeldFormFieldId[] {
  return parentB
    ? (['parentAName', 'parentAEmployment', 'parentBName', 'parentBEmployment'] as const)
    : (['parentAName', 'parentAEmployment'] as const);
}

function hasIncomeData(values: ElterngeldApplication): boolean {
  return Boolean(
    values.parentA.incomeBeforeBirth?.trim() || values.parentB?.incomeBeforeBirth?.trim()
  );
}

function sub(
  title: string,
  fields: ElterngeldDocumentFormField[],
  sortKey: FormSubsectionKey,
  layout: BundeslandFormSectionALayout | undefined
): ElterngeldDocumentFormSubsection {
  return { subsectionTitle: title, fields: sortFieldsByLayout(fields, sortKey, layout) };
}

export function buildSubsectionsFromProfile(
  byKey: Record<FormSubsectionKey, SubsectionDraft>,
  stateCode: string | undefined
): ElterngeldDocumentFormSubsection[] {
  const layout = getBundeslandFormSectionALayout(stateCode);
  const profil = getFormularProfil(stateCode);
  const groups = getFormProfileSubsectionGroups(profil);

  return groups.map((g) => {
    const fields: ElterngeldDocumentFormField[] = [];
    for (const key of g.keys) {
      const sorted = sortFieldsByLayout([...byKey[key].fields], key, layout);
      fields.push(...sorted);
    }
    return {
      subsectionTitle: g.displayTitle,
      fields,
    };
  });
}

function buildOneToThirteenLikeSubsections(
  values: ElterngeldApplication,
  byKey: Record<FormSubsectionKey, SubsectionDraft>,
  stateCode: string | undefined,
  planungsTitel: string,
  einkommenTitel: string,
  elternzeitTitel: string
): ElterngeldDocumentFormSubsection[] {
  const layout = getBundeslandFormSectionALayout(stateCode);
  const elternAll = byKey.eltern.fields;
  const parentB = !!values.parentB;
  const stamm = pickElternFieldsById(elternAll, [...stammIds(parentB)]);
  const einkommen = pickElternFieldsById(elternAll, [
    'parentAIncomeBeforeBirth',
    ...(parentB ? (['parentBIncomeBeforeBirth'] as const) : []),
  ]);
  const teilzeit = pickElternFieldsById(elternAll, [
    'parentAPartTime',
    ...(parentB ? (['parentBPartTime'] as const) : []),
  ]);

  const out: ElterngeldDocumentFormSubsection[] = [];

  out.push(sub('Bundesland', [...byKey.bundesland.fields], 'bundesland', layout));
  out.push(sub(TITLE_1_KIND, [...byKey.kind.fields], 'kind', layout));

  const sec2Fields = [
    ...sortFieldsByLayout([...byKey.antragstellung.fields], 'antragstellung', layout),
    ...sortFieldsByLayout(stamm, 'eltern', layout),
  ];
  out.push(sub(TITLE_2_ELTERN, sec2Fields, 'eltern', layout));

  if (hasIncomeData(values)) {
    out.push(sub(einkommenTitel, sortFieldsByLayout(einkommen, 'eltern', layout), 'eltern', layout));
  }

  out.push(
    sub(elternzeitTitel, sortFieldsByLayout(teilzeit, 'eltern', layout), 'eltern', layout)
  );
  out.push(sub(planungsTitel, [...byKey.bezug.fields], 'bezug', layout));

  return out;
}

function buildHessenSubsections(
  values: ElterngeldApplication,
  byKey: Record<FormSubsectionKey, SubsectionDraft>,
  stateCode: string | undefined
): ElterngeldDocumentFormSubsection[] {
  const layout = getBundeslandFormSectionALayout(stateCode);
  const elternAll = byKey.eltern.fields;
  const parentB = !!values.parentB;
  const stamm = pickElternFieldsById(elternAll, [...stammIds(parentB)]);
  const einkommen = pickElternFieldsById(elternAll, [
    'parentAIncomeBeforeBirth',
    ...(parentB ? (['parentBIncomeBeforeBirth'] as const) : []),
  ]);
  const teilzeit = pickElternFieldsById(elternAll, [
    'parentAPartTime',
    ...(parentB ? (['parentBPartTime'] as const) : []),
  ]);

  const out: ElterngeldDocumentFormSubsection[] = [];
  out.push(sub('Bundesland', [...byKey.bundesland.fields], 'bundesland', layout));
  out.push(sub(DEFAULT_FORM_SUBSECTION_TITLES.kind, [...byKey.kind.fields], 'kind', layout));
  out.push(
    sub(
      DEFAULT_FORM_SUBSECTION_TITLES.antragstellung,
      [...byKey.antragstellung.fields],
      'antragstellung',
      layout
    )
  );
  out.push(
    sub(DEFAULT_FORM_SUBSECTION_TITLES.eltern, sortFieldsByLayout(stamm, 'eltern', layout), 'eltern', layout)
  );

  if (hasIncomeData(values)) {
    out.push(
      sub(
        TITLE_7_EINKOMMEN_VOR_GEBURT,
        sortFieldsByLayout(einkommen, 'eltern', layout),
        'eltern',
        layout
      )
    );
  }

  out.push(
    sub(
      TITLE_11_ELTERNZEIT,
      sortFieldsByLayout(teilzeit, 'eltern', layout),
      'eltern',
      layout
    )
  );
  out.push(
    sub(
      DEFAULT_FORM_SUBSECTION_TITLES.bezug,
      [...byKey.bezug.fields],
      'bezug',
      layout
    )
  );

  return out;
}

function buildNrwLikeSubsections(
  values: ElterngeldApplication,
  byKey: Record<FormSubsectionKey, SubsectionDraft>,
  stateCode: string | undefined
): ElterngeldDocumentFormSubsection[] {
  const layout = getBundeslandFormSectionALayout(stateCode);
  const elternAll = byKey.eltern.fields;
  const parentB = !!values.parentB;

  const stammA = pickElternFieldsById(elternAll, ['parentAName', 'parentAEmployment']);
  const incA = pickElternFieldsById(elternAll, ['parentAIncomeBeforeBirth']);
  const ptA = pickElternFieldsById(elternAll, ['parentAPartTime']);
  const stammB = pickElternFieldsById(elternAll, ['parentBName', 'parentBEmployment']);
  const incB = pickElternFieldsById(elternAll, ['parentBIncomeBeforeBirth']);
  const ptB = pickElternFieldsById(elternAll, ['parentBPartTime']);

  const out: ElterngeldDocumentFormSubsection[] = [];
  out.push(sub('Bundesland', [...byKey.bundesland.fields], 'bundesland', layout));
  out.push(sub(TITLE_NRW_11_KIND, [...byKey.kind.fields], 'kind', layout));

  if (parentB) {
    const block12 = [
      ...sortFieldsByLayout([...byKey.antragstellung.fields], 'antragstellung', layout),
      ...sortFieldsByLayout(stammA, 'eltern', layout),
      ...sortFieldsByLayout(incA, 'eltern', layout),
      ...sortFieldsByLayout(ptA, 'eltern', layout),
    ];
    out.push(sub(TITLE_NRW_12_ELTERN, block12, 'eltern', layout));

    const blockF3 = [
      ...sortFieldsByLayout(stammB, 'eltern', layout),
      ...sortFieldsByLayout(incB, 'eltern', layout),
      ...sortFieldsByLayout(ptB, 'eltern', layout),
    ];
    out.push(sub(TITLE_NRW_FORM3_AUSZUG, blockF3, 'eltern', layout));
  } else {
    const block12 = [
      ...sortFieldsByLayout([...byKey.antragstellung.fields], 'antragstellung', layout),
      ...sortFieldsByLayout(stammA, 'eltern', layout),
      ...sortFieldsByLayout(incA, 'eltern', layout),
      ...sortFieldsByLayout(ptA, 'eltern', layout),
    ];
    out.push(sub(TITLE_NRW_12_ELTERN, block12, 'eltern', layout));
  }

  out.push(sub(TITLE_NRW_13_MONATE, [...byKey.bezug.fields], 'bezug', layout));
  return out;
}

function buildSubsectionsForProfil(
  profil: FormularProfil,
  values: ElterngeldApplication,
  byKey: Record<FormSubsectionKey, SubsectionDraft>,
  stateCode: string | undefined
): ElterngeldDocumentFormSubsection[] {
  switch (profil) {
    case 'one_to_thirteen':
      return buildOneToThirteenLikeSubsections(
        values,
        byKey,
        stateCode,
        TITLE_10_PLANUNG,
        TITLE_7_EINKOMMEN_VOR_GEBURT,
        TITLE_11_ELTERNZEIT
      );
    case 'sixteen':
      return buildOneToThirteenLikeSubsections(
        values,
        byKey,
        stateCode,
        TITLE_11_PLANUNG,
        TITLE_8_EINKOMMEN_VOR_GEBURT,
        TITLE_ELTERNZEIT_NEUTRAL
      );
    case 'hessen':
      return buildHessenSubsections(values, byKey, stateCode);
    case 'nrw_like':
      return buildNrwLikeSubsections(values, byKey, stateCode);
    case 'generic':
    default:
      return buildSubsectionsFromProfile(byKey, stateCode);
  }
}

export function buildElterngeldFormSectionA(
  values: ElterngeldApplication,
  bl: ResolvedBundeslandForDocuments
): ElterngeldDocumentFormSection {
  const stateCode = bl.stateCode;
  const birthDate = parseIsoDate(values.child.birthDate);
  const birthStr = birthDate ? formatDateGerman(birthDate) : '';
  const expectedDate = parseIsoDate(values.child.expectedBirthDate);
  const expectedStr = expectedDate ? formatDateGerman(expectedDate) : '';
  const nameA = `${values.parentA.firstName} ${values.parentA.lastName}`.trim();

  const byKey: Record<FormSubsectionKey, SubsectionDraft> = {
    bundesland: {
      subsectionTitle: '',
      fields: [
        field('state', stateCode, values.state?.trim() ? bl.displayName : '', !values.state?.trim()),
      ],
    },
    kind: {
      subsectionTitle: '',
      fields: [
        field('childBirthDate', stateCode, birthStr, !birthStr),
        field('childExpectedBirthDate', stateCode, expectedStr, !expectedStr),
        field('childMultipleBirth', stateCode, values.child.multipleBirth ? 'Ja' : 'Nein', false),
      ],
    },
    eltern: {
      subsectionTitle: '',
      fields: [
        field('parentAName', stateCode, nameA, !nameA),
        field('parentAEmployment', stateCode, formatEmploymentType(values.parentA.employmentType), false),
        field(
          'parentAIncomeBeforeBirth',
          stateCode,
          values.parentA.incomeBeforeBirth?.trim() ?? '',
          !values.parentA.incomeBeforeBirth?.trim()
        ),
        ((): ElterngeldDocumentFormField => {
          const pt = partTimeValue(values.parentA.plannedPartTime, values.parentA.hoursPerWeek);
          return field('parentAPartTime', stateCode, pt.value, pt.empty);
        })(),
        ...(values.parentB
          ? ((): ElterngeldDocumentFormField[] => {
              const nameB = `${values.parentB.firstName} ${values.parentB.lastName}`.trim();
              const ptB = partTimeValue(values.parentB.plannedPartTime, values.parentB.hoursPerWeek);
              return [
                field('parentBName', stateCode, nameB, !nameB),
                field('parentBEmployment', stateCode, formatEmploymentType(values.parentB.employmentType), false),
                field(
                  'parentBIncomeBeforeBirth',
                  stateCode,
                  values.parentB.incomeBeforeBirth?.trim() ?? '',
                  !values.parentB.incomeBeforeBirth?.trim()
                ),
                field('parentBPartTime', stateCode, ptB.value, ptB.empty),
              ];
            })()
          : []),
      ],
    },
    antragstellung: {
      subsectionTitle: '',
      fields: [
        field('applicantConstellation', stateCode, formatApplicantMode(values.applicantMode), false),
      ],
    },
    bezug: {
      subsectionTitle: '',
      fields: [
        field('benefitModel', stateCode, formatBenefitModel(values.benefitPlan.model), false),
        field(
          'benefitMonthsA',
          stateCode,
          values.benefitPlan.parentAMonths?.trim() ?? '',
          !values.benefitPlan.parentAMonths?.trim()
        ),
        field(
          'benefitMonthsB',
          stateCode,
          values.benefitPlan.parentBMonths?.trim() ?? '',
          !values.benefitPlan.parentBMonths?.trim()
        ),
        field(
          'partnershipBonus',
          stateCode,
          values.benefitPlan.partnershipBonus ? 'Ja' : 'Nein',
          false
        ),
      ],
    },
  };

  const profil = getFormularProfil(stateCode);
  const subsections = buildSubsectionsForProfil(profil, values, byKey, stateCode);

  return {
    sectionCode: 'A',
    sectionHeading: SECTION_A_TITLE,
    subsections,
  };
}
