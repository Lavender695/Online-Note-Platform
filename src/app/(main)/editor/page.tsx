'use client';
import { useSearchParams } from 'next/navigation';
import { PlateEditor } from '@/components/plate-editor';
import { useNotes } from '@/hooks/use-notes';

export default function EditorPage() {
  const searchParams = useSearchParams();
  const noteId = searchParams.get('id');
  const { notes, loading, error } = useNotes();

  // Find the note with the matching ID
  const note = noteId ? notes.find(note => note.id === noteId) : undefined;

  if (loading) {
    return <div className="flex items-center justify-center h-screen text-xl">加载中...</div>;
  }

  if (error) {
    return <div className="flex items-center justify-center h-screen text-xl text-red-500">{error}</div>;
  }

  return <PlateEditor note={note} />;
}