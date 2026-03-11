import React from 'react';
import type { CSSProperties, HTMLAttributes } from 'react';
import { useTheme } from '../../core/theme/ThemeProvider';

type BadgeVariant = 'default' | 'accent' | 'outline';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export const Badge: React.FC<BadgeProps> = ({ variant = 'default', style, children, ...rest }) => {
  const theme = useTheme();
  const { colors, radii, spacing, typography, mode } = theme;

  let backgroundColor: CSSProperties['backgroundColor'] = colors.surface;
  let borderColor: CSSProperties['borderColor'] = 'transparent';
  let color: CSSProperties['color'] = colors.textPrimary;

  if (variant === 'accent') {
    backgroundColor = colors.accent ?? colors.primary;
    color = mode === 'dark' ? '#0b1220' : '#ffffff';
  }

  if (variant === 'outline') {
    backgroundColor = 'transparent';
    borderColor = colors.border;
  }

  const baseStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: `${spacing.xs} ${spacing.sm}`,
    borderRadius: radii.pill,
    backgroundColor,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor,
    color,
    fontFamily: typography.fontFamily,
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.medium,
    lineHeight: typography.lineHeights.normal,
    whiteSpace: 'nowrap',
  };

  return (
    <span {...rest} style={{ ...baseStyle, ...style }}>
      {children}
    </span>
  );
};
