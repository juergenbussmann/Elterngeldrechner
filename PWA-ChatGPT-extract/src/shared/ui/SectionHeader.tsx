import React from 'react';

export interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onActionClick?: () => void;
  as?: 'h1' | 'h2';
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  actionLabel,
  onActionClick,
  as = 'h2',
}) => {
  const HeadingTag = as;

  return (
    <div className="section-header">
      <HeadingTag className="section-header__title">{title}</HeadingTag>
      {actionLabel && onActionClick && (
        <button
          type="button"
          className="section-header__action"
          onClick={onActionClick}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};

