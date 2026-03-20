/**
 * Glas-Komponente – nutzt Design-Tokens aus layout.css.
 * Keine neuen Styles, nur Reuse von .glass.
 */

import React from 'react';

export interface GlassBoxProps {
  children: React.ReactNode;
  className?: string;
}

export const GlassBox: React.FC<GlassBoxProps> = ({ children, className = '' }) => {
  return <div className={`glass ${className}`.trim()}>{children}</div>;
};
