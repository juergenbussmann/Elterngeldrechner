import React, { useCallback, useMemo, useState } from 'react';
import { Button } from '../../shared/ui/Button';
import { useI18n } from '../../shared/lib/i18n';
import type { ScreenAction } from '../screenConfig';

export const HeaderActionsMenu: React.FC<{
  actions?: ScreenAction[];
  onAction: (action: ScreenAction) => void;
}> = ({ actions, onAction }) => {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);

  const hasActions = useMemo(() => Boolean(actions && actions.length > 0), [actions]);

  const toggleMenu = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const handleAction = useCallback(
    (action: ScreenAction) => {
      onAction(action);
      setIsOpen(false);
    },
    [onAction],
  );

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  if (!hasActions) {
    return null;
  }

  return (
    <div className="app-shell__actions-menu">
      <Button
        type="button"
        aria-label={t('app.header.moreActions')}
        onClick={toggleMenu}
        className="app-shell__icon-button"
        variant="ghost"
        style={{ width: 36, height: 36, padding: 0 }}
      >
        <span aria-hidden="true">⋯</span>
      </Button>

      {isOpen && (
        <div className="app-shell__actions-menu-overlay" role="menu">
          <div className="app-shell__actions-menu-surface">
            {actions?.map((action) => (
              <button
                key={action.id}
                type="button"
                className="app-shell__actions-menu-item"
                onClick={() => handleAction(action)}
              >
                {t(action.labelKey)}
              </button>
            ))}
          </div>
          <button
            type="button"
            aria-label={t('app.header.closeMenu')}
            className="app-shell__actions-menu-backdrop"
            onClick={handleClose}
          />
        </div>
      )}
    </div>
  );
};

