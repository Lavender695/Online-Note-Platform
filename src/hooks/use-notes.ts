'use client';
import { useState, useEffect } from 'react';
import { Note } from '@/types/note';

// Mock data for testing
const mockNotes: Note[] = [
  {
    id: '1',
    title: '笔记标题1',
    content: '这是笔记内容的简短预览。它可以包含一些文本，帮助用户快速了解笔记的主题。',
    user_id: 'user1',
    created_at: '2024-06-01T10:00:00Z',
    updated_at: '2024-06-01T10:00:00Z',
  },
  {
    id: '2',
    title: '笔记标题2',
    content: '这是另一个笔记的内容预览。',
    user_id: 'user1',
    created_at: '2024-05-31T15:30:00Z',
    updated_at: '2024-05-31T15:30:00Z',
  },
  {
    id: '3',
    title: '笔记标题3',
    content: '这是第三个笔记的内容预览，包含更多详细信息。',
    user_id: 'user1',
    created_at: '2024-05-30T09:15:00Z',
    updated_at: '2024-05-30T09:15:00Z',
  },
];

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // For now, use mock data
    // In production, you would fetch from API
    try {
      setNotes(mockNotes);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch notes');
      setLoading(false);
    }
  }, []);

  const getNoteById = (id: string) => {
    return notes.find(note => note.id === id);
  };

  const createNote = async (title: string, content: string, userId: string) => {
    // For now, just add to mock data
    // In production, you would call the API
    const newNote: Note = {
      id: Date.now().toString(),
      title,
      content,
      user_id: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setNotes(prev => [newNote, ...prev]);
    return newNote;
  };

  return {
    notes,
    loading,
    error,
    getNoteById,
    createNote,
  };
}
