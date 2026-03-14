import React from 'react';
import type { PwaFactoryModule } from '../../core/contracts/moduleContract';
import { DocumentsPage } from './ui/DocumentsPage';
import { DocumentsFamilyOverviewPage } from './ui/DocumentsFamilyOverviewPage';
import { ParentLeaveFormPage } from './forms/ParentLeaveFormPage';
import { ElterngeldWizardPage } from './elterngeld/ElterngeldWizardPage';

export const DocumentsModule: PwaFactoryModule = {
  id: 'std.documents',
  displayName: 'documents',
  getRoutes: () => [
    {
      path: '/documents',
      element: <DocumentsFamilyOverviewPage />,
    },
    {
      path: '/documents/list',
      element: <DocumentsPage />,
    },
    {
      path: '/documents/parental-leave',
      element: <ParentLeaveFormPage />,
    },
    {
      path: '/documents/elterngeld',
      element: <ElterngeldWizardPage />,
    },
  ],
};
