import React from 'react';
import { useI18n } from '../../../shared/lib/i18n';
import { Card } from '../../../shared/ui/Card';
import { Button } from '../../../shared/ui/Button';
import './CalendarBulkExportResultPanel.css';

export interface CalendarBulkExportResultPanelProps {
  onClose: () => void;
  variant: 'empty' | 'success';
}

export const CalendarBulkExportResultPanel: React.FC<CalendarBulkExportResultPanelProps> = ({
  onClose,
  variant,
}) => {
  const { t } = useI18n();

  const message =
    variant === 'empty'
      ? t('appointments.bulkExport.noFuture')
      : t('appointments.bulkExport.success');

  return (
    <Card className="calendar-bulk-export-result-panel">
      <p className="calendar-bulk-export-result-panel__message">{message}</p>
      <Button
        type="button"
        variant="primary"
        className="btn--softpill"
        onClick={onClose}
      >
        {t('common.close')}
      </Button>
    </Card>
  );
};
