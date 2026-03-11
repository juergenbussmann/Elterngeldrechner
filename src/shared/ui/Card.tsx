import React from 'react';
import type { CSSProperties, HTMLAttributes } from 'react';
import { useTheme } from '../../core/theme/ThemeProvider';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {}

const isTokenBasedCard = (className?: string | null): boolean =>
  typeof className === 'string' &&
  (className.includes('still-daily-checklist__card') || className.includes('ui-card'));

export const Card: React.FC<CardProps> = ({ style, children, className, ...rest }) => {
  const theme = useTheme();
  const { spacing, radii, shadows, components } = theme;
  const { card } = components;

  const baseStyle: CSSProperties = isTokenBasedCard(className)
    ? { padding: spacing.lg }
    : {
        backgroundColor: card.background,
        borderRadius: radii.md,
        padding: spacing.lg,
        boxShadow: card.shadow ?? shadows.sm,
        border: `1px solid ${card.border}`,
      };

  return (
    <div {...rest} className={className} style={{ ...baseStyle, ...style }}>
      {children}
    </div>
  );
};
