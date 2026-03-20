import React from 'react';
import type { PwaFactoryModule } from '../../core/contracts/moduleContract';
import { StillDailyChecklistPage } from './ui/StillDailyChecklistPage';

export const StillDailyChecklistModule: PwaFactoryModule = {
  id: 'std.stillDailyChecklist',
  displayName: 'stillDailyChecklist',
  getRoutes: () => [
    {
      path: '/checklist/still-daily',
      element: <StillDailyChecklistPage />,
    },
  ],
};
