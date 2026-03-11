import React from 'react';
import type { PwaFactoryModule } from '../../core/contracts/moduleContract';
import { DocumentsPage } from './ui/DocumentsPage';

export const DocumentsModule: PwaFactoryModule = {
  id: 'std.documents',
  displayName: 'documents',
  getRoutes: () => [
    {
      path: '/documents',
      element: <DocumentsPage />,
    },
  ],
};
