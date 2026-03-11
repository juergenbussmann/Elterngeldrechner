import type { ReactNode } from 'react';

export type ChecklistItem = {
  id: string;
  label: ReactNode;
  description?: string;
};

export type ChecklistState = {
  items: Record<string, boolean>;
  updatedAt: number;
};
