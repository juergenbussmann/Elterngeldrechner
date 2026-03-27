import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AppErrorBoundary } from './AppErrorBoundary';
import { I18nProvider, useI18n } from '../shared/lib/i18n';
import { NotificationsProvider } from '../shared/lib/notifications';
import { ThemeProvider } from './theme/ThemeProvider';
import { PhaseProvider } from './phase/PhaseProvider';
import { AppRoutes } from './router';
import '../styles/tokens.css';
import '../styles/ui-tokens.css';
import '../styles/ui-components.css';
import '../styles/dark-theme-overrides.css';
import '../styles/layout.css';
import '../styles/home-landing.css';
import '../styles/overrides-checklists-softpill.css';
import '../styles/still-daily-checklist-layout.css';


const DESKTOP_MIN_WIDTH = 1024;

const getIsDesktopLike = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }
  return window.innerWidth >= DESKTOP_MIN_WIDTH;
};

const useDesktopBlock = (): boolean => {
  const [isBlocked, setIsBlocked] = React.useState<boolean>(() => getIsDesktopLike());

  React.useEffect(() => {
    const handleResize = () => {
      setIsBlocked(getIsDesktopLike());
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return isBlocked;
};

const DesktopBlockScreen: React.FC = () => {
  const { t } = useI18n();

  return (
    <div className="desktop-block">
      <div className="desktop-block__content">
        <h1 className="desktop-block__title">{t('desktopBlock.title')}</h1>
        <p className="desktop-block__description">{t('desktopBlock.description')}</p>

        <div className="desktop-block__instructions">
          <ol className="desktop-block__steps">
            <li>{t('desktopBlock.step1')}</li>
            <li>{t('desktopBlock.step2')}</li>
            <li>{t('desktopBlock.step3')}</li>
            <li>{t('desktopBlock.step4')}</li>
          </ol>
        </div>

        <div className="desktop-block__qr">
          <div className="desktop-block__qr-placeholder" aria-hidden="true">
            <span>QR</span>
          </div>
          <p className="desktop-block__qr-caption">{t('desktopBlock.qr.label')}</p>
        </div>
      </div>
    </div>
  );
};

export const AppRoot: React.FC = () => {
  const isDesktopBlocked = useDesktopBlock();

  if (isDesktopBlocked) {
    return (
      <I18nProvider>
        <ThemeProvider>
          <DesktopBlockScreen />
        </ThemeProvider>
      </I18nProvider>
    );
  }

  return (
    <I18nProvider>
      <ThemeProvider>
        <PhaseProvider>
          <BrowserRouter>
            <NotificationsProvider>
              <AppErrorBoundary>
                <AppRoutes />
              </AppErrorBoundary>
            </NotificationsProvider>
          </BrowserRouter>
        </PhaseProvider>
      </ThemeProvider>
    </I18nProvider>
  );
};
