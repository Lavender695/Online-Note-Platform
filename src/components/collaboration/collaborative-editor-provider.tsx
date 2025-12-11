'use client';

import React from 'react';
import { RoomProvider } from '@/lib/liveblocks.config';
import { ClientSideSuspense } from '@liveblocks/react';
import { useAuth } from '@/hooks/use-auth';

interface CollaborativeEditorProviderProps {
  noteId: string;
  children: React.ReactNode;
}

export function CollaborativeEditorProvider({
  noteId,
  children,
}: CollaborativeEditorProviderProps) {
  const { session } = useAuth();
  
  // Don't render the provider if there's no session
  if (!session) {
    return <>{children}</>;
  }

  const roomId = `note:${noteId}`;

  return (
    <RoomProvider
      id={roomId}
      initialPresence={{
        cursor: null,
        selection: null,
      }}
    >
      <ClientSideSuspense fallback={<div>Loading collaboration...</div>}>
        {children}
      </ClientSideSuspense>
    </RoomProvider>
  );
}
