import React from 'react';
import { Modal } from '../../../shared/ui/Modal';
import { Button } from '../../../shared/ui/Button';
import { useI18n } from '../../../shared/lib/i18n';
import { useTheme } from '../../../core/theme/ThemeProvider';
import type { DocumentItem } from '../domain/types';

type DocumentViewerDialogProps = {
  isOpen: boolean;
  document: DocumentItem | null;
  onClose: () => void;
  onDelete: (id: string) => void;
};

const useObjectUrl = (blob?: Blob): string => {
  const [url, setUrl] = React.useState('');

  React.useEffect(() => {
    if (!blob) {
      setUrl('');
      return;
    }
    const objectUrl = URL.createObjectURL(blob);
    setUrl(objectUrl);
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [blob]);

  return url;
};

export const DocumentViewerDialog: React.FC<DocumentViewerDialogProps> = ({
  isOpen,
  document,
  onClose,
  onDelete,
}) => {
  const { t } = useI18n();
  const theme = useTheme();
  const { spacing, colors } = theme;
  const imageUrl = useObjectUrl(document?.blob);

  if (!document) {
    return null;
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('documents.viewerTitle')}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={document.title}
            style={{ width: '100%', borderRadius: theme.radii.md, border: `1px solid ${colors.border}` }}
          />
        ) : null}
        <div>
          <strong>{document.title}</strong>
          {document.notes ? <p style={{ marginTop: spacing.xs }}>{document.notes}</p> : null}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: spacing.sm }}>
          <Button type="button" variant="ghost" onClick={() => onDelete(document.id)}>
            {t('documents.delete')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
