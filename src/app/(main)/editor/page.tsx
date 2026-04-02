'use client';
import { useSearchParams } from 'next/navigation';
import { PlateEditor } from '@/components/plate-editor';
import { useNotes } from '@/hooks/use-notes';
import { Suspense, useEffect, useMemo } from "react";
import EditorPageSkeleton from '@/components/layout/editor/EditorPageSkeleton';

function EditorContent() {
  const searchParams = useSearchParams();
  const noteId = searchParams.get('id');
  const { notes, loading, error, refreshNotes } = useNotes();

  // Generate a unique temporary ID for new notes to avoid IndexedDB cache conflicts
  const tempNoteId = useMemo(() => {
    if (noteId) return noteId;
    // Create a unique temporary ID for each new note session
    return `temp:${crypto.randomUUID()}`;
  }, [noteId]);

  // Find the note with the matching ID
  const note = noteId ? notes.find(note => note.id === noteId) : undefined;

  // When noteId changes and note is not found, refresh the notes list from localStorage
  useEffect(() => {
    if (noteId && !note && !loading) {
      void refreshNotes();
    }
  }, [noteId, note, loading, refreshNotes]);

  if (loading) {
    return <EditorPageSkeleton />;
  }

  if (error) {
    return <div className="flex items-center justify-center h-screen text-xl text-red-500">{error}</div>;
  }

  return <PlateEditor key={tempNoteId} note={note} tempNoteId={tempNoteId} />;
}

export default function EditorPage() {
  return (
    <Suspense fallback={<EditorPageSkeleton />}>
      <EditorContent />
    </Suspense>
  );
}