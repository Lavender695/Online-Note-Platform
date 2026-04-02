'use client';
import { useState, useEffect, useCallback } from 'react';
import { Note } from '@/types/note';
import { createClerkSupabaseClient } from '@/lib/supabase';
import { useAuth, useUser } from '@clerk/nextjs';

type NoteRow = {
  id?: unknown;
  title?: unknown;
  content?: unknown;
  user_id?: unknown;
  created_at?: unknown;
  updated_at?: unknown;
  tags?: unknown;
};

const toSafeString = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : fallback;

const toSafeTags = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((tag): tag is string => typeof tag === 'string');
};

const mapRowToNote = (row: NoteRow): Note => ({
  id: toSafeString(row.id),
  title: toSafeString(row.title, '无标题笔记'),
  content: toSafeString(row.content, ''),
  user_id: toSafeString(row.user_id),
  created_at: toSafeString(row.created_at, new Date(0).toISOString()),
  updated_at: toSafeString(row.updated_at, new Date(0).toISOString()),
  tags: toSafeTags(row.tags),
});

type RichTextNode = {
  children?: Array<{ text?: string }>;
};

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  }

  return 'Unknown error';
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

  // 初始化：从 Supabase 加载数据
  useEffect(() => {
    if (!isLoaded) return;

    if (!user) {
      setNotes([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const loadNotes = async () => {
      setLoading(true);
      try {
        const supabase = await getSupabaseClient();
        const { data, error: fetchError } = await supabase
          .from('notes')
          .select('*')
          .order('updated_at', { ascending: false });

        if (fetchError) {
          throw fetchError;
        }

        if (!cancelled) {
          const fetchedNotes = ((data ?? []) as NoteRow[]).map(mapRowToNote);
          setNotes(fetchedNotes);
          setError(null);
        }
      } catch (e: unknown) {
        if (!cancelled) {
          const message = getErrorMessage(e);
          setError('加载笔记失败: ' + message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadNotes();

    return () => {
      cancelled = true;
    };
  }, [user, isLoaded, getSupabaseClient]);

  // ---------------- 核心操作方法 ---------------- //

  const getNoteById = async (id: string) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    const supabase = await getSupabaseClient();
    const { data, error: fetchError } = await supabase
      .from('notes')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (fetchError) {
      throw new Error(fetchError.message);
    }

    return data ? mapRowToNote(data as NoteRow) : undefined;
  };

  const createNote = async (title: string, content: string, tags: string[] = []) => {
    if (!user) throw new Error('User not authenticated');

    const supabase = await getSupabaseClient();
    const { data, error: insertError } = await supabase
      .from('notes')
      .insert({
        title,
        content,
        tags,
      })
      .select('*')
      .single();

    if (insertError) {
      throw new Error(insertError.message);
    }

    const newNote = mapRowToNote(data as NoteRow);
    setNotes((prev) => [newNote, ...prev.filter((note) => note.id !== newNote.id)]);
    setError(null);

    return newNote;
  };

  const updateNote = async (id: string, title: string, content: string, tags?: string[]) => {
    if (!user) throw new Error('User not authenticated');

    const supabase = await getSupabaseClient();
    const currentTags = tags ?? notes.find((note) => note.id === id)?.tags ?? [];

    const { data, error: updateError } = await supabase
      .from('notes')
      .update({
        title,
        content,
        tags: currentTags,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .maybeSingle();

    if (updateError) {
      throw new Error(updateError.message);
    }

    if (!data) {
      return undefined;
    }

    const updatedNote = mapRowToNote(data as NoteRow);

    setNotes((prev) => {
      const next = prev.map((note) => (note.id === id ? updatedNote : note));
      next.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      return next;
    });
    setError(null);

    return updatedNote;
  };

  const deleteNotes = async (ids: string[]) => {
    if (!user) throw new Error('User not authenticated');
    if (ids.length === 0) return;

    const supabase = await getSupabaseClient();
    const { error: deleteError } = await supabase
      .from('notes')
      .delete()
      .in('id', ids);

    if (deleteError) {
      throw new Error(deleteError.message);
    }

    setNotes((prev) => prev.filter((note) => !ids.includes(note.id)));
    setSearchResults((prev) => prev.filter((note) => !ids.includes(note.id)));
    setError(null);
  };

  // ---------------- 搜索与筛选 ---------------- //

  const searchNotes = useCallback((query: string, selectedTags: string[] = []) => {
    if (!query.trim() && selectedTags.length === 0) {
      setSearchResults([]);
      return [];
    }

    const results = notes.filter(note => {
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

      const tagMatch = selectedTags.length === 0 ||
        (note.tags && selectedTags.every(tag => note.tags.includes(tag)));

      return (titleMatch || contentMatch) && tagMatch;
    });

    setSearchResults(results);
    setError(null);
    return results;
  }, [notes]);

  const getAllTags = useCallback(() => {
    const tagsSet = new Set<string>();
    notes.forEach(note => {
      if (note.tags) note.tags.forEach(tag => tagsSet.add(tag));
    });
    return Array.from(tagsSet).sort();
  }, [notes]);

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
    searchNotes,
    getAllTags,
  };
}