import React, { useMemo } from 'react';
import type { RouteObject } from 'react-router-dom';
import { Navigate, useRoutes } from 'react-router-dom';
import { getAllRoutes } from '../modules/moduleHost';
import { AppShell } from '../AppShell';
import { Start } from '../../screens/Start';
import { OnboardingDueDateScreen } from '../../screens/OnboardingDueDateScreen';
import { Beratung } from '../../screens/Beratung';
import BegleitungPlusScreen from '../../screens/BegleitungPlusScreen';
import { Demo } from '../../screens/Demo';
import { Testseite } from '../../pages/Testseite';
import { SettingsLayout } from '../settings/SettingsLayout';
import { GlobalSettingsScreen } from '../settings/GlobalSettingsScreen';
import { ModuleSettingsScreen } from '../settings/ModuleSettingsScreen';
import { DeveloperScreen } from '../settings/DeveloperScreen';
import { OfflineScreen } from '../offline/OfflineScreen';
import './AppRoutes.css';

export const AppRoutes: React.FC = () => {
  const moduleRoutes = getAllRoutes();

  const routes = useMemo<RouteObject[]>(() => {
    const normalizedModuleRoutes = moduleRoutes.map((route) => ({
      path: route.path.startsWith('/') ? route.path.slice(1) : route.path,
      element: route.element,
    }));

    return [
      {
        path: '/',
        element: <AppShell />,
        children: [
          { index: true, element: <Start /> },
          { path: 'onboarding/due-date', element: <OnboardingDueDateScreen /> },
          { path: 'beratung', element: <Beratung /> },
          { path: 'begleitung-plus', element: <BegleitungPlusScreen /> },
          { path: 'demo', element: <Demo /> },
          { path: 'testseite', element: <Testseite /> },
          {
            path: 'settings',
            element: <SettingsLayout />,
            children: [
              { index: true, element: <GlobalSettingsScreen /> },
              {
                path: 'developer',
                element: import.meta.env.PROD ? (
                  <Navigate to="/settings" replace />
                ) : (
                  <DeveloperScreen />
                ),
              },
              { path: ':moduleId', element: <ModuleSettingsScreen /> },
            ],
          },
          ...normalizedModuleRoutes,
          { path: 'offline', element: <OfflineScreen /> },
          { path: '*', element: <Navigate to="/" replace /> },
        ],
      },
    ];
  }, [moduleRoutes]);

  return useRoutes(routes);
};
