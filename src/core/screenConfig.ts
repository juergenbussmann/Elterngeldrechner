export type ScreenActionClick =
  | { type: 'navigate'; target: string }
  | { type: 'panel'; panelId: string; props?: Record<string, unknown> }
  | { type: 'custom'; handlerId: string };

export interface ScreenAction {
  id: string;
  /**
   * i18n key for the accessible label of the action.
   */
  labelKey: string;
  /**
   * Optional semantic icon identifier, used by the shell to render a symbol.
   */
  icon?: string;
  /**
   * Optional navigation target; if provided the shell will use the navigation
   * API to route to this target.
   *
   * Deprecated: prefer `onClick` with type "navigate" for new actions.
   */
  navigationTarget?: string;
  /**
   * Declarative click configuration for complex actions.
   */
  onClick?: ScreenActionClick;
}

/**
 * Configuration for a logical screen within the application shell.
 */
export interface ScreenConfig {
  /**
   * Stable identifier for the screen, used for lookups and analytics.
   */
  id: string;
  /**
   * Route path that activates this screen.
   */
  route: string;
  /**
   * i18n key for the screen title.
   */
  titleKey: string;
  /**
   * Optional list of secondary actions rendered in the header.
   */
  actions?: ScreenAction[];
  /**
   * Primarily visible icon actions in the header (right side).
   */
  primaryActions?: ScreenAction[];
  /**
   * Additional actions shown in an overflow/menu.
   */
  menuActions?: ScreenAction[];
  /**
   * Optional module link used to merge module-provided header actions.
   */
  moduleId?: string;
}
