import { clearItems, getValue, setValue } from '../../../shared/lib/storage';
import type { ChecklistState } from '../domain/types';

const STORAGE_KEY = 'stillDailyChecklistState.v1';

export const loadState = (): ChecklistState | null => {
  try {
    return getValue<ChecklistState>(STORAGE_KEY) ?? null;
  } catch {
    return null;
  }
};

export const saveState = (state: ChecklistState): void => {
  try {
    setValue(STORAGE_KEY, state);
  } catch {
    // noop
  }
};

export const clearState = (): void => {
  try {
    clearItems(STORAGE_KEY);
  } catch {
    // noop
  }
};
