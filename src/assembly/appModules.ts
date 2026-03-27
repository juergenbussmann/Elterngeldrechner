import type { PwaFactoryModule } from '../core/contracts/moduleContract';
import { ThemePreferencesModule } from '../modules/theme-preferences';
import { DocumentsModule } from '../modules/documents';

/**
 * Application module assembly.
 * Elterngeld-Fokus: nur Theme-Preferences und Dokumente (inkl. Elterngeld-Wizard).
 */
export const APP_MODULES: PwaFactoryModule[] = [ThemePreferencesModule, DocumentsModule];
