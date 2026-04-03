import { APP_BRAND } from '../../config/appConfig';
import type { ThemeDefinition, ThemePreference } from './themeContract';

const brandPrimary = APP_BRAND.primaryColor || '#D48C8C';
const brandPrimaryDark = APP_BRAND.primaryColor ? APP_BRAND.primaryColor : '#B36A6A';

export type ThemeName = 'lightDefault' | 'darkDefault';

const baseTypography = {
  fontFamily:
    "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  fontSizes: {
    xs: '0.75rem',
    sm: '0.875rem',
    md: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
  },
  fontWeights: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  lineHeights: {
    normal: 1.5,
    snug: 1.4,
  },
} as const;

const baseSpacing = {
  xs: '0.25rem',
  sm: '0.5rem',
  md: '0.75rem',
  lg: '1rem',
  xl: '1.5rem',
} as const;

const baseRadii = {
  xs: '0.25rem',
  sm: '0.375rem',
  md: '0.75rem',
  lg: '1rem',
  xl: '1.5rem',
  pill: '9999px',
} as const;

const baseShadows = {
  sm: '0 1px 2px rgba(15, 23, 42, 0.06)',
  md: '0 4px 10px rgba(15, 23, 42, 0.12)',
} as const;

export const lightDefault: ThemeDefinition = {
  name: 'lightDefault',
  mode: 'light',
  colors: {
    primary: brandPrimary,
    background: '#f3efe7',
    surface: '#ffffff',
    textPrimary: '#0f172a',
    textSecondary: '#6b7280',
    border: '#e4e4e7',
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
    accent: '#9BB1A0',
    overlay: 'rgba(15, 23, 42, 0.45)',
  },
  typography: baseTypography,
  spacing: baseSpacing,
  radii: baseRadii,
  shadows: baseShadows,
  components: {
    button: {
      primary: {
        background: 'linear-gradient(135deg, #d8c8a8, #c2b08b)',
        text: '#2b2b2b',
        border: 'rgba(0, 0, 0, 0.08)',
        hoverBackground: 'linear-gradient(135deg, #e0d2b5, #c9b897)',
        activeBackground: 'linear-gradient(135deg, #c9b897, #b39e7a)',
        shadow: '0 6px 14px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.4)',
        activeShadow: '0 4px 10px rgba(0, 0, 0, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.35)',
      },
      secondary: {
        background: 'linear-gradient(180deg, #ffffff 0%, #f2ebe0 100%)',
        text: '#2b2b2b',
        border: 'rgba(0, 0, 0, 0.08)',
        hoverBackground: 'linear-gradient(180deg, #ffffff 0%, #ebe4d8 100%)',
        activeBackground: 'linear-gradient(180deg, #f5efe6 0%, #e2d9cc 100%)',
        shadow: '0 4px 12px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.65)',
        activeShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
      },
      ghost: {
        background: 'transparent',
        text: '#0f172a',
        border: 'transparent',
        hoverBackground: 'rgba(15, 23, 42, 0.04)',
        activeBackground: 'rgba(15, 23, 42, 0.08)',
      },
    },
    card: {
      background: '#ffffff',
      border: '#e4e4e7',
      shadow: baseShadows.sm,
    },
    input: {
      background: '#ffffff',
      border: '#e4e4e7',
      text: '#0f172a',
      placeholder: '#64748b',
    },
    navBar: {
      background: 'linear-gradient(180deg, #f5f2ea, #e9e3d7)',
      border: 'rgba(0, 0, 0, 0.05)',
      text: 'var(--muted)',
      active: '#8a7355',
    },
    header: {
      background: 'linear-gradient(180deg, #f6f2e9, #ece6da)',
      border: 'rgba(0, 0, 0, 0.05)',
      text: 'var(--text)',
    },
  },
};

const darkShadows = {
  sm: '0 1px 2px rgba(0, 0, 0, 0.3)',
  md: '0 4px 12px rgba(0, 0, 0, 0.4)',
} as const;

export const darkDefault: ThemeDefinition = {
  name: 'darkDefault',
  mode: 'dark',
  colors: {
    primary: brandPrimaryDark,
    background: '#0f172a',
    surface: '#1e293b',
    textPrimary: '#f1f5f9',
    textSecondary: '#94a3b8',
    border: '#334155',
    success: '#34d399',
    warning: '#fbbf24',
    error: '#f87171',
    accent: '#86a08a',
    overlay: 'rgba(0, 0, 0, 0.6)',
  },
  typography: baseTypography,
  spacing: baseSpacing,
  radii: baseRadii,
  shadows: darkShadows,
  components: {
    button: {
      primary: {
        background: brandPrimaryDark,
        text: '#ffffff',
        border: brandPrimaryDark,
        hoverBackground: '#c45a5a',
        activeBackground: '#b34f4f',
        shadow: darkShadows.sm,
        activeShadow: darkShadows.md,
      },
      secondary: {
        background: '#334155',
        text: '#f1f5f9',
        border: '#475569',
        hoverBackground: '#475569',
        activeBackground: '#64748b',
        shadow: darkShadows.sm,
        activeShadow: darkShadows.md,
      },
      ghost: {
        background: 'transparent',
        text: '#f1f5f9',
        border: 'transparent',
        hoverBackground: 'rgba(241, 245, 249, 0.08)',
        activeBackground: 'rgba(241, 245, 249, 0.12)',
      },
    },
    card: {
      background: '#1e293b',
      border: '#334155',
      shadow: darkShadows.md,
    },
    input: {
      background: '#1e293b',
      border: '#334155',
      text: '#f1f5f9',
      placeholder: '#64748b',
    },
    navBar: {
      background: '#1e293b',
      border: '#334155',
      text: 'var(--muted)',
      active: brandPrimaryDark,
    },
    header: {
      background: '#1e293b',
      border: '#334155',
      text: 'var(--text)',
    },
  },
};

export const DEFAULT_THEME_PREFERENCE: ThemePreference = 'system';

export const themes: Record<ThemeName, ThemeDefinition> = {
  lightDefault,
  darkDefault,
};

