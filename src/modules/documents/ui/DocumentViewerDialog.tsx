import React, { useState, useCallback } from 'react';
import { Modal } from '../../../shared/ui/Modal';
import { Button } from '../../../shared/ui/Button';
import { useI18n } from '../../../shared/lib/i18n';
import { isNativeAndroid } from '../../../shared/lib/platform';
import { useTheme } from '../../../core/theme/ThemeProvider';
import type { DocumentItem } from '../domain/types';
import {
  openBlobInNewTab,
  downloadBlob,
  openPdfNative,
  shareOrDownloadPdfMobile,
  sharePdfNative,
} from '../lib/pdfActions';

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

const useIsMobile = (): boolean => {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 768px)').matches : false
  );

  React.useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const handler = () => setIsMobile(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return isMobile;
};

const getPdfFilename = (title: string): string => {
  const base = title.replace(/[^\w\säöüÄÖÜß-]/gi, '').trim() || 'document';
  return base.endsWith('.pdf') ? base : `${base}.pdf`;
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
  const isMobile = useIsMobile();

  const isImage = document?.mimeType?.startsWith('image/') ?? false;
  const isPdf = document?.mimeType === 'application/pdf';

  const imageUrl = useObjectUrl(isImage ? document?.blob : undefined);
  const pdfUrl = useObjectUrl(isPdf ? document?.blob : undefined);

  const handlePdfOpen = useCallback(async () => {
    console.info('[pdf] open:handler:start', { id: document?.id });
    try {
      if (!document?.blob || !isPdf) {
        console.error('[pdf] open:handler:error', new Error('guard: missing blob or not application/pdf'));
        return;
      }
      const nativeAndroid = isNativeAndroid();
      console.info('[pdf] open:handler:before-action', {
        branch: nativeAndroid ? 'android-native-open' : 'web-open-tab',
      });
      const pdfFilename = getPdfFilename(document.title);
      if (nativeAndroid) {
        try {
          await openPdfNative(document.blob, pdfFilename);
        } catch (err) {
          console.error('[pdf] native:open:error', err);
          try {
            await sharePdfNative(document.blob, pdfFilename);
          } catch (err2) {
            console.error('[pdf] native:error', err2);
            await shareOrDownloadPdfMobile(document.blob, document.title, pdfFilename);
          }
        }
      } else {
        openBlobInNewTab(document.blob);
      }
      console.info('[pdf] open:handler:after-action');
    } catch (error) {
      console.error('[pdf] open:handler:error', error);
    }
  }, [document?.id, document?.title, document?.blob, isPdf]);

  const handlePdfDownload = useCallback(() => {
    console.info('[pdf] download:handler:start', { id: document?.id });
    try {
      if (!document?.blob || !isPdf) {
        console.error('[pdf] download:handler:error', new Error('guard: missing blob or not application/pdf'));
        return;
      }
      console.info('[pdf] download:handler:before-action');
      downloadBlob(document.blob, getPdfFilename(document.title));
      console.info('[pdf] download:handler:after-action');
    } catch (error) {
      console.error('[pdf] download:handler:error', error);
    }
  }, [document?.id, document?.title, document?.blob, isPdf]);

  const handlePdfShare = useCallback(async () => {
    console.info('[pdf] share:start', { id: document?.id });
    try {
      if (!document?.blob || !isPdf) {
        console.error('[pdf] share:error', new Error('guard: missing blob or not application/pdf'));
        return;
      }
      await shareOrDownloadPdfMobile(document.blob, document.title, getPdfFilename(document.title));
    } catch (error) {
      console.error('[pdf] share:error', error);
    }
  }, [document?.id, document?.title, document?.blob, isPdf]);

  if (!document) {
    return null;
  }

  const showPdfIframe = isPdf && !isMobile && pdfUrl;
  const showPdfActions = isPdf && document.blob;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('documents.viewerTitle')}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
        {imageUrl && isImage ? (
          <img
            src={imageUrl}
            alt={document.title}
            style={{ width: '100%', borderRadius: theme.radii.md, border: `1px solid ${colors.border}` }}
          />
        ) : showPdfIframe ? (
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
        ) : null}

        {showPdfActions ? (
          <div
            style={{
              padding: spacing.lg,
              backgroundColor: 'var(--color-background)',
              border: `1px solid ${colors.border}`,
              borderRadius: theme.radii.md,
            }}
          >
            <p style={{ margin: 0, fontWeight: 600, color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>
              {t('documents.pdfType')}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm }}>
              <Button
                type="button"
                variant="primary"
                onClick={() => {
                  console.info('[pdf] open:click');
                  void handlePdfOpen().catch((error) => console.error('[pdf] open:handler:error', error));
                }}
              >
                {isMobile ? t('documents.pdfOpenMobile') : t('documents.pdfOpen')}
              </Button>
              {typeof navigator.share === 'function' && !isMobile && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    void handlePdfShare().catch((error) => console.error('[pdf] share:error', error));
                  }}
                >
                  {t('documents.pdfShare')}
                </Button>
              )}
              {!isMobile && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    console.info('[pdf] download:click');
                    handlePdfDownload();
                  }}
                >
                  {t('documents.pdfDownload')}
                </Button>
              )}
            </div>
          </div>
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
