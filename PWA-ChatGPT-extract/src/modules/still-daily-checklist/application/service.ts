import type { ChecklistItem, ChecklistState } from '../domain/types';

const buildEmptyItems = (template: ChecklistItem[]): Record<string, boolean> => {
  return template.reduce<Record<string, boolean>>((acc, item) => {
    acc[item.id] = false;
    return acc;
  }, {});
};

export const getInitialState = (template: ChecklistItem[]): ChecklistState => {
  return {
    items: buildEmptyItems(template),
    updatedAt: Date.now(),
  };
};

export const mergeWithTemplate = (
  loaded: ChecklistState | null,
  template: ChecklistItem[],
): ChecklistState => {
  const base = getInitialState(template);
  if (!loaded) {
    return base;
  }

  return {
    items: {
      ...base.items,
      ...(loaded.items ?? {}),
    },
    updatedAt: loaded.updatedAt ?? base.updatedAt,
  };
};

export const toggle = (state: ChecklistState, id: string): ChecklistState => {
  if (!Object.prototype.hasOwnProperty.call(state.items, id)) {
    return state;
  }

  return {
    ...state,
    items: {
      ...state.items,
      [id]: !state.items[id],
    },
    updatedAt: Date.now(),
  };
};

export const setAll = (state: ChecklistState, value: boolean): ChecklistState => {
  const nextItems = Object.keys(state.items).reduce<Record<string, boolean>>((acc, key) => {
    acc[key] = value;
    return acc;
  }, {});

  return {
    ...state,
    items: nextItems,
    updatedAt: Date.now(),
  };
};
