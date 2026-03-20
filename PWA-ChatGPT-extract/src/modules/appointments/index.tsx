import React from 'react';
import type { PwaFactoryModule } from '../../core/contracts/moduleContract';
import { AppointmentsPage } from './ui/AppointmentsPage';
import { AppointmentFormScreen } from './ui/AppointmentFormScreen';
import { UCheckFormScreen } from './ui/UCheckFormScreen';

export const AppointmentsModule: PwaFactoryModule = {
  id: 'std.appointments',
  displayName: 'appointments',
  getRoutes: () => [
    { path: '/appointments', element: <AppointmentsPage /> },
    { path: '/appointments/new', element: <AppointmentFormScreen /> },
    { path: '/appointments/edit/:id', element: <AppointmentFormScreen /> },
    { path: '/appointments/uchecks/new', element: <UCheckFormScreen /> },
  ],
};

