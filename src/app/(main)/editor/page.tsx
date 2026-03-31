'use client';
import { useSearchParams } from 'next/navigation';
import { PlateEditor } from '@/components/plate-editor';
import { useNotes } from '@/hooks/use-notes';
import { Suspense } from "react";
import EditorPageSkeleton from '@/components/layout/editor/EditorPageSkeleton';

function EditorContent() {
  const searchParams = useSearchParams();
  const noteId = searchParams.get('id');
  const { notes, loading, error } = useNotes();

  // Find the note with the matching ID
  const note = noteId ? notes.find(note => note.id === noteId) : undefined;

  if (loading) {
    return <EditorPageSkeleton />;
  }

  if (error) {
    return <div className="flex items-center justify-center h-screen text-xl text-red-500">{error}</div>;
  }

  return <PlateEditor key={noteId ?? 'new-note'} note={note} />;
}

export default function EditorPage() {
  return (
    <Suspense fallback={<EditorPageSkeleton />}>
      <EditorContent />
    </Suspense>
  );
}