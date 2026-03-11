/**
 * Checklisten-Items pro Bereich (Schwangerschaft, Geburt).
 * Stillen nutzt still-daily-checklist mit eigenem Template.
 */

export type ChecklistItemDef = { id: string; labelKey: string; descriptionKey?: string };

export const schwangerschaftItems: readonly ChecklistItemDef[] = [
  { id: 'hebamme', labelKey: 'checklists.items.schwangerschaft.hebamme', descriptionKey: 'checklists.items.schwangerschaft.hebamme.desc' },
  { id: 'kurs', labelKey: 'checklists.items.schwangerschaft.kurs', descriptionKey: 'checklists.items.schwangerschaft.kurs.desc' },
  { id: 'klinik', labelKey: 'checklists.items.schwangerschaft.klinik', descriptionKey: 'checklists.items.schwangerschaft.klinik.desc' },
  { id: 'erstausstattung', labelKey: 'checklists.items.schwangerschaft.erstausstattung', descriptionKey: 'checklists.items.schwangerschaft.erstausstattung.desc' },
];

export const geburtItems: readonly ChecklistItemDef[] = [
  { id: 'ansprechpartner', labelKey: 'checklists.items.geburt.ansprechpartner', descriptionKey: 'checklists.items.geburt.ansprechpartner.desc' },
  { id: 'kliniktasche', labelKey: 'checklists.items.geburt.kliniktasche', descriptionKey: 'checklists.items.geburt.kliniktasche.desc' },
  { id: 'geburtsplan', labelKey: 'checklists.items.geburt.geburtsplan', descriptionKey: 'checklists.items.geburt.geburtsplan.desc' },
  { id: 'dokumente', labelKey: 'checklists.items.geburt.dokumente', descriptionKey: 'checklists.items.geburt.dokumente.desc' },
  { id: 'stillinfo', labelKey: 'checklists.items.geburt.stillinfo', descriptionKey: 'checklists.items.geburt.stillinfo.desc' },
];
