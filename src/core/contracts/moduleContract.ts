import type React from 'react';
import type { ThemeContract } from '../theme/themeContract';

export type PwaFactoryModuleId = string;

export interface PwaFactoryRouteDefinition {
  path: string;
  element: React.ReactNode;
}

export interface PwaFactoryNavItem {
  id: string;
  label: string;
  to: string;
  icon?: string;
  order?: number;
}

export interface PwaFactoryI18nBundle {
  namespace: string;
  locale: string;
  strings: Record<string, string>;
}

export interface PwaFactoryJob {
  id: string;
  intervalMs: number;
  run: () => Promise<void> | void;
  runOnStart?: boolean;
}

export interface PwaFactoryApiAdapter {
  id: string;
  baseUrl?: string;
  headers?: Record<string, string>;
}

export interface PwaFactoryAiPipeline {
  id: string;
  run: (input: unknown) => Promise<unknown>;
}

export interface PwaFactorySettingsSection {
  id: string;
  title: string;
  element: React.ReactNode;
}

export interface ThemeOverrideBundle {
  light?: Partial<ThemeContract>;
  dark?: Partial<ThemeContract>;
}

export interface PwaFactoryModule {
  id: PwaFactoryModuleId;
  displayName: string;
  routeBase?: string;
  getRoutes?(): PwaFactoryRouteDefinition[];
  getHomeWidget?(): { id: string; order?: number; element: React.ReactNode };
  getSettings?(): { sections: PwaFactorySettingsSection[] };
  getThemeOverrides?(): ThemeOverrideBundle;
  getPermissions?(): string[];
  getNavItems?(): PwaFactoryNavItem[];
  getI18nBundles?(): PwaFactoryI18nBundle[];
  getJobs?(): PwaFactoryJob[];
  getApiAdapters?(): PwaFactoryApiAdapter[];
  getAiPipelines?(): PwaFactoryAiPipeline[];
  capabilities?: {
    themeProvider?: boolean;
  };
}

export type { ThemeContract };

