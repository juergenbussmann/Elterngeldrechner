export type ChecklistItem = {
  id: string;
  text: string;
  done: boolean;
  note?: string;
};

export type NotesState = {
  notesText: string;
  checklistItems: ChecklistItem[];
};
