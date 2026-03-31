export interface EditorDraft {
  userId: string | null;
  noteId: string | null;
  content: any | null;
  tags: string[];
  updatedAt: string;
}