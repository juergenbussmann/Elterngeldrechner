export interface HomeWidgetConfig {
  id: string;
  moduleId: string;
  priority?: number;
  span?: 1 | 2;
}

/**
 * Deprecated – use assembly/moduleHost instead.
 * Kept for backward compatibility with legacy imports.
 */
export const homeWidgets: HomeWidgetConfig[] = [];

