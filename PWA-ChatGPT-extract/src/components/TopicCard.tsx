import React from 'react';
import { Card } from '../shared/ui/Card';

type TopicCardProps = {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  style?: React.CSSProperties;
  className?: string;
};

export const TopicCard: React.FC<TopicCardProps> = ({
  title,
  description,
  icon,
  onClick,
  style,
  className,
}) => {
  const combinedClassName = ['home-section__topic-card', className].filter(Boolean).join(' ');

  return (
    <Card className={combinedClassName} style={style} onClick={onClick}>
      {icon ? <span className="topic-card__icon">{icon}</span> : null}
      <div className="topic-card__content">
        <h3 className="home-section__topic-card-title">{title}</h3>
        {description ? (
          <p className="home-section__topic-card-description">{description}</p>
        ) : null}
      </div>
    </Card>
  );
};
