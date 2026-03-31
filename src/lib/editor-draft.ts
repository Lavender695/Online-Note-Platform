import { EditorDraft } from "@/types/editor-draft";
export const EDITOR_DRAFT_STORAGE_KEY = 'editor_draft';


function getTextContent(node: unknown): string {
  if (!node) return '';

  if (Array.isArray(node)) {
    return node.map(getTextContent).join('');
  }

  if (typeof node === 'object') {
    const value = node as { text?: unknown; children?: unknown };

    if (typeof value.text === 'string') {
      return value.text;
    }

    if (Array.isArray(value.children)) {
      return value.children.map(getTextContent).join('');
    }
  }

  return '';
}

export function extractTitleFromDraftContent(content: unknown): string {
  if (!Array.isArray(content)) {
    return '无标题笔记';
  }

  for (const block of content) {
    const text = getTextContent(block).trim();
    if (text) {
      return text;
    }
  }

  return '无标题笔记';
}

export function readEditorDraft(): EditorDraft | null {
  if (typeof window === 'undefined') return null;

  const raw = localStorage.getItem(EDITOR_DRAFT_STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as EditorDraft;
  } catch {
    return null;
  }
}

export function writeEditorDraft(draft: EditorDraft): void {
  if (typeof window === 'undefined') return;

  localStorage.setItem(EDITOR_DRAFT_STORAGE_KEY, JSON.stringify(draft));
}

export function clearEditorDraft(): void {
  if (typeof window === 'undefined') return;

  localStorage.removeItem(EDITOR_DRAFT_STORAGE_KEY);
}
