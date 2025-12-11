'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRoom } from '@/lib/liveblocks.config';

interface UseSnapshotOptions {
  noteId: string;
  enabled?: boolean;
  interval?: number; // in milliseconds, default 10000 (10s)
}

export function useSnapshot({ noteId, enabled = true, interval = 10000 }: UseSnapshotOptions) {
  const { session } = useAuth();
  const room = useRoom();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSnapshotRef = useRef<string>('');

  const saveSnapshot = useCallback(async () => {
    if (!session || !enabled || !room) return;

    try {
      // Get the current state from Liveblocks room
      // For now, we'll use the storage state
      const storage = await room.getStorage();
      const snapshotData = storage.root.toJSON();

      // Only save if data has changed
      const currentSnapshot = JSON.stringify(snapshotData);
      if (currentSnapshot === lastSnapshotRef.current) {
        return;
      }

      const response = await fetch('/api/liveblocks/snapshot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          noteId,
          snapshotData,
        }),
      });

      if (response.ok) {
        lastSnapshotRef.current = currentSnapshot;
        console.log('Snapshot saved successfully');
      } else {
        console.error('Failed to save snapshot:', await response.text());
      }
    } catch (error) {
      console.error('Error saving snapshot:', error);
    }
  }, [session, enabled, noteId, room]);

  // Set up periodic snapshot saving
  useEffect(() => {
    if (!enabled || !session || !room) return;

    // Save initial snapshot
    saveSnapshot();

    // Set up periodic saving
    intervalRef.current = setInterval(saveSnapshot, interval);

    // Save snapshot on unload
    const handleBeforeUnload = () => {
      saveSnapshot();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Save final snapshot on cleanup
      saveSnapshot();
    };
  }, [enabled, session, room, interval, saveSnapshot]);

  const loadLatestSnapshot = useCallback(async () => {
    if (!session || !noteId) return null;

    try {
      const response = await fetch(`/api/liveblocks/snapshot?noteId=${noteId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        return data.snapshot?.snapshot_data || null;
      }
    } catch (error) {
      console.error('Error loading snapshot:', error);
    }

    return null;
  }, [session, noteId]);

  return {
    saveSnapshot,
    loadLatestSnapshot,
  };
}
