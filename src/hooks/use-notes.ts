'use client';
import { useState, useEffect, useCallback } from 'react';
import { Note } from '@/types/note';
import { supabase } from '@/lib/supabase';
import { useAuth } from './use-auth';

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<Note[]>([]);
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
      // Also update search results if any are deleted
      setSearchResults(prev => prev.filter(note => !ids.includes(note.id)));
    } catch (err: any) {
      setError('Failed to delete notes: ' + err.message);
      throw err;
    }
  };

  const searchNotes = useCallback((query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return [];
    }

    const results = notes.filter(note => {
      // 搜索标题
      const titleMatch = note.title.toLowerCase().includes(query.toLowerCase());
      
      // 搜索内容（先转换为纯文本）
      let contentMatch = false;
      try {
        if (note.content) {
          const contentObj = JSON.parse(note.content);
          const plainText = Array.isArray(contentObj) 
            ? contentObj
                .map((node: any) => node.children?.[0]?.text || '')
                .join(' ')
            : '';
          contentMatch = plainText.toLowerCase().includes(query.toLowerCase());
        }
      } catch (e) {
        // 如果JSON解析失败，尝试直接搜索内容
        contentMatch = note.content?.toLowerCase().includes(query.toLowerCase()) || false;
      }
      
      return titleMatch || contentMatch;
    });
    
    setSearchResults(results);
    return results;
  }, [notes]);

  return {
    notes,
    loading,
    error,
    searchResults,
    getNoteById,
    createNote,
    updateNote,
    deleteNotes,
    searchNotes,
  };
}
