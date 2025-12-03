'use client';
import { useState, useEffect } from 'react';
import { Note } from '@/types/note';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setNotes([]);
      setLoading(false);
      return;
    }

    // Fetch notes from Supabase
    const fetchNotes = async () => {
      try {
        const { data, error } = await supabase
          .from('notes')
          .select('*')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false });

        if (error) {
          throw error;
        }

        setNotes(data || []);
        setLoading(false);
      } catch (err: any) {
        setError('Failed to fetch notes: ' + err.message);
        setLoading(false);
      }
    };

    fetchNotes();
  }, [user]);

  const getNoteById = (id: string) => {
    return notes.find(note => note.id === id);
  };

  const createNote = async (title: string, content: string) => {
    if (!user) {
      throw new Error('User not authenticated');
    }
    try {
      const { data, error } = await supabase
        .from('notes')
        .insert({
          title,
          content,
          user_id: user.id,
        })
        .select('*')
        .single();

      if (error) {
        throw error;
      }

      setNotes(prev => [data, ...prev]);
      return data;
    } catch (err: any) {
      setError('Failed to create note: ' + err.message);
      throw err;
    }
  };

  const updateNote = async (id: string, title: string, content: string) => {
    if (!user) {
      throw new Error('User not authenticated');
    }
    try {
      const { data, error } = await supabase
        .from('notes')
        .update({
          title,
          content,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', user.id)  // 添加用户权限验证
        .select('*')
        .single();

      if (error) {
        throw error;
      }

      setNotes(prev => prev.map(note => note.id === id ? data : note));
      return data;
    } catch (err: any) {
      setError('Failed to update note: ' + err.message);
      throw err;
    }
  };

  const deleteNotes = async (ids: string[]) => {
    if (!user) {
      throw new Error('User not authenticated');
    }
    try {
      const { error } = await supabase
        .from('notes')
        .delete()
        .in('id', ids)
        .eq('user_id', user.id);  // 添加用户权限验证

      if (error) {
        throw error;
      }

      setNotes(prev => prev.filter(note => !ids.includes(note.id)));
    } catch (err: any) {
      setError('Failed to delete notes: ' + err.message);
      throw err;
    }
  };

  return {
    notes,
    loading,
    error,
    getNoteById,
    createNote,
    updateNote,
    deleteNotes,
  };
}
