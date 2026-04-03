import React from 'react';
import { useLocation } from 'react-router-dom';
import type { FooterMenuItem } from '../config/appConfig';
import { footerMenu } from '../config/appConfig';
import { useNavigation } from '../shared/lib/navigation/useNavigation';
import { useI18n } from '../shared/lib/i18n';
import { Button } from '../shared/ui/Button';
import { useTheme } from './theme/ThemeProvider';
const normalizeRoute = (route: string): string => (route.startsWith('/') ? route : `/${route}`);

type IconSvgProps = {
  title?: string;
};

const IconSvg: React.FC<React.PropsWithChildren<IconSvgProps>> = ({ children, title }) => (
  <svg
    className="app-shell__footer-nav-icon"
    viewBox="0 0 24 24"
    role="img"
    aria-hidden={title ? undefined : true}
  >
    {title ? <title>{title}</title> : null}
    {children}
  </svg>
);

const getIcon = (icon: string): React.ReactNode => {
  switch (icon) {
    // Start (Variante 1)
    case 'home':
      return (
        <IconSvg>
          <path d="M4 10.5 12 4l8 6.5" />
          <path d="M6.5 10.5V20h11V10.5" />
          <path d="M10 20v-6h4v6" />
        </IconSvg>
      );

    // Inhalte (Variante 1) – weiches Buch
    case 'knowledge':
    case 'documents':
      return (
        <IconSvg>
          <path d="M5.5 6.5c3.5 0 5.8 1 6.5 2.2" />
          <path d="M18.5 6.5c-3.5 0-5.8 1-6.5 2.2" />
          <path d="M6 6.5v12.5c3.6 0 5.7 1 6 1.8" />
          <path d="M18 6.5v12.5c-3.6 0-5.7 1-6 1.8" />
        </IconSvg>
      );

    // Status (Variante 1)
    case 'check':
      return (
        <IconSvg>
          <path d="M20 7 10.5 16.5 6 12" />
        </IconSvg>
      );

    // Termine (Variante 1)
    case 'appointments':
      return (
        <IconSvg>
          <path d="M7 3.8v2.4" />
          <path d="M17 3.8v2.4" />
          <path d="M5.5 7.5h13" />
          <path d="M6.5 5.5h11a2 2 0 0 1 2 2V19a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2V7.5a2 2 0 0 1 2-2Z" />
          <path d="M8.5 11h3" />
          <path d="M8.5 14.5h5" />
        </IconSvg>
      );

    // Kontakt – Anlaufstelle (Pin, Variante 1)
    case 'contacts':
      return (
        <IconSvg>
          <path d="M12 21s-6-5.2-6-10a6 6 0 1 1 12 0c0 4.8-6 10-6 10Z" />
          <path d="M12 11.2a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4Z" />
        </IconSvg>
      );

    // Notizen – ruhig & sachlich
    case 'notes':
      return (
        <IconSvg>
          <path d="M7.5 4H17a2 2 0 0 1 2 2v11l-3.5 3.5H7.5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
          <path d="M15.5 20.5V17H19" />
          <path d="M9.5 9h7" />
          <path d="M9.5 12.5h6" />
        </IconSvg>
      );

    // Einstellungen – weich gerundet
    case 'settings':
      return (
        <IconSvg>
          <path d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z" />
          <path d="M19 12a7 7 0 0 0-.1-1l2-1.1-1.8-3.1-2.2.7a7 7 0 0 0-1.4-.9L15 4h-6l-.5 2.6a7 7 0 0 0-1.4.9l-2.2-.7L3.1 9.9l2 1.1a7 7 0 0 0 0 2l-2 1.1 1.8 3.1 2.2-.7c.45.35.92.65 1.4.9L9 20h6l.5-2.6c.5-.25 1-.55 1.4-.9l2.2.7 1.8-3.1-2-1.1c.07-.33.1-.66.1-1Z" />
        </IconSvg>
      );

    // Hilfe (Variante 1) – falls später ein help-Tab dazu kommt
    case 'help':
    case 'info':
      return (
        <IconSvg>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 10.5v5" />
          <path d="M12 7.8h.01" />
        </IconSvg>
      );

    default:
      return (
        <IconSvg>
          <circle cx="12" cy="12" r="1.2" />
        </IconSvg>
      );
  }
};

export const AppFooter: React.FC = () => {
  const location = useLocation();
  const { goTo } = useNavigation();
  const { t } = useI18n();
  const { components } = useTheme();
  const navTokens = components.navBar;

  /** Nur appConfig-Footer; keine Modul-Einträge (Knowledge, Checklisten, …). */
  const navItems = React.useMemo<FooterMenuItem[]>(
    () => footerMenu.map((item) => ({ ...item, route: normalizeRoute(item.route) })),
    [],
  );

  return (
    <footer
      className="app-shell__footer"
      aria-label={t('app.footer.navigation')}
      style={{
        background: navTokens.background,
        borderTop: `1px solid ${navTokens.border}`,
        color: navTokens.text,
      }}
    >
      <nav className="app-shell__footer-nav">
        {navItems.map((item) => {
          const isActive =
            location.pathname === item.route ||
            location.pathname.startsWith(`${item.route}/`);

          return (
            <Button
              key={item.id}
              type="button"
              variant={isActive ? 'secondary' : 'ghost'}
              className="app-shell__footer-nav-item"
              aria-current={isActive ? 'page' : undefined}
              aria-label={t(item.labelKey)}
              onClick={() => goTo(item.route)}
              style={{
                transform: 'none',
                boxShadow: isActive ? 'inset 0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              <span
                className="app-shell__footer-nav-icon-wrap"
                aria-hidden="true"
                style={{ color: isActive ? navTokens.active : navTokens.text }}
              >
                {getIcon(item.icon)}
              </span>
            </Button>
          );
        })}
      </nav>
    </footer>
  );
};
