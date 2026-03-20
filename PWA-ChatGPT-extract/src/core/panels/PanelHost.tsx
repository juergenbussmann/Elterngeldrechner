import React from 'react';
import { createPortal } from 'react-dom';
import { panelRegistry } from '../../config/panels';
import { LeftPanel } from './LeftPanel';
import { RightPanel } from './RightPanel';
import { BottomSheet } from './BottomSheet';

export type PanelType = 'left' | 'right' | 'bottom';

export interface PanelState {
  type: PanelType | null;
  panelId: string | null;
  props?: Record<string, unknown>;
}

export interface PanelContainerProps {
  isOpen: boolean;
  onClose: () => void;
  children?: React.ReactNode;
}

interface PanelHostProps {
  state: PanelState;
  onClose: () => void;
}

const NEUTRAL_STATE: PanelState = {
  type: null,
  panelId: null,
  props: undefined,
};

const TRANSITION_DURATION_MS = 240;

export const PanelHost: React.FC<PanelHostProps> = ({ state, onClose }) => {
  const [renderedState, setRenderedState] = React.useState<PanelState>(NEUTRAL_STATE);
  const [isVisible, setIsVisible] = React.useState(false);

  React.useEffect(() => {
    let timeoutId: number | undefined;

    if (state.type && state.panelId) {
      setRenderedState(state);
      timeoutId = window.setTimeout(() => setIsVisible(true), 16);
    } else if (renderedState.type) {
      setIsVisible(false);
      timeoutId = window.setTimeout(() => setRenderedState(NEUTRAL_STATE), TRANSITION_DURATION_MS);
    } else {
      setRenderedState(NEUTRAL_STATE);
      setIsVisible(false);
    }

    return () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [renderedState.type, state]);

  React.useEffect(() => {
    if (!renderedState.type || !renderedState.panelId) {
      return;
    }

    const exists = panelRegistry.some(
      (entry) => entry.id === renderedState.panelId && entry.type === renderedState.type,
    );

    if (!exists) {
      onClose();
    }
  }, [onClose, renderedState]);

  const activeEntry = React.useMemo(
    () =>
      panelRegistry.find(
        (entry) => entry.id === renderedState.panelId && entry.type === renderedState.type,
      ),
    [renderedState.panelId, renderedState.type],
  );

  if (!activeEntry || !renderedState.type || !renderedState.panelId) {
    return null;
  }

  let PanelContainer: React.ComponentType<PanelContainerProps>;

  switch (renderedState.type) {
    case 'left':
      PanelContainer = LeftPanel;
      break;
    case 'right':
      PanelContainer = RightPanel;
      break;
    case 'bottom':
      PanelContainer = BottomSheet;
      break;
    default:
      return null;
  }

  const ContentComponent = activeEntry.component as React.ComponentType<Record<string, unknown>>;
  const componentProps = renderedState.props ?? {};

  const panelContent = (
    <div className="panel-host" aria-hidden={!isVisible && !renderedState.type}>
      <div
        className={`panel-overlay ${isVisible ? 'panel-overlay--visible' : ''}`}
        role="presentation"
        onClick={onClose}
        data-debug="scrim"
      />
      <PanelContainer isOpen={isVisible} onClose={onClose}>
        <ContentComponent {...componentProps} onClose={onClose} />
      </PanelContainer>
    </div>
  );

  return createPortal(panelContent, document.body);
};

