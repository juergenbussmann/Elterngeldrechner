/**
 * Glass-Button – nutzt .glass-btn aus layout.css.
 * Icon oben, Text unten (Mobile-First).
 * Verwendet Stroke-SVG.
 */

import React from 'react';

export interface GlassButtonProps {
  children: React.ReactNode;
  icon?: React.ReactNode;
  onClick?: () => void;
  className?: string;
  type?: 'button' | 'submit';
}

export const GlassButton: React.FC<GlassButtonProps> = ({
  children,
  icon,
  onClick,
  className = '',
  type = 'button',
}) => {
  return (
    <button
      type={type}
      className={`glass-btn ${icon ? 'glass-btn--stack' : ''} ${className}`.trim()}
      onClick={onClick}
    >
      {icon && <span className="glass-btn__icon">{icon}</span>}
      <span className="glass-btn__text">{children}</span>
    </button>
  );
};
