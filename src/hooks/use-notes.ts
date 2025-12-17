'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Note } from '@/types/note';
import { supabase } from '@/lib/supabase';
import { useAuth } from './use-auth';
import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<Note[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [yDocReady, setYDocReady] = useState(false);
  const { user } = useAuth();
  
  // Yjs 文档引用
  const yDocRef = React.useRef<Y.Doc | null>(null);
  const yPersistenceRef = React.useRef<IndexeddbPersistence | null>(null);
  
  // 获取 Yjs 文档的 key
  const getYDocKey = () => {
    if (!user) return 'default-notes';
    return `notes_${user.id}`;
  };
  
  // 初始化 Yjs 文档和持久化
  useEffect(() => {
    if (!user) return;
    
    // 创建 Yjs 文档
    const yDoc = new Y.Doc();
    yDocRef.current = yDoc;
    
    // 创建持久化实例
    const persistence = new IndexeddbPersistence(getYDocKey(), yDoc);
    yPersistenceRef.current = persistence;
    
    // 监听同步完成事件
    persistence.on('synced', () => {
      console.log('Yjs 笔记数据已同步完成');
      setYDocReady(true);
    });
    
    // 清理函数
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
  }, [user]);

  // 网络状态监听和同步
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // 网络恢复时，将本地数据同步到云端
      syncLocalToCloud();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // 将本地 Yjs 数据同步到云端
  const syncLocalToCloud = async () => {
    if (!user || !yDocRef.current || !isOnline) return;
    
    setIsSyncing(true);
    
    try {
      const yDoc = yDocRef.current;
      const notesMap = yDoc.getMap('notes');
      const localNotes: Note[] = [];
      
      // 获取所有本地笔记
      notesMap.forEach((noteData: any) => {
        if (noteData.id && noteData.title && noteData.content) {
          localNotes.push(noteData as Note);
        }
      });
      
      if (localNotes.length === 0) {
        setIsSyncing(false);
        return;
      }
      
      // 获取云端笔记
      const { data: cloudNotes, error: fetchError } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', user.id);
      
      if (fetchError) {
        throw fetchError;
      }
      
      // 创建云端笔记ID映射
      const cloudNoteIds = new Set(cloudNotes?.map(note => note.id) || []);
      const notesToCreate: Note[] = [];
      const notesToUpdate: Note[] = [];
      const notesToDelete: string[] = [];
      
      // 确定需要创建、更新和删除的笔记
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
      
      // 确定需要删除的笔记（云端有但本地没有的）
      cloudNotes?.forEach(cloudNote => {
        if (!localNotes.some(localNote => localNote.id === cloudNote.id)) {
          notesToDelete.push(cloudNote.id);
        }
      });
      
      // 执行批量操作 - 逐个执行API调用
      
      // 创建新笔记
      for (const note of notesToCreate) {
        await supabase.from('notes').insert({
          id: note.id,
          title: note.title,
          content: note.content,
          tags: note.tags,
          user_id: user.id,
          created_at: note.created_at,
          updated_at: note.updated_at,
        });
      }
      
      // 更新现有笔记
      for (const note of notesToUpdate) {
        await supabase.from('notes').update({
          title: note.title,
          content: note.content,
          tags: note.tags,
          updated_at: note.updated_at,
        }).eq('id', note.id).eq('user_id', user.id);
      }
      
      // 删除笔记
      if (notesToDelete.length > 0) {
        await supabase.from('notes').delete().in('id', notesToDelete).eq('user_id', user.id);
      }
      
      console.log('Local notes synchronized to cloud:', {
        created: notesToCreate.length,
        updated: notesToUpdate.length,
        deleted: notesToDelete.length,
      });
    } catch (err: any) {
      console.error('Failed to sync local notes to cloud:', err.message);
      setError('Failed to sync notes to cloud: ' + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  // 从 Yjs 文档加载笔记
  const loadNotesFromYDoc = () => {
    if (!yDocRef.current) return;
    
    const yDoc = yDocRef.current;
    const notesMap = yDoc.getMap('notes');
    const notesArray: Note[] = [];
    
    notesMap.forEach((noteData: any) => {
      if (noteData.id && noteData.title && noteData.content) {
        notesArray.push(noteData as Note);
      }
    });
    
    // 按更新时间排序
    notesArray.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    
    setNotes(notesArray);
  };

  // 监听 Yjs 文档变化
  useEffect(() => {
    if (!yDocRef.current || !yDocReady) return;
    
    const yDoc = yDocRef.current;
    const notesMap = yDoc.getMap('notes');
    
    // 监听变化
    const observer = () => {
      loadNotesFromYDoc();
    };
    
    notesMap.observe(observer);
    
    // 初始加载
    loadNotesFromYDoc();
    setLoading(false);
    
    return () => {
      notesMap.unobserve(observer);
    };
  }, [yDocReady, user]);

  // 从 Supabase 获取笔记并同步到 Yjs
  useEffect(() => {
    if (!user || !isOnline || !yDocRef.current) return;
    
    setLoading(true);
    setIsSyncing(true);
    
    const fetchNotesFromSupabase = async () => {
      try {
        const { data, error } = await supabase
          .from('notes')
          .select('*')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false });

        if (error) {
          throw error;
        }
        
        // 将远程数据同步到 Yjs 文档
        const yDoc = yDocRef.current;
        if (!yDoc) {
          console.error('Yjs 文档未初始化，无法同步数据');
          return;
        }
        
        const notesMap = yDoc.getMap('notes');
        
        // 先清空本地数据，然后添加远程数据
        notesMap.clear();
        
        data?.forEach((note: Note) => {
          notesMap.set(note.id, note);
        });
        
        console.log('Notes synchronized from Supabase to Yjs:', data?.length || 0, 'notes');
      } catch (err: any) {
        console.error('Failed to fetch notes from Supabase:', err.message);
        // 离线时不设置错误，继续使用本地缓存
        if (!isOnline) {
          setError(null);
        } else {
          setError('Failed to fetch notes: ' + err.message);
        }
      } finally {
        setLoading(false);
        setIsSyncing(false);
      }
    };

    fetchNotesFromSupabase();
  }, [user, isOnline]);

  const getNoteById = (id: string) => {
    return notes.find(note => note.id === id);
  };

  
  // 创建新笔记（支持离线创建）
  const createNote = async (title: string, content: string, tags: string[] = []) => {
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    setIsSyncing(true);
    
    try {
      // 生成唯一ID（使用UUID v4）
      const generateUUID = () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          const r = Math.random() * 16 | 0;
          const v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
      };
      
      // 创建本地笔记
      const newNote: Note = {
        id: generateUUID(),
        title,
        content,
        user_id: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        tags,
      };
      
      // 同步到 Yjs 文档
      if (yDocRef.current) {
        const yDoc = yDocRef.current;
        const notesMap = yDoc.getMap('notes');
        notesMap.set(newNote.id, newNote);
      }
      
      // 如果在线，同步到云端
      if (isOnline) {
        const { data, error } = await supabase
          .from('notes')
          .insert({
            id: newNote.id,
            title,
            content,
            tags,
            user_id: user.id,
            created_at: newNote.created_at,
            updated_at: newNote.updated_at,
          })
          .select('*')
          .single();

        if (error) {
          throw error;
        }
        
        return data;
      } else {
        // 离线时直接返回本地创建的笔记
        return newNote;
      }
    } catch (err: any) {
      console.error('Failed to create note:', err.message);
      // 离线时不抛出错误，允许本地创建
      if (isOnline) {
        setError('Failed to create note: ' + err.message);
        throw err;
      }
      // 离线时尝试获取本地创建的笔记
      const newNote = notes.find(note => note.title === title && new Date(note.created_at).getTime() > Date.now() - 5000);
      if (newNote) {
        return newNote;
      }
      // 如果找不到，抛出错误
      throw new Error('无法创建笔记');
    } finally {
      setIsSyncing(false);
    }
  };

  // 更新笔记（离线时更新本地缓存，在线时同步到云端）
  const updateNote = async (id: string, title: string, content: string, tags?: string[]) => {
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    // 更新本地 Yjs 文档
    if (yDocRef.current) {
      const yDoc = yDocRef.current;
      const notesMap = yDoc.getMap('notes');
      const existingNote = notesMap.get(id);
      
      if (existingNote) {
        const updatedNote: Note = {
          ...(existingNote as Note),
          title,
          content,
          tags: tags !== undefined ? tags : (existingNote as Note).tags || [],
          updated_at: new Date().toISOString(),
        };
        
        notesMap.set(id, updatedNote);
      }
    }
    
    // 如果离线，直接返回更新后的笔记
    if (!isOnline) {
      // 找到更新后的笔记并返回
      const updatedNote = notes.find(note => note.id === id);
      if (updatedNote) {
        return {
          ...updatedNote,
          title,
          content,
          tags: tags !== undefined ? tags : updatedNote.tags || [],
          updated_at: new Date().toISOString(),
        };
      }
      throw new Error('笔记不存在');
    }
    
    setIsSyncing(true);
    
    try {
      // 准备更新数据
      const updateData: any = {
        title,
        content,
        updated_at: new Date().toISOString(),
      };
      
      // 如果提供了tags参数，则包含在更新中
      if (tags !== undefined) {
        updateData.tags = tags;
      }
      
      const { data, error } = await supabase
        .from('notes')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', user.id)  // 添加用户权限验证
        .select('*')
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (err: any) {
      console.error('Failed to update note on Supabase:', err.message);
      // 离线时不抛出错误，允许本地更新
      if (isOnline) {
        setError('Failed to update note: ' + err.message);
        throw err;
      }
      
      // 离线时返回本地更新的笔记
      const updatedNote = notes.find(note => note.id === id);
      if (updatedNote) {
        return {
          ...updatedNote,
          title,
          content,
          updated_at: new Date().toISOString(),
        };
      }
      throw new Error('笔记不存在');
    } finally {
      setIsSyncing(false);
    }
  };

  // 删除笔记（离线时更新本地缓存，在线时同步到云端）
  const deleteNotes = async (ids: string[]) => {
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    // 更新本地 Yjs 文档
    if (yDocRef.current) {
      const yDoc = yDocRef.current;
      const notesMap = yDoc.getMap('notes');
      
      ids.forEach(id => {
        notesMap.delete(id);
      });
    }
    
    // 如果离线，直接返回
    if (!isOnline) {
      // 更新本地搜索结果
      setSearchResults(prev => prev.filter(note => !ids.includes(note.id)));
      return;
    }
    
    setIsSyncing(true);
    
    try {
      const { error } = await supabase
        .from('notes')
        .delete()
        .in('id', ids)
        .eq('user_id', user.id);  // 添加用户权限验证

      if (error) {
        throw error;
      }
      
      // 更新本地搜索结果
      setSearchResults(prev => prev.filter(note => !ids.includes(note.id)));
    } catch (err: any) {
      console.error('Failed to delete notes on Supabase:', err.message);
      // 离线时不抛出错误，允许本地删除
      if (isOnline) {
        setError('Failed to delete notes: ' + err.message);
        throw err;
      }
    } finally {
      setIsSyncing(false);
    }
  };

  // 搜索笔记（支持离线搜索和标签筛选）
  const searchNotes = useCallback((query: string, selectedTags: string[] = []) => {
    if (!query.trim() && selectedTags.length === 0) {
      setSearchResults([]);
      return [];
    }

    // 在本地笔记中搜索（支持离线）
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
      
      // 标签筛选
      const tagMatch = selectedTags.length === 0 || 
        (note.tags && selectedTags.every(tag => note.tags!.includes(tag)));
      
      return (titleMatch || contentMatch) && tagMatch;
    });
    
    setSearchResults(results);
    setError(null); // 清除之前的错误
    return results;
  }, [notes]);

  // 获取所有可用标签
  const getAllTags = useCallback(() => {
    const tagsSet = new Set<string>();
    notes.forEach(note => {
      if (note.tags) {
        note.tags.forEach(tag => tagsSet.add(tag));
      }
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
