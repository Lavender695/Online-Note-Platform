'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Note } from '@/types/note';
import { useUser } from '@clerk/nextjs'; // 🌟 换成 Clerk
import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';

// 🌟 引入我们之前定义的统一数据库入口（你可以在 src/db/index.ts 里配置使用 Mock 还是真正的 Supabase）
import { db } from '@/db';

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<Note[]>([]);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [yDocReady, setYDocReady] = useState(false);
  
  // 🌟 使用 Clerk 获取用户状态
  const { user, isLoaded } = useUser();
  
  const yDocRef = React.useRef<Y.Doc | null>(null);
  const yPersistenceRef = React.useRef<IndexeddbPersistence | null>(null);
  
  const getYDocKey = useCallback(() => {
    if (!user) return 'default-notes';
    return `notes_${user.id}`;
  }, [user]);
  
  // 初始化 Yjs 文档
  useEffect(() => {
    // 等待 Clerk 加载完成且用户存在
    if (!isLoaded || !user) return;
    
    const yDoc = new Y.Doc();
    yDocRef.current = yDoc;
    
    const persistence = new IndexeddbPersistence(getYDocKey(), yDoc);
    yPersistenceRef.current = persistence;
    
    persistence.on('synced', () => {
      console.log('Yjs 笔记数据已同步完成');
      setYDocReady(true);
    });
    
    return () => {
      if (yPersistenceRef.current) {
        yPersistenceRef.current.destroy();
        yPersistenceRef.current = null;
      }
      if (yDocRef.current) {
        yDocRef.current.destroy();
        yDocRef.current = null;
      }
    };
  }, [user, isLoaded, getYDocKey]);

  // 网络状态监听
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncLocalToCloud();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [user]); // 依赖 user 以便在回调中获取最新状态

  // 将本地 Yjs 数据同步到云端
  const syncLocalToCloud = async () => {
    if (!user || !yDocRef.current || !isOnline) return;
    setIsSyncing(true);
    
    try {
      const yDoc = yDocRef.current;
      const notesMap = yDoc.getMap('notes');
      const localNotes: Note[] = [];
      
      notesMap.forEach((noteData: any) => {
        if (noteData.id && noteData.title && noteData.content) {
          localNotes.push(noteData as Note);
        }
      });
      
      if (localNotes.length === 0) {
        setIsSyncing(false);
        return;
      }
      
      // 🌟 替换 Supabase 调用，使用 DB Adapter
      const cloudNotes = await db.getNotes(user.id);
      const cloudNoteIds = new Set(cloudNotes?.map(note => note.id) || []);
      const notesToCreate: Note[] = [];
      const notesToUpdate: Note[] = [];
      const notesToDelete: string[] = [];
      
      localNotes.forEach(localNote => {
        if (!cloudNoteIds.has(localNote.id)) {
          notesToCreate.push(localNote);
        } else {
          const cloudNote = cloudNotes?.find(note => note.id === localNote.id);
          if (cloudNote && new Date(localNote.updated_at) > new Date(cloudNote.updated_at)) {
            notesToUpdate.push(localNote);
          }
        }
      });
      
      cloudNotes?.forEach(cloudNote => {
        if (!localNotes.some(localNote => localNote.id === cloudNote.id)) {
          notesToDelete.push(cloudNote.id);
        }
      });
      
      // 🌟 替换增删改的 Supabase 调用
      for (const note of notesToCreate) {
        await db.createNote(user.id, note.title, note.content, note.tags || []);
      }
      
      for (const note of notesToUpdate) {
        await db.updateNote(note.id, user.id, {
          title: note.title,
          content: note.content,
          tags: note.tags,
          updated_at: note.updated_at,
        });
      }
      
      if (notesToDelete.length > 0) {
        await db.deleteNotes(notesToDelete, user.id);
      }
      
      console.log('Local notes synchronized to cloud');
    } catch (err: any) {
      console.error('Failed to sync:', err.message);
      setError('Failed to sync notes: ' + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  // 从 Yjs 文档加载笔记到 State
  const loadNotesFromYDoc = useCallback(() => {
    if (!yDocRef.current) return;
    
    const notesMap = yDocRef.current.getMap('notes');
    const notesArray: Note[] = [];
    
    notesMap.forEach((noteData: any) => {
      if (noteData.id && noteData.title && noteData.content) {
        notesArray.push(noteData as Note);
      }
    });
    
    notesArray.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    setNotes(notesArray);
  }, []);

  // 监听 Yjs 文档变化
  useEffect(() => {
    if (!yDocRef.current || !yDocReady) return;
    
    const notesMap = yDocRef.current.getMap('notes');
    const observer = () => loadNotesFromYDoc();
    
    notesMap.observe(observer);
    loadNotesFromYDoc();
    setLoading(false);
    
    return () => {
      notesMap.unobserve(observer);
    };
  }, [yDocReady, loadNotesFromYDoc]);

  // 初始化从云端获取数据
  useEffect(() => {
    if (!user || !isOnline || !yDocRef.current) return;
    
    setLoading(true);
    setIsSyncing(true);
    
    const fetchNotes = async () => {
      try {
        // 🌟 替换 Supabase 调用，使用 DB Adapter
        const data = await db.getNotes(user.id);
        
        const yDoc = yDocRef.current;
        if (!yDoc) return;
        
        const notesMap = yDoc.getMap('notes');
        notesMap.clear(); // 这里根据你原来的逻辑清空本地，注意数据安全
        
        data?.forEach((note: Note) => {
          notesMap.set(note.id, note);
        });
        
        console.log('Notes synchronized from DB to Yjs');
      } catch (err: any) {
        if (!isOnline) setError(null);
        else setError('Failed to fetch notes: ' + err.message);
      } finally {
        setLoading(false);
        setIsSyncing(false);
      }
    };

    fetchNotes();
  }, [user, isOnline]);

  const getNoteById = (id: string) => notes.find(note => note.id === id);

  const createNote = async (title: string, content: string, tags: string[] = []) => {
    if (!user) throw new Error('User not authenticated');
    setIsSyncing(true);
    
    try {
      const newId = crypto.randomUUID();
      const newNote: Note = {
        id: newId,
        title,
        content,
        user_id: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        tags,
      };
      
      if (yDocRef.current) {
        yDocRef.current.getMap('notes').set(newNote.id, newNote);
      }
      
      if (isOnline) {
        // 🌟 替换 Supabase 调用，使用 DB Adapter
        const data = await db.createNote(user.id, title, content, tags);
        return data; // 你可能需要调整返回值以适应真实环境
      }
      return newNote;
    } catch (err: any) {
      if (isOnline) throw err;
      return notes.find(note => note.title === title) || { id: 'temp' } as Note;
    } finally {
      setIsSyncing(false);
    }
  };

  const updateNote = async (id: string, title: string, content: string, tags?: string[]) => {
    if (!user) throw new Error('User not authenticated');
    
    if (yDocRef.current) {
      const notesMap = yDocRef.current.getMap('notes');
      const existingNote = notesMap.get(id);
      if (existingNote) {
        notesMap.set(id, {
          ...(existingNote as Note),
          title,
          content,
          tags: tags !== undefined ? tags : (existingNote as Note).tags || [],
          updated_at: new Date().toISOString(),
        });
      }
    }
    
    if (!isOnline) {
      return notes.find(note => note.id === id);
    }
    
    setIsSyncing(true);
    try {
      // 🌟 替换 Supabase 调用，使用 DB Adapter
      const data = await db.updateNote(id, user.id, {
        title,
        content,
        tags,
        updated_at: new Date().toISOString(),
      });
      return data;
    } catch (err: any) {
      if (isOnline) throw err;
      return notes.find(note => note.id === id);
    } finally {
      setIsSyncing(false);
    }
  };

  const deleteNotes = async (ids: string[]) => {
    if (!user) throw new Error('User not authenticated');
    
    if (yDocRef.current) {
      const notesMap = yDocRef.current.getMap('notes');
      ids.forEach(id => notesMap.delete(id));
    }
    
    if (!isOnline) {
      setSearchResults(prev => prev.filter(note => !ids.includes(note.id)));
      return;
    }
    
    setIsSyncing(true);
    try {
      // 🌟 替换 Supabase 调用，使用 DB Adapter
      await db.deleteNotes(ids, user.id);
      setSearchResults(prev => prev.filter(note => !ids.includes(note.id)));
    } catch (err: any) {
      if (isOnline) throw err;
    } finally {
      setIsSyncing(false);
    }
  };

  // 搜索和标签功能保持不变...
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