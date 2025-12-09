'use client';
import { useState, useEffect, useCallback } from 'react';
import { Note } from '@/types/note';
import { supabase } from '@/lib/supabase';
import { useAuth } from './use-auth';

// 模拟数据 - 当Supabase连接失败时使用
const MOCK_NOTES: Note[] = [
  {
    id: '1',
    title: '测试笔记 1',
    content: JSON.stringify([{ type: 'p', children: [{ text: '这是第一条测试笔记的内容。' }] }]),
    user_id: 'user-1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '2',
    title: '测试笔记 2',
    content: JSON.stringify([{ type: 'p', children: [{ text: '这是第二条测试笔记的内容，包含一些格式。' }] }]),
    user_id: 'user-1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

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

    // Fetch initial notes from Supabase - including shared notes
    const fetchNotes = async () => {
      try {
        console.log('Fetching notes for user:', user.id);
        // 分两步获取：1. 用户自己的笔记 2. 共享给用户的笔记
        
        // 1. 获取用户自己的笔记
        const { data: userNotes, error: userNotesError } = await supabase
          .from('notes')
          .select('*')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false });
        
        if (userNotesError) {
          console.error('Error fetching user notes:', userNotesError);
        }
        
        // 2. 获取共享给用户的笔记
        // 先获取用户有权限的笔记ID
        const { data: permissions, error: permissionsError } = await supabase
          .from('note_permissions')
          .select('note_id')
          .eq('user_id', user.id);
        
        if (permissionsError) {
          console.error('Error fetching permissions:', permissionsError);
        }
        
        // 如果没有共享权限，只使用用户自己的笔记
        let allNotes = userNotes || [];
        
        // 如果有共享权限，获取这些笔记
        if (permissions && permissions.length > 0) {
          const noteIds = permissions.map(perm => perm.note_id);
          
          const { data: sharedNotes, error: sharedNotesError } = await supabase
            .from('notes')
            .select('*')
            .in('id', noteIds)
            .order('updated_at', { ascending: false });
          
          if (sharedNotesError) {
            console.error('Error fetching shared notes:', sharedNotesError);
          }
          
          // 合并笔记并去重
          if (sharedNotes) {
            const combinedNotes = [...allNotes, ...sharedNotes];
            // 去重（如果有重复的笔记ID）
            const uniqueNotes = Array.from(new Map(combinedNotes.map(note => [note.id, note])).values());
            // 按更新时间排序
            allNotes = uniqueNotes.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
          }
        }
        
        // 检查是否有任何错误
        const hasError = userNotesError || permissionsError;
        if (hasError) {
          console.error('Supabase error occurred:', { userNotesError, permissionsError });
          // 不要抛出错误，因为我们已经有了一些数据（用户自己的笔记）
        }
        
        console.log('Fetched notes:', allNotes);
        setNotes(allNotes);
        setLoading(false);
      } catch (err: any) {
        console.error('Error fetching notes details:', { message: err.message, code: err.code, hint: err.hint, details: err.details, stack: err.stack });
        // 使用模拟数据作为回退
        console.log('Using mock data as fallback');
        setNotes(MOCK_NOTES);
        setError('Failed to connect to Supabase. Using mock data. Please check your network connection.');
        setLoading(false);
      }
    };

    fetchNotes();

    // Subscribe to realtime changes for user's own notes
    const notesChannel = supabase
      .channel('notes-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notes',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          // Handle realtime changes for user's own notes
          switch (payload.eventType) {
            case 'INSERT':
              setNotes(prev => [payload.new as Note, ...prev]);
              break;
            case 'UPDATE':
              setNotes(prev => 
                prev.map(note => 
                  note.id === payload.new.id 
                    ? payload.new as Note 
                    : note
                )
              );
              break;
            case 'DELETE':
              setNotes(prev => 
                prev.filter(note => note.id !== payload.old.id)
              );
              setSearchResults(prev => 
                prev.filter(note => note.id !== payload.old.id)
              );
              break;
          }
        }
      )
      .subscribe();

    // Subscribe to realtime changes for shared notes permissions
    const permissionsChannel = supabase
      .channel('permissions-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'note_permissions',
          filter: `user_id=eq.${user.id}`
        },
        async (payload) => {
          // Handle realtime changes for permissions
          switch (payload.eventType) {
            case 'INSERT':
              // New shared note added, fetch the note details
              const { data: newNote } = await supabase
                .from('notes')
                .select('*')
                .eq('id', payload.new.note_id)
                .single();
              if (newNote) {
                setNotes(prev => [newNote, ...prev]);
              }
              break;
            case 'DELETE':
              // Shared note removed, filter it out
              setNotes(prev => 
                prev.filter(note => note.id !== payload.old.note_id || note.user_id === user.id)
              );
              setSearchResults(prev => 
                prev.filter(note => note.id !== payload.old.note_id || note.user_id === user.id)
              );
              break;
          }
        }
      )
      .subscribe();

    // Cleanup channels on unmount
    return () => {
      supabase.removeChannel(notesChannel);
      supabase.removeChannel(permissionsChannel);
    };
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
      // 检查用户是否是笔记的所有者
      const { data: note, error: noteError } = await supabase
        .from('notes')
        .select('*')
        .eq('id', id)
        .single();

      if (noteError) {
        throw noteError;
      }

      if (!note) {
        throw new Error('Note not found');
      }

      // 检查用户是否有权限更新笔记（所有者或编辑权限）
      let hasPermission = false;

      // 如果是笔记所有者，直接有权限
      if (note.user_id === user.id) {
        hasPermission = true;
      } else {
        // 否则检查是否有编辑权限
        const { data: permission, error: permissionError } = await supabase
          .from('note_permissions')
          .select('permission')
          .eq('note_id', id)
          .eq('user_id', user.id)
          .single();

        if (permissionError) {
          console.error('Error checking permission:', permissionError);
        } else {
          hasPermission = permission?.permission === 'editor';
        }
      }

      if (!hasPermission) {
        throw new Error('You do not have permission to update this note');
      }

      // 更新笔记
      const { data: updatedNote, error: updateError } = await supabase
        .from('notes')
        .update({
          title,
          content,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('*')
        .single();

      if (updateError) {
        throw updateError;
      }

      if (!updatedNote) {
        throw new Error('Failed to update note');
      }

      setNotes(prev => prev.map(note => note.id === id ? updatedNote : note));
      return updatedNote;
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
      // 只有所有者可以删除笔记
      const { error } = await supabase
        .from('notes')
        .delete()
        .in('id', ids)
        .eq('user_id', user.id);

      if (error) {
        throw error;
      }

      setNotes(prev => prev.filter(note => !ids.includes(note.id) || note.user_id !== user.id));
      // Also update search results if any are deleted
      setSearchResults(prev => prev.filter(note => !ids.includes(note.id) || note.user_id !== user.id));
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
