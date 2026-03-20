import React from 'react';
import { Card } from '../shared/ui/Card';
import { Button } from '../shared/ui/Button';
import { SectionHeader } from '../shared/ui/SectionHeader';
import { useNavigation } from '../shared/lib/navigation/useNavigation';

export type NextStepItem = {
  label: string;
  to: string;
};

export type NextStepsCardProps = {
  title?: string;
  items: NextStepItem[];
};

export const NextStepsCard: React.FC<NextStepsCardProps> = ({
  title = 'Nächste Schritte',
  items,
}) => {
  const { goTo } = useNavigation();

  if (!items || items.length === 0) {
    return null;
  }

  return (
    <section className="home-section">
      <SectionHeader title={title} />
      <Card>
        <div className="home-screen__actions">
          {items.map((item) => (
            <Button
              key={`${item.to}-${item.label}`}
              type="button"
              variant="secondary"
              onClick={() => goTo(item.to)}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </Card>
    </section>
  );
};

