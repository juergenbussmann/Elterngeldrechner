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
  const isImage = document?.mimeType?.startsWith('image/') ?? false;
  const isPdf = document?.mimeType === 'application/pdf';
  const imageUrl = useObjectUrl(isImage ? document?.blob : undefined);
  const pdfUrl = useObjectUrl(isPdf ? document?.blob : undefined);

  if (!document) {
    return null;
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('documents.viewerTitle')}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
        {imageUrl && isImage ? (
          <img
            src={imageUrl}
            alt={document.title}
            style={{ width: '100%', borderRadius: theme.radii.md, border: `1px solid ${colors.border}` }}
          />
        ) : pdfUrl && isPdf ? (
          <iframe
            src={pdfUrl}
            title={document.title}
            style={{
              width: '100%',
              minHeight: 400,
              border: `1px solid ${colors.border}`,
              borderRadius: theme.radii.md,
            }}
          />
        ) : document.mimeType === 'text/plain' && document.blob ? (
          <TextDocumentPreview blob={document.blob} />
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

const TextDocumentPreview: React.FC<{ blob: Blob }> = ({ blob }) => {
  const [text, setText] = React.useState<string>('');
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    blob
      .text()
      .then((content) => {
        if (!cancelled) setText(content);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [blob]);

  if (error) return <p style={{ color: 'var(--color-text-secondary)' }}>Inhalt konnte nicht geladen werden.</p>;
  return (
    <pre
      style={{
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        fontSize: '0.9rem',
        padding: 12,
        backgroundColor: 'var(--color-background)',
        borderRadius: 8,
        border: '1px solid var(--color-border)',
        maxHeight: 300,
        overflow: 'auto',
      }}
    >
      {text || '…'}
    </pre>
  );
};
