import React from 'react';
import type { CSSProperties, HTMLAttributes, LiHTMLAttributes } from 'react';
import { useTheme } from '../../core/theme/ThemeProvider';

export interface ListProps extends HTMLAttributes<HTMLUListElement> {}

export interface ListItemProps extends LiHTMLAttributes<HTMLLIElement> {}

export const List: React.FC<ListProps> = ({ style, children, ...rest }) => {
  const theme = useTheme();
  const { spacing } = theme;

  const baseStyle: CSSProperties = {
    listStyleType: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.sm,
  };

  return (
    <ul {...rest} style={{ ...baseStyle, ...style }}>
      {children}
    </ul>
  );
};

export const ListItem: React.FC<ListItemProps> = ({ style, children, ...rest }) => {
  const theme = useTheme();
  const { spacing } = theme;

  const baseStyle: CSSProperties = {
    margin: 0,
    padding: spacing.sm,
  };

  return (
    <li {...rest} style={{ ...baseStyle, ...style }}>
      {children}
    </li>
  );
};
