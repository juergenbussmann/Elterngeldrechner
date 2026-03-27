import React from 'react';
import type { PanelType } from '../core/panels/PanelHost';
import { ExportPanel } from '../core/export/ui/ExportPanel';
import { CalendarBulkExportResultPanel } from '../core/calendar/ui/CalendarBulkExportResultPanel';
import { PhaseOnboardingPanel } from '../core/phase/ui/PhaseOnboardingPanel';
import { BegleitungPlusUpsellPanel } from '../core/begleitungPlus/ui/BegleitungPlusUpsellPanel';

export type PanelRegistryEntry = {
  id: string;
  type: PanelType;
  component: React.ComponentType<any>;
};

/**
 * Lege registry voor runtime-panels.
 * De infrastructuur blijft intact; app-specifieke panels
 * (bijv. Fit4Seniors) kunnen hier later worden geregistreerd.
 */
export const panelRegistry: PanelRegistryEntry[] = [
  {
    id: 'export',
    type: 'bottom',
    component: ExportPanel,
  },
  {
    id: 'calendar-bulk-export-result',
    type: 'bottom',
    component: CalendarBulkExportResultPanel,
  },
  {
    id: 'phase-onboarding',
    type: 'bottom',
    component: PhaseOnboardingPanel,
  },
  {
    id: 'begleitung-plus-upsell',
    type: 'bottom',
    component: BegleitungPlusUpsellPanel,
  },
];
