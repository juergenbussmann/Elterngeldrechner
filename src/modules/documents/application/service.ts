import type { DocumentItem } from '../domain/types';
import { loadDocuments, removeDocument, saveDocument } from '../infra/storage';

const generateId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `document-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export const listDocuments = async (): Promise<DocumentItem[]> => {
  return await loadDocuments();
};

export const addDocument = async (document: Omit<DocumentItem, 'id'>): Promise<DocumentItem> => {
  const next: DocumentItem = {
    ...document,
    id: generateId(),
  };
  await saveDocument(next);
  return next;
};

export const deleteDocument = async (id: string): Promise<void> => {
  await removeDocument(id);
};
