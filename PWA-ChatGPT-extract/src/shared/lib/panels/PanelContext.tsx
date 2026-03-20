import React from 'react';
/* eslint-disable react-refresh/only-export-components */
import type { PanelState } from '../../../core/panels/PanelHost';

interface PanelContextValue {
  state: PanelState;
  openLeftPanel: (panelId: string, props?: Record<string, unknown>) => void;
  openRightPanel: (panelId: string, props?: Record<string, unknown>) => void;
  openBottomSheet: (panelId: string, props?: Record<string, unknown>) => void;
  closePanel: () => void;
}

const neutralState: PanelState = {
  type: null,
  panelId: null,
  props: undefined,
};

const PanelContext = React.createContext<PanelContextValue | null>(null);

export const PanelProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = React.useState<PanelState>(neutralState);

  const openLeftPanel = React.useCallback<PanelContextValue['openLeftPanel']>((panelId, props) => {
    setState({ type: 'left', panelId, props });
  }, []);

  const openRightPanel = React.useCallback<PanelContextValue['openRightPanel']>((panelId, props) => {
    setState({ type: 'right', panelId, props });
  }, []);

  const openBottomSheet = React.useCallback<PanelContextValue['openBottomSheet']>((panelId, props) => {
    setState({ type: 'bottom', panelId, props });
  }, []);

  const closePanel = React.useCallback(() => setState(neutralState), []);

  const value = React.useMemo(
    () => ({
      state,
      openLeftPanel,
      openRightPanel,
      openBottomSheet,
      closePanel,
    }),
    [state, openBottomSheet, openLeftPanel, openRightPanel, closePanel],
  );

  return <PanelContext.Provider value={value}>{children}</PanelContext.Provider>;
};

export const usePanels = (): PanelContextValue => {
  const context = React.useContext(PanelContext);

  if (!context) {
    throw new Error('usePanels must be used within a PanelProvider');
  }

  return context;
};

