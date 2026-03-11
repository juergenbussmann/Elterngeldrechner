import React from 'react';
import type { PwaFactoryModule } from '../../core/contracts/moduleContract';
import { NotesPage } from './ui/NotesPage';

export const NotesModule: PwaFactoryModule = {
  id: 'std.notes',
  displayName: 'notes',
  getRoutes: () => [
    {
      path: '/notes',
      element: <NotesPage />,
    },
  ],
};
