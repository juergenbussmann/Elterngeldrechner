export type ThemeMode = 'light' | 'dark';

export type ThemePreference = 'system' | 'light' | 'dark';

export interface ThemeColors {
  primary: string;
  background: string;
  surface: string;
  textPrimary: string;
  textSecondary: string;
  border: string;
  success: string;
  warning: string;
  error: string;
  accent?: string;
  overlay?: string;
}

export interface ThemeTypography {
  fontFamily: string;
  fontSizes: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  fontWeights: {
    regular: number;
    medium: number;
    semibold: number;
    bold: number;
  };
  lineHeights: {
    normal: number;
    snug: number;
  };
}

export interface ThemeSpacing {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
}

export interface ThemeRadii {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  pill: string;
}

export interface ThemeShadows {
  sm: string;
  md: string;
}

export interface ButtonVariantTokens {
  background: string;
  text: string;
  border: string;
  hoverBackground?: string;
  activeBackground?: string;
  shadow?: string;
  activeShadow?: string;
}

export interface ButtonTokens {
  primary: ButtonVariantTokens;
  secondary: ButtonVariantTokens;
  ghost: ButtonVariantTokens;
}

export interface CardTokens {
  background: string;
  border: string;
  shadow: string;
}

export interface InputTokens {
  background: string;
  border: string;
  text: string;
  placeholder: string;
}

export interface NavBarTokens {
  background: string;
  border: string;
  text: string;
  active: string;
}

export interface HeaderTokens {
  background: string;
  border: string;
  text: string;
}

export interface ComponentTokens {
  button: ButtonTokens;
  card: CardTokens;
  input: InputTokens;
  navBar: NavBarTokens;
  header: HeaderTokens;
}

export interface ThemeDefinition {
  name: string;
  mode: ThemeMode;
  colors: ThemeColors;
  typography: ThemeTypography;
  spacing: ThemeSpacing;
  radii: ThemeRadii;
  shadows: ThemeShadows;
  components: ComponentTokens;
}

export type ThemeContract = ThemeDefinition;

