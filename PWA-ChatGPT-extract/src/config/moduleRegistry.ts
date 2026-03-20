import type { ComponentType } from 'react';
import type { ScreenAction } from '../core/screenConfig';
import { getActiveModules } from '../core/modules/moduleHost';
import type { PwaFactoryModule } from '../core/contracts/moduleContract';


export interface ModuleDefinition {
  id: string;
  labelKey: string;
  routeBase: string;
  hasHomeWidget: boolean;
  hasSettings: boolean;
  settingsRoute?: string;
  component: ComponentType;
  headerActions?: {
    primaryActions?: ScreenAction[];
    menuActions?: ScreenAction[];
  };
}

/**
 * Deprecated – use assembly/moduleHost instead.
 * Kept for backward compatibility with legacy imports.
 */
export const moduleRegistry: ModuleDefinition[] = [];

export const moduleRegistryCompat = (): PwaFactoryModule[] => getActiveModules();


