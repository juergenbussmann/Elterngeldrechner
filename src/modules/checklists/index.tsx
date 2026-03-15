import React from 'react';
import type { PwaFactoryModule } from '../../core/contracts/moduleContract';
import { ChecklistsScreen } from './ChecklistsScreen';
import { ChecklistsPregnancyPage } from './pages/ChecklistsPregnancyPage';
import { ChecklistErstausstattungPage } from './pages/ChecklistErstausstattungPage';
import { ChecklistsBirthPage } from './pages/ChecklistsBirthPage';
import { ChecklistsBreastfeedingPage } from './pages/ChecklistsBreastfeedingPage';
import { ChecklistNewPage } from './pages/ChecklistNewPage';
import { ChecklistDetailPage } from './pages/ChecklistDetailPage';
import { PhaseTrackerSettingsSection } from '../../core/phase/ui/PhaseTrackerSettingsSection';

export const ChecklistsModule: PwaFactoryModule = {
  id: 'std.checklists',
  displayName: 'checklists',
  getSettings: () => ({
    sections: [
      {
        id: 'phase-tracker',
        title: 'Wochen-Begleitung',
        element: <PhaseTrackerSettingsSection />,
      },
    ],
  }),
  getRoutes: () => [
    {
      path: '/checklists',
      element: <ChecklistsScreen />,
    },
    {
      path: '/checklists/new',
      element: <ChecklistNewPage />,
    },
    {
      path: '/checklists/meine/:id',
      element: <ChecklistDetailPage />,
    },
    {
      path: '/checklists/schwangerschaft',
      element: <ChecklistsPregnancyPage />,
    },
    {
      path: '/checklists/schwangerschaft/erstausstattung-neugeborenes',
      element: <ChecklistErstausstattungPage />,
    },
    {
      path: '/checklists/geburt',
      element: <ChecklistsBirthPage />,
    },
    {
      path: '/checklists/stillen',
      element: <ChecklistsBreastfeedingPage />,
    },
  ],
};
