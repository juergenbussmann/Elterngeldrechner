import React from 'react';
import type { PanelContainerProps } from './PanelHost';

export const BottomSheet: React.FC<PanelContainerProps> = ({ isOpen, onClose, children }) => {
  return (
    <section
      className={`panel-surface panel-surface--bottom ${isOpen ? 'panel-surface--open' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="Bottom sheet"
      data-debug="surface"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="bottom-sheet__handle-bar" aria-hidden="true" />
      <div className="panel-surface__header">
        <button type="button" className="panel-close-button" aria-label="Close sheet" onClick={onClose}>
          ×
        </button>
      </div>
      <div className="panel-surface__body" data-debug="body">
        {children}
      </div>
    </section>
  );
};

