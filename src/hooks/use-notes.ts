'use client';
import { useState, useEffect, useCallback } from 'react';
import { Note } from '@/types/note';
import { createClerkSupabaseClient } from '@/lib/supabase';
import { useAuth, useUser } from '@clerk/nextjs';
import { extractTitleFromDraftContent } from '@/lib/editor-draft';
import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';
import { slateNodesToInsertDelta, yTextToSlateElement } from '@slate-yjs/core';

type NoteRow = {
  id?: unknown;
  title?: unknown;
  content?: unknown;
  user_id?: unknown;
  created_at?: unknown;
  updated_at?: unknown;
  tags?: unknown;
  sync_state?: unknown;
  syncState?: unknown;
};

type RichTextNode = {
  children?: Array<{ text?: string }>;
};

const toSafeString = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : fallback;

const toSafeTags = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((tag): tag is string => typeof tag === 'string');
};

const toSafeSyncState = (value: unknown): Note['syncState'] => {
  if (value === 'synced' || value === 'dirty' || value === 'local') {
    return value;
  }

  return 'local';
};

const toSafeContentString = (value: unknown): string => {
  if (typeof value === 'string') {
    return value;
  }

  if (value === null || value === undefined) {
    return '';
  }

  try {
    return JSON.stringify(value);
  } catch {
    return '';
  }
};

const sortNotesByUpdatedAt = (items: Note[]): Note[] =>
  [...items].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

const parseContentToNodes = (content: string): Record<string, unknown>[] => {
  try {
    const parsed = JSON.parse(content) as unknown;
    if (Array.isArray(parsed)) {
      return parsed as Record<string, unknown>[];
    }
  } catch {
    // no-op
  }

  const fallbackText = typeof content === 'string' ? content : '';

  return [
    { children: [{ text: fallbackText.trim() ? fallbackText : 'Untitled' }], type: 'h1' },
    { children: [{ text: fallbackText.trim() ? '' : '' }], type: 'p' },
  ];
};

const mapRowToNote = (row: NoteRow): Note => ({
  id: toSafeString(row.id),
  title: toSafeString(row.title, 'Untitled note'),
  content: toSafeContentString(row.content),
  user_id: toSafeString(row.user_id),
  created_at: toSafeString(row.created_at, new Date(0).toISOString()),
  updated_at: toSafeString(row.updated_at, new Date(0).toISOString()),
  tags: toSafeTags(row.tags),
  syncState: toSafeSyncState(row.sync_state ?? row.syncState ?? 'synced'),
});

const mapLocalRowToNote = (row: unknown, userId: string): Note | null => {
  if (!row || typeof row !== 'object') {
    return null;
  }

  const value = row as NoteRow;
  const id = toSafeString(value.id);

  if (!id) {
    return null;
  }

  const now = new Date().toISOString();

  return {
    id,
    title: toSafeString(value.title, 'Untitled note'),
    content: toSafeContentString(value.content),
    user_id: toSafeString(value.user_id, userId),
    created_at: toSafeString(value.created_at, now),
    updated_at: toSafeString(value.updated_at, now),
    tags: toSafeTags(value.tags),
    syncState: toSafeSyncState(value.sync_state ?? value.syncState),
  };
};

const toUserStorageKey = (userId: string) => `notes_${userId}`;

const readLocalNotes = (userId: string): Note[] => {
  if (typeof window === 'undefined') {
    return [];
  }

  const raw = localStorage.getItem(toUserStorageKey(userId));
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    const mapped = parsed
      .map((item) => mapLocalRowToNote(item, userId))
      .filter((item): item is Note => item !== null);

    return sortNotesByUpdatedAt(mapped);
  } catch {
    return [];
  }
};

const writeLocalNotes = (userId: string, notes: Note[]) => {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.setItem(toUserStorageKey(userId), JSON.stringify(notes));
};

const readContentFromIndexedDb = async (noteId: string): Promise<string> => {
  const yDoc = new Y.Doc();
  const persistence = new IndexeddbPersistence(`note:${noteId}`, yDoc);

  try {
    await persistence.whenSynced;
    const sharedType = yDoc.get('content', Y.XmlText);
    const content = yTextToSlateElement(sharedType).children;
    return JSON.stringify(Array.isArray(content) ? content : []);
  } finally {
    persistence.destroy();
    yDoc.destroy();
  }
};

const writeContentToIndexedDb = async (noteId: string, content: string): Promise<void> => {
  const yDoc = new Y.Doc();
  const persistence = new IndexeddbPersistence(`note:${noteId}`, yDoc);

  try {
    await persistence.whenSynced;
    const sharedType = yDoc.get('content', Y.XmlText);
    const nodes = parseContentToNodes(content);

    yDoc.transact(() => {
      sharedType.delete(0, sharedType.length);
      sharedType.applyDelta(
        slateNodesToInsertDelta(nodes as unknown as Parameters<typeof slateNodesToInsertDelta>[0])
      );
    });
  } finally {
    persistence.destroy();
    yDoc.destroy();
  }
};

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<Note[]>([]);

  const { getToken } = useAuth();
  const { user, isLoaded } = useUser();

  const getSupabaseClient = useCallback(async () => {
    const token = await getToken({ template: 'supabase' });

    if (!token) {
      throw new Error('Missing Clerk Supabase token');
    }

    return createClerkSupabaseClient(token);
  }, [getToken]);

  const updateLocalNotes = useCallback(
    (updater: (prev: Note[]) => Note[]) => {
      if (!user) {
        throw new Error('User not authenticated');
      }

      setNotes((prev) => {
        const next = sortNotesByUpdatedAt(updater(prev));
        writeLocalNotes(user.id, next);
        return next;
      });
    },
    [user]
  );

  // Initialize from local metadata only (Local-first).
  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    if (!user) {
      queueMicrotask(() => {
        setNotes([]);
        setSearchResults([]);
        setLoading(false);
      });
      return;
    }

    const localNotes = readLocalNotes(user.id);
    queueMicrotask(() => {
      setNotes(localNotes);
      setError(null);
      setLoading(false);
    });
  }, [user, isLoaded]);

  // ---------------- Core operations ---------------- //

  const getNoteById = async (id: string) => {
    return notes.find((note) => note.id === id);
  };

  const createNote = async (title: string, content: string, tags: string[] = []) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    const now = new Date().toISOString();
    const contentNodes = parseContentToNodes(content);
    const normalizedContent = JSON.stringify(contentNodes);
    const resolvedTitle = title.trim() || extractTitleFromDraftContent(contentNodes);

    const newNote: Note = {
      id: crypto.randomUUID(),
      title: resolvedTitle,
      content: normalizedContent,
      user_id: user.id,
      created_at: now,
      updated_at: now,
      tags,
      syncState: 'dirty',
    };

    try {
      await writeContentToIndexedDb(newNote.id, normalizedContent);
    } catch {
      // Metadata should still be created even if IDB write fails.
    }

    updateLocalNotes((prev) => [newNote, ...prev.filter((note) => note.id !== newNote.id)]);
    setError(null);

    return newNote;
  };

  const updateNote = async (id: string, title: string, content: string, tags?: string[]) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    let updatedNote: Note | undefined;

    updateLocalNotes((prev) => {
      const current = prev.find((note) => note.id === id);
      if (!current) {
        return prev;
      }

      const now = new Date().toISOString();
      updatedNote = {
        ...current,
        title,
        content,
        tags: tags ?? current.tags,
        updated_at: now,
        syncState: current.syncState === 'synced' ? 'dirty' : current.syncState,
      };

      return prev.map((note) => (note.id === id ? updatedNote! : note));
    });

    setError(null);
    return updatedNote;
  };

  const deleteNotes = async (ids: string[]) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    if (ids.length === 0) {
      return;
    }

    updateLocalNotes((prev) => prev.filter((note) => !ids.includes(note.id)));
    setSearchResults((prev) => prev.filter((note) => !ids.includes(note.id)));
    setError(null);
  };

  const pushToCloud = async (noteId: string) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    const target = notes.find((note) => note.id === noteId);
    if (!target) {
      throw new Error('Note not found in local metadata');
    }

    let latestContent = target.content;

    try {
      latestContent = await readContentFromIndexedDb(noteId);
    } catch {
      // If indexeddb read fails, fallback to existing local metadata content.
    }

    const contentNodes = parseContentToNodes(latestContent);
    const normalizedContent = JSON.stringify(contentNodes);
    const resolvedTitle = target.title.trim() || extractTitleFromDraftContent(contentNodes);

    const supabase = await getSupabaseClient();
    const now = new Date().toISOString();

    const { data, error: upsertError } = await supabase
      .from('notes')
      .upsert(
        {
          id: target.id,
          user_id: user.id,
          title: resolvedTitle,
          tags: target.tags,
          content: contentNodes,
          updated_at: now,
        },
        { onConflict: 'id' }
      )
      .select('*')
      .maybeSingle();

    if (upsertError) {
      throw new Error(upsertError.message);
    }

    const cloudMapped = data ? mapRowToNote(data as NoteRow) : null;

    const syncedNote: Note = {
      ...(cloudMapped ?? target),
      id: target.id,
      user_id: user.id,
      title: cloudMapped?.title ?? resolvedTitle,
      content: cloudMapped?.content ?? normalizedContent,
      tags: cloudMapped?.tags ?? target.tags,
      created_at: cloudMapped?.created_at ?? target.created_at,
      updated_at: cloudMapped?.updated_at ?? now,
      syncState: 'synced',
    };

    updateLocalNotes((prev) => prev.map((note) => (note.id === noteId ? syncedNote : note)));
    setError(null);

    return syncedNote;
  };

  const pullFromCloud = async () => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    const supabase = await getSupabaseClient();
    const { data, error: fetchError } = await supabase
      .from('notes')
      .select('*')
      .order('updated_at', { ascending: false });

    if (fetchError) {
      throw new Error(fetchError.message);
    }

    const cloudNotes = ((data ?? []) as NoteRow[]).map((row) => {
      const mapped = mapRowToNote(row);
      return {
        ...mapped,
        syncState: 'synced' as const,
      };
    });

    await Promise.all(
      cloudNotes.map(async (note) => {
        await writeContentToIndexedDb(note.id, note.content);
      })
    );

    let mergedNotes: Note[] = [];

    updateLocalNotes((prev) => {
      const merged = new Map(prev.map((note) => [note.id, note]));

      cloudNotes.forEach((cloudNote) => {
        merged.set(cloudNote.id, {
          ...cloudNote,
          user_id: cloudNote.user_id || user.id,
          syncState: 'synced',
        });
      });

      mergedNotes = Array.from(merged.values());
      return mergedNotes;
    });

    setError(null);
    return sortNotesByUpdatedAt(mergedNotes);
  };

  // ---------------- Search and filtering ---------------- //

  const searchNotes = useCallback(
    (query: string, selectedTags: string[] = []) => {
      if (!query.trim() && selectedTags.length === 0) {
        setSearchResults([]);
        return [];
      }

      const results = notes.filter((note) => {
        const titleMatch = note.title.toLowerCase().includes(query.toLowerCase());
        let contentMatch = false;
        try {
          if (note.content) {
            const contentObj = JSON.parse(note.content) as unknown;
            const plainText = Array.isArray(contentObj)
              ? contentObj
                  .map((node) => {
                    const typedNode = node as RichTextNode;
                    return typedNode.children?.[0]?.text || '';
                  })
                  .join(' ')
              : '';
            contentMatch = plainText.toLowerCase().includes(query.toLowerCase());
          }
        } catch {
          contentMatch = note.content?.toLowerCase().includes(query.toLowerCase()) || false;
        }

        const tagMatch =
          selectedTags.length === 0 ||
          (note.tags && selectedTags.every((tag) => note.tags.includes(tag)));

        return (titleMatch || contentMatch) && tagMatch;
      });

      setSearchResults(results);
      setError(null);
      return results;
    },
    [notes]
  );

  const getAllTags = useCallback(() => {
    const tagsSet = new Set<string>();
    notes.forEach((note) => {
      if (note.tags) {
        note.tags.forEach((tag) => tagsSet.add(tag));
      }
    });
    return Array.from(tagsSet).sort();
  }, [notes]);

  const refreshNotes = useCallback(async () => {
    if (!user) {
      return;
    }
    const localNotes = readLocalNotes(user.id);
    setNotes(localNotes);
  }, [user]);

  return {
    notes,
    loading,
    error,
    getSupabaseClient,
    searchResults,
    getNoteById,
    createNote,
    updateNote,
    deleteNotes,
    pushToCloud,
    pullFromCloud,
    searchNotes,
    getAllTags,
    refreshNotes,
  };
}
