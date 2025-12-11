import { createClient } from '@liveblocks/client';
import { createRoomContext } from '@liveblocks/react';
import { supabase } from './supabase';

/**
 * Liveblocks Client Configuration
 * 
 * This file sets up the Liveblocks client with authentication
 * via our custom API endpoint that verifies Supabase tokens.
 */

// Create Liveblocks client
const client = createClient({
  authEndpoint: async (room) => {
    // Get the Supabase access token from the current session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      throw new Error('No access token available');
    }

    // Call our authentication endpoint
    const response = await fetch('/api/liveblocks/auth', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ roomId: room }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to authenticate');
    }

    return response;
  },
  
  // Throttle updates to avoid overwhelming the server
  throttle: 100,
});

// Create Room context with proper typing
export const {
  RoomProvider,
  useRoom,
  useMyPresence,
  useUpdateMyPresence,
  useSelf,
  useOthers,
  useOthersMapped,
  useOthersConnectionIds,
  useOther,
  useBroadcastEvent,
  useEventListener,
  useErrorListener,
  useStorage,
  useObject,
  useMap,
  useList,
  useBatch,
  useHistory,
  useUndo,
  useRedo,
  useCanUndo,
  useCanRedo,
  useMutation,
  useStatus,
  useLostConnectionListener,
} = createRoomContext(client);
