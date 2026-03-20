import React from 'react';

export interface PickerOverlayContextValue {
  isPickerOpen: boolean;
  setPickerOpen: (open: boolean) => void;
  registerFocus: () => void;
  registerBlur: () => void;
}

export const PickerOverlayContext = React.createContext<PickerOverlayContextValue | null>(null);
