import { APP_MODULES } from '../../assembly/appModules';
import type {
  PwaFactoryAiPipeline,
  PwaFactoryApiAdapter,
  PwaFactoryI18nBundle,
  PwaFactoryJob,
  PwaFactoryModule,
  PwaFactoryNavItem,
  PwaFactoryRouteDefinition,
  ThemeOverrideBundle,
} from '../contracts/moduleContract';
import type { ThemeContract } from '../theme/themeContract';

const isDev =
  typeof import.meta !== 'undefined' && typeof import.meta.env !== 'undefined'
    ? Boolean(import.meta.env.DEV)
    : process.env.NODE_ENV !== 'production';

type ModuleHomeWidget = {
  module: PwaFactoryModule;
  widget: NonNullable<ReturnType<NonNullable<PwaFactoryModule['getHomeWidget']>>>;
};

type ModuleSettingsEntry = {
  module: PwaFactoryModule;
  sections: NonNullable<ReturnType<NonNullable<PwaFactoryModule['getSettings']>>>['sections'];
};

const normalizePath = (path: string): string => {
  if (!path) {
    return '';
  }
  return path.startsWith('/') ? path : `/${path}`;
};

const joinPaths = (base: string | undefined, path: string): string => {
  const normalizedBase = base ? normalizePath(base).replace(/\/+$/, '') : '';
  const normalizedPath = normalizePath(path);
  if (!normalizedBase) {
    return normalizedPath || '/';
  }
  if (!normalizedPath || normalizedPath === '/') {
    return normalizedBase || '/';
  }
  return `${normalizedBase}${normalizedPath}`;
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const deepMerge = <T extends Record<string, unknown>>(
  base: Partial<T>,
  override?: Partial<T>,
): Partial<T> => {
  if (!override) {
    return { ...base };
  }

  const result: Record<string, unknown> = { ...base };

  Object.entries(override).forEach(([key, value]) => {
    const existing = result[key];
    if (isPlainObject(existing) && isPlainObject(value)) {
      result[key] = deepMerge(existing as Record<string, unknown>, value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  });

  return result as Partial<T>;
};

type WithSource<T> = { module: PwaFactoryModule; item: T };

const getDuplicateDetails = <T>(
  entries: Array<WithSource<T>>,
  keyFn: (item: T) => string,
): string[] => {
  const byKey = new Map<string, string[]>();

  entries.forEach(({ module, item }) => {
    const key = keyFn(item);
    const modules = byKey.get(key) ?? [];
    modules.push(module.id);
    byKey.set(key, modules);
  });

  const duplicates: string[] = [];

  byKey.forEach((moduleIds, key) => {
    if (moduleIds.length > 1) {
      const sortedModules = [...moduleIds].sort();
      duplicates.push(`${key} [${sortedModules.join(', ')}]`);
    }
  });

  return duplicates;
};

const handleDuplicates = <T>(
  entries: Array<WithSource<T>>,
  keyFn: (item: T) => string,
  label: string,
): T[] => {
  if (!entries.length) {
    return [];
  }

  const duplicates = getDuplicateDetails(entries, keyFn);

  if (!duplicates.length) {
    return entries.map((entry) => entry.item);
  }

  const sorted = [...entries].sort((a, b) => {
    const moduleCompare = a.module.id.localeCompare(b.module.id);
    if (moduleCompare !== 0) {
      return moduleCompare;
    }
    return keyFn(a.item).localeCompare(keyFn(b.item));
  });

  const message = `${label} duplicates detected: ${duplicates.join('; ')}`;

  if (isDev) {
    throw new Error(message);
  } else {
    console.error(message);
  }

  const seen = new Set<string>();
  const unique: T[] = [];

  sorted.forEach(({ item }) => {
    const key = keyFn(item);
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    unique.push(item);
  });

  return unique;
};

export const getActiveModules = (): PwaFactoryModule[] => {
  return [...APP_MODULES];
};

export const getAllRoutes = (): PwaFactoryRouteDefinition[] => {
  const entries: Array<WithSource<PwaFactoryRouteDefinition>> = [];

  getActiveModules().forEach((module) => {
    const routes = module.getRoutes ? module.getRoutes() || [] : [];
    routes.forEach((route) => {
      entries.push({
        module,
        item: {
          path: joinPaths(module.routeBase, route.path),
          element: route.element,
        },
      });
    });
  });

  return handleDuplicates(entries, (route) => route.path, 'Route paths');
};

export const getHomeWidgets = (): ModuleHomeWidget[] => {
  const widgets: ModuleHomeWidget[] = [];

  getActiveModules().forEach((module) => {
    const widget = module.getHomeWidget?.();
    if (widget) {
      widgets.push({ module, widget });
    }
  });

  return widgets.sort((a, b) => {
    const aOrder = typeof a.widget.order === 'number' ? a.widget.order : 0;
    const bOrder = typeof b.widget.order === 'number' ? b.widget.order : 0;
    if (aOrder !== bOrder) {
      return aOrder - bOrder;
    }
    return a.widget.id.localeCompare(b.widget.id);
  });
};

export const getModuleSettings = (): ModuleSettingsEntry[] => {
  const settingsEntries: ModuleSettingsEntry[] = [];

  getActiveModules().forEach((module) => {
    const settings = module.getSettings?.();
    if (settings?.sections?.length) {
      settingsEntries.push({ module, sections: settings.sections });
    }
  });

  return settingsEntries;
};

export const getThemeOverridesMerged = (): ThemeOverrideBundle => {
  const merged: ThemeOverrideBundle = {};

  const themeProviders = getActiveModules().filter((module) => module.capabilities?.themeProvider);
  if (!themeProviders.length) {
    return merged;
  }

  const sortedProviders = [...themeProviders].sort((a, b) => a.id.localeCompare(b.id));

  if (sortedProviders.length > 1) {
    const providerList = sortedProviders.map((module) => module.id).join(', ');
    const message = `Multiple theme providers detected: ${providerList}`;
    if (isDev) {
      throw new Error(message);
    } else {
      console.error(message);
    }
  }

  const selectedProvider = sortedProviders[0];
  const overrides = selectedProvider.getThemeOverrides?.();
  if (!overrides) {
    return merged;
  }

  if (overrides.light) {
    merged.light = deepMerge<ThemeContract>(merged.light ?? {}, overrides.light);
  }

  if (overrides.dark) {
    merged.dark = deepMerge<ThemeContract>(merged.dark ?? {}, overrides.dark);
  }

  return merged;
};

export const getModuleById = (id: string): PwaFactoryModule | undefined => {
  return getActiveModules().find((module) => module.id === id);
};

export const getNavItems = (): PwaFactoryNavItem[] => {
  const entries: Array<WithSource<PwaFactoryNavItem>> = [];

  getActiveModules().forEach((module) => {
    const moduleItems = module.getNavItems?.();
    if (moduleItems?.length) {
      moduleItems.forEach((item) => {
        entries.push({
          module,
          item: {
            ...item,
            to: joinPaths(module.routeBase, item.to),
          },
        });
      });
    }
  });

  const deduped = handleDuplicates(entries, (item) => item.id, 'Navigation items');

  return deduped.sort((a, b) => {
    const aOrder = typeof a.order === 'number' ? a.order : 0;
    const bOrder = typeof b.order === 'number' ? b.order : 0;
    if (aOrder !== bOrder) {
      return aOrder - bOrder;
    }
    return a.id.localeCompare(b.id);
  });
};

export const getI18nBundles = (): PwaFactoryI18nBundle[] => {
  const bundles: PwaFactoryI18nBundle[] = [];

  getActiveModules().forEach((module) => {
    const moduleBundles = module.getI18nBundles?.();
    if (moduleBundles?.length) {
      bundles.push(...moduleBundles);
    }
  });

  return bundles;
};

export const getJobs = (): PwaFactoryJob[] => {
  const entries: Array<WithSource<PwaFactoryJob>> = [];

  getActiveModules().forEach((module) => {
    const moduleJobs = module.getJobs?.();
    if (moduleJobs?.length) {
      moduleJobs.forEach((job) => entries.push({ module, item: job }));
    }
  });

  return handleDuplicates(entries, (job) => job.id, 'Job definitions');
};

export const getApiAdapters = (): PwaFactoryApiAdapter[] => {
  const entries: Array<WithSource<PwaFactoryApiAdapter>> = [];

  getActiveModules().forEach((module) => {
    const moduleAdapters = module.getApiAdapters?.();
    if (moduleAdapters?.length) {
      moduleAdapters.forEach((adapter) => entries.push({ module, item: adapter }));
    }
  });

  return handleDuplicates(entries, (adapter) => adapter.id, 'API adapters');
};

export const getAiPipelines = (): PwaFactoryAiPipeline[] => {
  const entries: Array<WithSource<PwaFactoryAiPipeline>> = [];

  getActiveModules().forEach((module) => {
    const modulePipelines = module.getAiPipelines?.();
    if (modulePipelines?.length) {
      modulePipelines.forEach((pipeline) => entries.push({ module, item: pipeline }));
    }
  });

  return handleDuplicates(entries, (pipeline) => pipeline.id, 'AI pipelines');
};

export type { ModuleHomeWidget, ModuleSettingsEntry };

