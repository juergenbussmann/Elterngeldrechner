import React from 'react';
import type { PwaFactoryModule } from '../../core/contracts/moduleContract';
import { DocumentsPage } from './ui/DocumentsPage';
import { ParentLeaveFormPage } from './forms/ParentLeaveFormPage';

export const DocumentsModule: PwaFactoryModule = {
  id: 'std.documents',
  displayName: 'documents',
  getRoutes: () => [
    {
      path: '/documents',
      element: <DocumentsPage />,
    },
    {
      path: '/documents/parental-leave',
      element: <ParentLeaveFormPage />,
    },
  ],
};
