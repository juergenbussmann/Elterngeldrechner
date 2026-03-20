import React from 'react';
import { Button } from '../../shared/ui/Button';
import { useI18n } from '../../shared/lib/i18n';
import type { ScreenAction } from '../screenConfig';

const iconMap: Record<string, string> = {
  notifications: '🔔',
  settings: '⚙️',
  back: '←',
  menu: '⋯',
  hamburger: '☰',
};

const renderIcon = (action: ScreenAction): string => {
  if (action.icon && iconMap[action.icon]) {
    return iconMap[action.icon];
  }
  return '⋯';
};

export const HeaderActionsBar: React.FC<{
  actions?: ScreenAction[];
  onAction: (action: ScreenAction) => void;
}> = ({ actions, onAction }) => {
  const { t } = useI18n();

  if (!actions || actions.length === 0) {
    return null;
  }

  // Back-Button-Actions herausfiltern, da BackButton jetzt separat gerendert wird
  const filteredActions = actions.filter((action) => action.id !== 'goBack');

  if (filteredActions.length === 0) {
    return null;
  }

  return (
    <div className="app-shell__actions-bar">
      {filteredActions.map((action) => (
        <Button
          key={action.id}
          type="button"
          onClick={() => onAction(action)}
          aria-label={t(action.labelKey)}
          className="app-shell__icon-button"
          variant="ghost"
          style={{ width: 36, height: 36, padding: 0 }}
        >
          <span aria-hidden="true">{renderIcon(action)}</span>
        </Button>
      ))}
    </div>
  );
};

