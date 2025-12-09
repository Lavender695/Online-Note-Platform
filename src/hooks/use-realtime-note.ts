'use client';
import { useEffect, useState } from 'react';
import { Note } from '@/types/note';
import { supabase } from '@/lib/supabase';

/**
 * Hook to subscribe to real-time changes for a specific note
 * @param noteId The ID of the note to subscribe to
 * @returns The latest note data and a loading state for updates
 */
export function useRealtimeNote(noteId: string) {
  const [note, setNote] = useState<Note | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (!noteId) return;

    // Subscribe to specific note changes
    const channel = supabase
      .channel(`note-${noteId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notes',
          filter: `id=eq.${noteId}`
        },
        (payload) => {
          setIsUpdating(true);
          setNote(payload.new as Note);
          
          // Reset updating state after a short delay to show visual feedback
          setTimeout(() => setIsUpdating(false), 1000);
        }
      )
      .subscribe();

    // Fetch the initial note data
    const fetchNote = async () => {
      try {
        const { data, error } = await supabase
          .from('notes')
          .select('*')
          .eq('id', noteId)
          .single();

        if (error) {
          console.error('Failed to fetch note:', error);
          return;
        }

        setNote(data);
      } catch (err) {
        console.error('Error fetching note:', err);
      }
    };

    fetchNote();

    // Cleanup channel on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [noteId]);

  return { note, isUpdating };
}
