import React from 'react';
import { useI18n } from '../../shared/lib/i18n';
import { Card } from '../../shared/ui/Card';
import { Button } from '../../shared/ui/Button';

interface OfflineScreenProps {
  onRetry?: () => void;
}

export const OfflineScreen: React.FC<OfflineScreenProps> = ({ onRetry }) => {
  const { t } = useI18n();

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
      return;
    }

    window.location.reload();
  };

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '60vh',
        padding: '1rem 0',
      }}
    >
      <Card
        style={{
          width: '100%',
          maxWidth: 520,
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
        }}
      >
        <h2 style={{ margin: 0 }}>{t('core.offline.title')}</h2>
        <p style={{ margin: 0 }}>{t('core.offline.body')}</p>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Button type="button" onClick={handleRetry}>
            {t('core.offline.retry')}
          </Button>
        </div>
      </Card>
    </div>
  );
};

