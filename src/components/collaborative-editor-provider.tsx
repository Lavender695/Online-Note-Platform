'use client';

import React, { useEffect, useState } from 'react';
import { RoomProvider, useRoom } from '@/lib/liveblocks';
import { LiveblocksYjsProvider } from '@liveblocks/yjs';
import * as Y from 'yjs';
import { useAuth } from '@/hooks/use-auth';
import { Note } from '@/types/note';
import { supabase } from '@/lib/supabase';

type Props = {
  note: Note;
  children: React.ReactNode;
};

/**
 * CollaborativeEditorProvider
 * 
 * This component wraps the editor and provides collaborative editing capabilities
 * using Liveblocks and Yjs for real-time synchronization.
 * 
 * Features:
 * - Real-time collaborative editing
 * - Presence awareness (cursors and selections)
 * - Periodic snapshots every 10 seconds to Supabase
 */
export function CollaborativeEditorProvider({ note, children }: Props) {
  const { session } = useAuth();
  const [roomId] = useState(`note_${note.id}`);

  // Don't render if user is not authenticated
  if (!session) {
    return <>{children}</>;
  }

  return (
    <RoomProvider
      id={roomId}
      initialPresence={{
        cursor: null,
        selection: null,
      }}
    >
      <CollaborativeEditorInner note={note}>
        {children}
      </CollaborativeEditorInner>
    </RoomProvider>
  );
}

/**
 * Inner component that has access to room hooks
 */
function CollaborativeEditorInner({ note, children }: Props) {
  const room = useRoom();
  const [yDoc] = useState(() => new Y.Doc());
  const [provider, setProvider] = useState<LiveblocksYjsProvider<any, any, any, any> | null>(null);

  useEffect(() => {
    // Initialize Liveblocks Yjs provider
    const liveblocksProvider = new LiveblocksYjsProvider(room, yDoc);
    setProvider(liveblocksProvider);

    return () => {
      liveblocksProvider.destroy();
    };
  }, [room, yDoc]);

  // Periodic snapshot to Supabase every 10 seconds
  useEffect(() => {
    if (!provider) return;

    const snapshotInterval = setInterval(async () => {
      try {
        // Get the current document state from the Yjs shared type
        const sharedType = yDoc.get('content', Y.XmlText) as Y.XmlText;
        const content = sharedType.toJSON();
        
        // Save to Supabase
        await supabase
          .from('notes')
          .update({ 
            content: JSON.stringify(content),
            updated_at: new Date().toISOString(),
          })
          .eq('id', note.id);

        console.log('Snapshot saved to Supabase at', new Date().toISOString());
      } catch (error) {
        console.error('Failed to save snapshot:', error);
      }
    }, 10000); // 10 seconds

    return () => clearInterval(snapshotInterval);
  }, [provider, note.id, yDoc]);

  return <>{children}</>;
}
