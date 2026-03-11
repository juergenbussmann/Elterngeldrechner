import React from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { useTheme } from '../../core/theme/ThemeProvider';
import { Button } from './Button';
import { useI18n } from '../lib/i18n';
import './dialog-softpill.css';

export interface ModalProps {
  isOpen: boolean;
  onClose?: () => void;
  title?: ReactNode;
  children: ReactNode;
  /** Checklisten-Design: Glass-Overlay, Softpill-Card */
  variant?: 'default' | 'softpill';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  variant = 'default',
}) => {
  const theme = useTheme();
  const { colors, radii, spacing, shadows, typography, components } = theme;
  const { t } = useI18n();
  const { card } = components;

  if (!isOpen) {
    return null;
  }

  const isSoftpill = variant === 'softpill';

  const overlayStyle: CSSProperties = {
    position: 'fixed',
    inset: 0,
    backgroundColor: colors.overlay ?? 'rgba(15, 23, 42, 0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    zIndex: 50,
  };

  const containerStyle: CSSProperties = {
    width: '100%',
    maxWidth: '28rem',
    backgroundColor: card.background,
    borderRadius: radii.md,
    boxShadow: card.shadow ?? shadows.md,
    padding: spacing.lg,
    border: `1px solid ${card.border}`,
  };

  const titleStyle: CSSProperties = {
    marginBottom: spacing.md,
    fontFamily: typography.fontFamily,
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textPrimary,
  };

  return (
    <div
      style={overlayStyle}
      className={isSoftpill ? 'modal__overlay modal__overlay--softpill' : undefined}
      role="dialog"
      aria-modal="true"
    >
      <div
        style={containerStyle}
        className={
          isSoftpill ? 'modal__container still-daily-checklist__card modal__container--softpill' : undefined
        }
      >
        {title ? <div style={titleStyle}>{title}</div> : null}
        <div>{children}</div>
        {onClose ? (
          <div style={{ marginTop: spacing.lg, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              type="button"
              variant="secondary"
              className={isSoftpill ? 'next-steps__button btn--softpill' : undefined}
              onClick={onClose}
            >
              {t('common.close')}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
};
