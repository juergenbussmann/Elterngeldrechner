import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { trackScreenView } from '../telemetry';

type NavigationTarget = 'home' | 'notifications' | 'settings' | string;

const resolveTarget = (target: NavigationTarget): string => {
  switch (target) {
    case 'home':
      return '/';
    case 'notifications':
      return '/notifications';
    case 'settings':
      return '/settings';
    default:
      return target.startsWith('/') ? target : `/${target}`;
  }
};

const deriveScreenIdFromPath = (path: string): string => {
  const normalized = path.startsWith('/') ? path : `/${path}`;

  if (normalized === '/') {
    return 'home';
  }

  if (normalized.startsWith('/notifications')) {
    return 'notifications';
  }

  if (normalized === '/settings') {
    return 'settings';
  }

  if (normalized.startsWith('/settings/')) {
    const moduleId = normalized.slice('/settings/'.length).split('/')[0] ?? '';
    return moduleId ? `settings:${decodeURIComponent(moduleId)}` : 'settings';
  }

  if (normalized.startsWith('/detail/')) {
    const entity = normalized.split('/')[2] ?? 'unknown';
    return `detail:${decodeURIComponent(entity)}`;
  }

  if (normalized === '/begleitung-plus') {
    return 'begleitungPlus';
  }

  return normalized.slice(1) || 'unknown';
};

export interface GoToOptions {
  state?: unknown;
  replace?: boolean;
}

export interface NavigationApi {
  goTo: (target: NavigationTarget, options?: GoToOptions) => void;
  goBack: () => void;
  openSettings: () => void;
  openModuleSettings: (moduleId: string) => void;
  openNotifications: () => void;
  openDetail: (entity: string, id: string | number) => void;
}

export const useNavigation = (): NavigationApi => {
  const navigate = useNavigate();

  const goTo = useCallback(
    (target: NavigationTarget, options?: GoToOptions) => {
      const path = resolveTarget(target);
      navigate(path, options);
      trackScreenView(deriveScreenIdFromPath(path));
    },
    [navigate]
  );

  const goBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const openSettings = useCallback(() => {
    const path = '/settings';
    navigate(path);
    trackScreenView(deriveScreenIdFromPath(path));
  }, [navigate]);

  const openModuleSettings = useCallback(
    (moduleId: string) => {
      const encodedModuleId = encodeURIComponent(moduleId);
      const path = `/settings/${encodedModuleId}`;
      navigate(path);
      trackScreenView(deriveScreenIdFromPath(path));
    },
    [navigate]
  );

  const openNotifications = useCallback(() => {
    const path = '/notifications';
    navigate(path);
    trackScreenView(deriveScreenIdFromPath(path));
  }, [navigate]);

  const openDetail = useCallback(
    (entity: string, id: string | number) => {
      const encodedEntity = encodeURIComponent(entity);
      const encodedId = encodeURIComponent(String(id));
      const path = `/detail/${encodedEntity}/${encodedId}`;
      navigate(path);
      trackScreenView(deriveScreenIdFromPath(path));
    },
    [navigate]
  );

  return {
    goTo,
    goBack,
    openSettings,
    openModuleSettings,
    openNotifications,
    openDetail,
  };
};
