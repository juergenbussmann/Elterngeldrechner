export type DocumentItem = {
  id: string;
  title: string;
  createdAt: string;
  notes?: string;
  mimeType: string;
  blob: Blob;
  tags?: string[];
};
