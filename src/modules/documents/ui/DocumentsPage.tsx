import React from 'react';
import { SectionHeader } from '../../../shared/ui/SectionHeader';
import { Button } from '../../../shared/ui/Button';
import { Card } from '../../../shared/ui/Card';
import { List, ListItem } from '../../../shared/ui/List';
import { Modal } from '../../../shared/ui/Modal';
import { TextInput } from '../../../shared/ui/TextInput';
import { useI18n } from '../../../shared/lib/i18n';
import type { DocumentItem } from '../domain/types';
import { addDocument, deleteDocument, listDocuments } from '../application/service';
import { DocumentViewerDialog } from './DocumentViewerDialog';
import './DocumentsPage.css';
import '../../checklists/styles/softpill-buttons-in-cards.css';
import '../../checklists/styles/softpill-cards.css';

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

const DocumentThumbnail: React.FC<{ item: DocumentItem }> = ({ item }) => {
  const url = useObjectUrl(item.blob);
  if (!url) {
    return null;
  }
  return <img src={url} alt={item.title} className="documents__thumbnail ui-rounded" />;
};

const formatDate = (iso: string, locale: 'de' | 'en'): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  const formatter = new Intl.DateTimeFormat(locale === 'de' ? 'de-DE' : 'en-US', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  return formatter.format(date);
};

const fileNameWithoutExt = (name: string): string => {
  const lastDot = name.lastIndexOf('.');
  return lastDot > 0 ? name.slice(0, lastDot) : name;
};

export const DocumentsPage: React.FC = () => {
  const { t, locale } = useI18n();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const cameraInputRef = React.useRef<HTMLInputElement>(null);
  const [documents, setDocuments] = React.useState<DocumentItem[]>([]);
  const [pendingFile, setPendingFile] = React.useState<File | null>(null);
  const [pendingTitle, setPendingTitle] = React.useState('');
  const [isAddMode, setIsAddMode] = React.useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<DocumentItem | null>(null);

  const load = React.useCallback(async () => {
    const items = await listDocuments();
    setDocuments(items);
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const sorted = React.useMemo(() => {
    return [...documents].sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [documents]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const baseName = fileNameWithoutExt(file.name).trim();
    const now = new Date();
    const formatted = new Intl.DateTimeFormat(locale === 'de' ? 'de-DE' : 'en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(now);
    setPendingTitle(baseName || `${t('documents.defaultTitlePrefix')} ${formatted}`);
    setPendingFile(file);
    setIsAddMode(false);
    setIsAddDialogOpen(true);
    event.target.value = '';
  };

  const handleAdd = async () => {
    if (!pendingFile) {
      return;
    }
    const createdAt = new Date().toISOString();
    const newDoc = await addDocument({
      title: pendingTitle.trim() || t('documents.defaultTitlePrefix'),
      createdAt,
      mimeType: pendingFile.type,
      blob: pendingFile,
    });
    setDocuments((prev) => [newDoc, ...prev]);
    setPendingFile(null);
    setPendingTitle('');
    setIsAddDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    await deleteDocument(id);
    setDocuments((prev) => prev.filter((item) => item.id !== id));
    setSelected(null);
  };

  return (
    <div className="screen-placeholder documents-screen">
      <section className="next-steps next-steps--plain documents__section">
        <SectionHeader as="h1" title={t('documents.title')} />
        <div className="next-steps__stack documents__actions">
          <Button
            type="button"
            variant="secondary"
            className="next-steps__button btn--softpill"
            onClick={() => setIsAddMode((v) => !v)}
          >
            {t('documents.add')}
          </Button>
        </div>
      </section>

      {isAddMode && (
        <Card className="still-daily-checklist__card documents__add-choice-card">
          <div className="next-steps__stack documents__add-choice-buttons">
            <Button
              type="button"
              variant="secondary"
              className="next-steps__button btn--softpill"
              onClick={() => {
                fileInputRef.current?.click();
              }}
            >
              {t('documents.addFromFile')}
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="next-steps__button btn--softpill"
              onClick={() => {
                cameraInputRef.current?.click();
              }}
            >
              {t('documents.addFromCamera')}
            </Button>
          </div>
        </Card>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        className="documents__file-input"
        onChange={handleFileChange}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="documents__file-input"
        onChange={handleFileChange}
      />

      <p className="documents__inline-info ui-text-muted ui-text-sm">
        {t('documents.intro')}
        <br />
        {t('documents.privacy')}
      </p>

      <section className="documents__content-section">
        {sorted.length === 0 ? (
          <Card className="still-daily-checklist__card">
            <p className="documents__empty-text">{t('documents.empty')}</p>
          </Card>
        ) : (
          <List className="documents__list">
          {sorted.map((item) => (
            <ListItem key={item.id} className="documents__item">
              <Card
                className="still-daily-checklist__card documents__doc-card"
                onClick={() => setSelected(item)}
              >
                <DocumentThumbnail item={item} />
                <div className="documents__doc-body">
                  <strong>{item.title}</strong>
                  <div className="documents__meta">{formatDate(item.createdAt, locale)}</div>
                </div>
              </Card>
            </ListItem>
          ))}
          </List>
        )}
      </section>

      <Modal isOpen={isAddDialogOpen} onClose={() => setIsAddDialogOpen(false)} title={t('documents.add')}>
        <div className="documents__modal-content">
          <label className="documents__modal-label ui-text-sm">
            <span>{t('documents.field.title')}</span>
            <TextInput value={pendingTitle} onChange={(event) => setPendingTitle(event.target.value)} />
          </label>
          <Button
            type="button"
            className="next-steps__button btn--softpill"
            onClick={handleAdd}
            disabled={!pendingTitle.trim()}
          >
            {t('documents.add')}
          </Button>
        </div>
      </Modal>

      <DocumentViewerDialog
        isOpen={Boolean(selected)}
        document={selected}
        onClose={() => setSelected(null)}
        onDelete={handleDelete}
      />
    </div>
  );
};
