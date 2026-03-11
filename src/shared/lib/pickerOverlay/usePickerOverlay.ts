import React from 'react';
import type { PickerOverlayContextValue } from './pickerOverlayContext';
import { PickerOverlayContext } from './pickerOverlayContext';

export const usePickerOverlay = (): PickerOverlayContextValue | null =>
  React.useContext(PickerOverlayContext);
