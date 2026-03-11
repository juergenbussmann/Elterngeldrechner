import React from 'react';
import './moduleLayout.css';

export interface ModulePageProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

/**
 * Standard-Seitenhülle für neue Screens (SSoT).
 * Nutzt bestehende App-Paddings, keine neuen Tokens.
 * Nur Layout (flex/gap), keine Farben/Shadows.
 *
 * @see docs/SSOT-AppStyle.md
 */
export const ModulePage: React.FC<ModulePageProps> = ({ children, className, ...rest }) => {
  return (
    <div className={`module-page ${className ?? ''}`.trim()} {...rest}>
      {children}
    </div>
  );
};

export interface ModuleSectionProps extends React.HTMLAttributes<HTMLElement> {
  as?: 'section' | 'div';
  title?: string;
  children: React.ReactNode;
}

/**
 * Section mit optionaler Überschrift.
 */
export const ModuleSection: React.FC<ModuleSectionProps> = ({
  as: Tag = 'section',
  title,
  children,
  className,
  ...rest
}) => {
  return (
    <Tag className={`module-section ${className ?? ''}`.trim()} {...rest}>
      {title ? <h2 className="module-section__title">{title}</h2> : null}
      {children}
    </Tag>
  );
};

export interface ModuleStackProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

/**
 * Stack wie Bild 2: flex column, gap 10px, children full width.
 */
export const ModuleStack: React.FC<ModuleStackProps> = ({ children, className, ...rest }) => {
  return (
    <div className={`module-stack ${className ?? ''}`.trim()} {...rest}>
      {children}
    </div>
  );
};
