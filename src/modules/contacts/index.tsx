import React from 'react';
import type { PwaFactoryModule } from '../../core/contracts/moduleContract';
import { ContactsPage } from './ui/ContactsPage';
import { ContactFormScreen } from './ui/ContactFormScreen';

export const ContactsModule: PwaFactoryModule = {
  id: 'std.contacts',
  displayName: 'contacts',
  getRoutes: () => [
    { path: '/contacts', element: <ContactsPage /> },
    { path: '/contacts/new', element: <ContactFormScreen /> },
    { path: '/contacts/edit/:id', element: <ContactFormScreen /> },
  ],
};
