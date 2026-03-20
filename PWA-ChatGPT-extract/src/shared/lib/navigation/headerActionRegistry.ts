import type { ScreenAction } from '../../../core/screenConfig';

export type HeaderActionHandler = (action: ScreenAction) => void;

const handlers = new Map<string, HeaderActionHandler>();

export const registerHeaderActionHandler = (id: string, handler: HeaderActionHandler): void => {
  handlers.set(id, handler);
};

export const getHeaderActionHandler = (id: string): HeaderActionHandler | undefined => {
  return handlers.get(id);
};

