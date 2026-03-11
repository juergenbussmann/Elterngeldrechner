import React, { useState } from 'react';
import { useI18n } from '../../../shared/lib/i18n';
import { Button } from '../../../shared/ui/Button';
import { generatePdf, shareOrDownload } from '../exportService';
import type { ExportScope } from '../exportTypes';
import { Card } from '../../../shared/ui/Card';
import './ExportPanel.css';

export interface ExportPanelProps {
  scope: ExportScope;
  data: unknown;
  onClose: () => void;
}

export const ExportPanel: React.FC<ExportPanelProps> = ({ scope, data, onClose }) => {
  const { t } = useI18n();
  const [isLoading, setIsLoading] = useState(false);

  const handleShareAsPdf = async () => {
    setIsLoading(true);
    try {
      const blob = await generatePdf({ scope, data });
      await shareOrDownload(blob, 'export.pdf');
      onClose();
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="export-panel">
      <h2 className="export-panel__title">{t('export.title')}</h2>
      <Button
        type="button"
        variant="primary"
        fullWidth
        className="btn--softpill"
        onClick={handleShareAsPdf}
        disabled={isLoading}
      >
        {isLoading ? '…' : t('export.shareAsPdf')}
      </Button>
    </Card>
  );
};
