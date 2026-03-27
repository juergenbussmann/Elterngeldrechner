import React from 'react';
import type { PanelType } from '../core/panels/PanelHost';
import { TopicsMenuPanel } from '../core/panels/TopicsMenuPanel';
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
    id: 'topicsMenu',
    type: 'left',
    component: TopicsMenuPanel,
  },
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
