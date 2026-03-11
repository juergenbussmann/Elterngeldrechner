import React from 'react';
import { PickerOverlayContext } from './pickerOverlayContext';

export const PickerOverlayProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isPickerOpen, setPickerOpen] = React.useState(false);
  const blurTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const registerFocus = React.useCallback(() => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }
    setPickerOpen(true);
  }, []);

  const registerBlur = React.useCallback(() => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
    }
    blurTimeoutRef.current = setTimeout(() => {
      blurTimeoutRef.current = null;
      setPickerOpen(false);
    }, 150);
  }, []);

  const value = React.useMemo(
    () => ({
      isPickerOpen,
      setPickerOpen,
      registerFocus,
      registerBlur,
    }),
    [isPickerOpen, registerFocus, registerBlur]
  );

  return (
    <PickerOverlayContext.Provider value={value}>{children}</PickerOverlayContext.Provider>
  );
};
