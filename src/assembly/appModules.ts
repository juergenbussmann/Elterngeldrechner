import type { PwaFactoryModule } from '../core/contracts/moduleContract';
import { ThemePreferencesModule } from '../modules/theme-preferences';
import { KnowledgeModule } from '../modules/knowledge';
import { ChecklistsModule } from '../modules/checklists';
import { AppointmentsModule } from '../modules/appointments';
import { StillDailyChecklistModule } from '../modules/still-daily-checklist';
import { DocumentsModule } from '../modules/documents';
import { ContactsModule } from '../modules/contacts';
import { NotesModule } from '../modules/notes';

/**
 * Application module assembly.
 * Sprint 1: Language preferences and telemetry consent are not exposed in the UI (DE-only, privacy default OFF).
 */
export const APP_MODULES: PwaFactoryModule[] = [
  ThemePreferencesModule,
  KnowledgeModule,
  ChecklistsModule,
  StillDailyChecklistModule,
  AppointmentsModule,
  DocumentsModule,
  ContactsModule,
  NotesModule,
];

