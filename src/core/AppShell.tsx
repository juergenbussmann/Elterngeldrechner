import React, { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate, useNavigationType } from 'react-router-dom';
import { AppFooter } from './AppFooter';
import { useNavigation } from '../shared/lib/navigation/useNavigation';
import { PickerOverlayProvider } from '../shared/lib/pickerOverlay/PickerOverlayProvider';
import { usePickerOverlay } from '../shared/lib/pickerOverlay/usePickerOverlay';
import { useI18n } from '../shared/lib/i18n';
import type { ScreenAction, ScreenActionClick, ScreenConfig } from './screenConfig';
import { getScreenConfigByPath } from '../config/navigation';
import { APP_BRAND } from '../config/appConfig';
import { NotificationsHost } from '../shared/lib/notifications';
import { OfflineScreen } from './offline/OfflineScreen';
import { useTheme } from './theme/ThemeProvider';
import { PanelHost } from './panels/PanelHost';
import { PanelProvider, usePanels } from '../shared/lib/panels';
import { HeaderActionsBar } from './header/HeaderActionsBar';
import { HeaderActionsMenu } from './header/HeaderActionsMenu';
import { BackButton } from './header/BackButton';
import { PhaseLabel } from './header/PhaseLabel';
import { BackgroundLayers } from './background/BackgroundLayers';
import { getModuleById } from '../shared/lib/modules';
import { getHeaderActionHandler } from '../shared/lib/navigation/headerActionRegistry';
import { registerBegleitungPlusOpener } from './begleitungPlus/openBegleitungPlusUpsell';
import { PhaseOnboardingGate } from './phase/PhaseOnboardingGate';
import { ProgressTriggerBanner } from './begleitungPlus/ui/ProgressTriggerBanner';
import { shouldShowProgressTrigger } from './begleitungPlus/upgradeTriggersStore';
import { useBegleitungPlus } from './begleitungPlus';

type ModuleHeaderActions = {
  primaryActions?: ScreenAction[];
  menuActions?: ScreenAction[];
};

const AppShellContent: React.FC = () => {
  const location = useLocation();
  const navigationType = useNavigationType();
  const { goTo, goBack, openNotifications, openSettings } = useNavigation();
  const { t } = useI18n();
  const { isPlus } = useBegleitungPlus();
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showProgressBanner, setShowProgressBanner] = useState(true);
  const theme = useTheme();
  const headerTokens = theme.components.header;
  const navigate = useNavigate();
  const { state: panelState, closePanel, openBottomSheet } = usePanels();
  const isHome = location.pathname === '/';

  const mergeModuleActions = (config?: ScreenConfig) => {
    if (!config?.moduleId) {
      return config;
    }

    const moduleDef = getModuleById(config.moduleId);
    const moduleHeaderActions =
      moduleDef && 'headerActions' in moduleDef
        ? (moduleDef as { headerActions?: ModuleHeaderActions }).headerActions
        : undefined;

    if (!moduleHeaderActions) {
      return config;
    }

    return {
      ...config,
      primaryActions: [
        ...(config.primaryActions ?? []),
        ...(moduleHeaderActions.primaryActions ?? []),
      ],
      menuActions: [...(config.menuActions ?? []), ...(moduleHeaderActions.menuActions ?? [])],
    };
  };

  const resolveHeaderActions = (config?: ScreenConfig) => {
    const primary: ScreenAction[] = [];
    const menu: ScreenAction[] = [];

    if (!config) {
      return { primary, menu };
    }

    if (config.actions) {
      // Back-Button-Actions herausfiltern, da BackButton jetzt separat gerendert wird
      primary.push(...config.actions.filter((action) => action.id !== 'goBack'));
    }

    if (config.primaryActions) {
      // Back-Button-Actions herausfiltern
      primary.push(...config.primaryActions.filter((action) => action.id !== 'goBack'));
    }

    if (config.menuActions) {
      menu.push(...config.menuActions);
    }

    return { primary, menu };
  };

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    registerBegleitungPlusOpener((path) => navigate(path));
  }, [navigate]);

  // Scroll-to-top on forward navigations so newly opened screens always start at the top.
  // Keep scroll position for POP (browser back/forward) to preserve the user's reading position.
  useEffect(() => {
    if (navigationType === 'POP') {
      return;
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [location.pathname, navigationType]);

  const rawConfig = getScreenConfigByPath(location.pathname);
  const screenConfig = mergeModuleActions(rawConfig);
  const titleKey = screenConfig?.titleKey;
  const appTitle = APP_BRAND.appName;
  const title = titleKey ? t(titleKey) : appTitle;
  const headerActions = resolveHeaderActions(screenConfig);

  const isFormScreenWithPickers =
    location.pathname === '/appointments/new' ||
    location.pathname.startsWith('/appointments/edit/') ||
    location.pathname === '/appointments/uchecks/new';
  const pickerOverlay = usePickerOverlay();

  React.useEffect(() => {
    if (!isFormScreenWithPickers) {
      pickerOverlay?.setPickerOpen(false);
    }
  }, [location.pathname, isFormScreenWithPickers, pickerOverlay]);

  const isPickerOpen = pickerOverlay?.isPickerOpen ?? false;
  const hideFooter = isFormScreenWithPickers && isPickerOpen;

  const handleDeclarativeClick = (action: ScreenAction, click: ScreenActionClick): boolean => {
    switch (click.type) {
      case 'navigate':
        goTo(click.target);
        return true;
      case 'panel':
        openBottomSheet(click.panelId, click.props);
        return true;
      case 'custom': {
        const handler = getHeaderActionHandler(click.handlerId);
        handler?.(action);
        return true;
      }
      default:
        return false;
    }
  };

  const handleActionClick = (action: ScreenAction) => {
    if (action.onClick) {
      const handled = handleDeclarativeClick(action, action.onClick);
      if (handled) {
        return;
      }
    }

    if (action.navigationTarget) {
      goTo(action.navigationTarget);
      return;
    }

    switch (action.id) {
      case 'openNotifications':
        openNotifications();
        return;
      case 'openSettings':
        openSettings();
        return;
      case 'goBack':
        // Back-Button wird jetzt separat gerendert, dieser Fall sollte nicht mehr auftreten
        // Fallback für Legacy-Code
        goBack();
        return;
      default:
        return;
    }
  };

  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <>
      <PhaseOnboardingGate />
      <BackgroundLayers />
      <div
        className={`app-shell${isHome ? ' app-shell--chromeless' : ''}${hideFooter ? ' app-shell--no-footer' : ''}`}
      >
        {!isHome && (
        <header
          className="app-shell__header"
          style={{
            backgroundColor: headerTokens.background,
            borderBottom: `1px solid ${headerTokens.border}`,
            color: headerTokens.text,
          }}
        >
          <div className="app-shell__header-left">
            <BackButton />
          </div>
          <div className="app-shell__header-center">
            <h1 className="app-shell__title">{title}</h1>
          </div>
          <div className="app-shell__header-right">
            <PhaseLabel />
            <HeaderActionsBar actions={headerActions.primary} onAction={handleActionClick} />
            <HeaderActionsMenu actions={headerActions.menu} onAction={handleActionClick} />
          </div>
        </header>
      )}
      <main className="app-shell__main">
        {isOffline ? (
          <OfflineScreen onRetry={handleRetry} />
        ) : (
          <>
            {!isHome &&
              !isPlus &&
              shouldShowProgressTrigger() &&
              showProgressBanner && (
                <div className="app-shell__progress-banner">
                  <ProgressTriggerBanner
                    onDismiss={() => setShowProgressBanner(false)}
                  />
                </div>
              )}
            <Outlet />
          </>
        )}
      </main>
        <PanelHost state={panelState} onClose={closePanel} />
        <NotificationsHost />
        {!hideFooter && <AppFooter />}
      </div>
    </>
  );
};

export const AppShell: React.FC = () => {
  return (
    <PanelProvider>
      <PickerOverlayProvider>
        <AppShellContent />
      </PickerOverlayProvider>
    </PanelProvider>
  );
};
