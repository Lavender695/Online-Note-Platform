'use client';
import { useState, useEffect, useCallback } from 'react';
import { Note } from '@/types/note';
import { useUser } from '@clerk/nextjs';


export function useNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<Note[]>([]);
  
  const { user, isLoaded } = useUser();
  
  // 生成用户专属的 LocalStorage Key
  const getStorageKey = useCallback(() => {
    if (!user) return 'default-notes';
    return `notes_${user.id}`;
  }, [user]);

  // 初始化：从 LocalStorage 加载数据
  useEffect(() => {
    if (!isLoaded) return;
    if (!user) {
      setLoading(false);
      return;
    }
    
    try {
      const key = getStorageKey();
      const savedData = localStorage.getItem(key);
      
      if (savedData) {
        const parsedNotes = JSON.parse(savedData) as Note[];
        // 按更新时间降序排列
        parsedNotes.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
        setNotes(parsedNotes);
      }
    } catch (e: any) {
      console.error('加载本地笔记失败:', e);
      setError('加载笔记失败: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, [user, isLoaded, getStorageKey]);

  // 内部辅助函数：保存数据到 State 和 LocalStorage
  const saveNotesToLocal = (newNotes: Note[]) => {
    setNotes(newNotes);
    if (user) {
      localStorage.setItem(getStorageKey(), JSON.stringify(newNotes));
    }
  };

  // ---------------- 核心操作方法 ---------------- //

  const getNoteById = (id: string) => notes.find(note => note.id === id);

  const createNote = async (title: string, content: string, tags: string[] = []) => {
    if (!user) throw new Error('User not authenticated');
    
    const newNote: Note = {
      id: crypto.randomUUID(),
      title,
      content,
      user_id: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      tags,
    };
    
    // 将新笔记放到数组开头
    const newNotes = [newNote, ...notes];
    saveNotesToLocal(newNotes);
    
    return newNote;
  };

  const updateNote = async (id: string, title: string, content: string, tags?: string[]) => {
    if (!user) throw new Error('User not authenticated');
    
    let updatedNote: Note | undefined;
    
    const newNotes = notes.map(note => {
      if (note.id === id) {
        updatedNote = {
          ...note,
          title,
          content,
          tags: tags !== undefined ? tags : note.tags || [],
          updated_at: new Date().toISOString(),
        };
        return updatedNote;
      }
      return note;
    });
    
    if (updatedNote) {
      // 重新排序，把最近更新的放在前面
      newNotes.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      saveNotesToLocal(newNotes);
      return updatedNote;
    }
    
    return notes.find(note => note.id === id);
  };

  const deleteNotes = async (ids: string[]) => {
    if (!user) throw new Error('User not authenticated');
    
    const newNotes = notes.filter(note => !ids.includes(note.id));
    saveNotesToLocal(newNotes);
    
    // 同步清理搜索结果
    setSearchResults(prev => prev.filter(note => !ids.includes(note.id)));
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
          const contentObj = JSON.parse(note.content);
          const plainText = Array.isArray(contentObj) 
            ? contentObj.map((node: any) => node.children?.[0]?.text || '').join(' ')
            : '';
          contentMatch = plainText.toLowerCase().includes(query.toLowerCase());
        }
      } catch (e) {
        contentMatch = note.content?.toLowerCase().includes(query.toLowerCase()) || false;
      }
      
      const tagMatch = selectedTags.length === 0 || 
        (note.tags && selectedTags.every(tag => note.tags!.includes(tag)));
      
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
    searchResults,
    getNoteById,
    createNote,
    updateNote,
    deleteNotes,
    searchNotes,
    getAllTags,
  };
}