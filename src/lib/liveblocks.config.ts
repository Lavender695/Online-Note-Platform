import { createClient } from '@liveblocks/client';
import { createRoomContext } from '@liveblocks/react';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Create Liveblocks client
export const liveblocksClient = createClient({
  publicApiKey: process.env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY!,
  // Use custom auth endpoint
  authEndpoint: async (room) => {
    // Get the current user's Supabase access token from Supabase client
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_KEY!
    );
    
    const { data: { session } } = await supabase.auth.getSession();
    const accessToken = session?.access_token || '';

    if (!accessToken) {
      throw new Error('No access token available');
    }

    // Get noteId from room name (format: "note:uuid")
    const noteId = room?.replace('note:', '');

    const response = await fetch('/api/liveblocks/auth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ noteId }),
    });

    if (!response.ok) {
      throw new Error('Failed to authenticate with Liveblocks');
    }

    return response;
  },
});

// Presence represents the properties that exist on every user in the Room
// and that will automatically be kept in sync. Accessible through the
// `user.presence` property. Must be JSON-serializable.
type Presence = {
  cursor: { x: number; y: number } | null;
  selection: any | null;
};

// Optionally, Storage represents the shared document that persists in the
// Room, even after all users leave. Fields under Storage typically are
// LiveList, LiveMap, LiveObject instances, for which updates are
// automatically persisted and synced to all connected clients.
type Storage = {
  // Define your shared storage structure here
};

// Optionally, UserMeta represents static/readonly metadata on each user, as
// provided by your own custom auth backend (if used). Useful for data that
// will not change during a session, like a user's name or avatar.
type UserMeta = {
  id: string;
  info: {
    name: string;
    email: string;
    avatar: string;
  };
};

// Optionally, the type of custom events broadcast and listened to in this
// room. Use a union for multiple events. Must be JSON-serializable.
type RoomEvent = {
  // Define your custom events here
};

// Optionally, when using Comments, ThreadMetadata represents metadata on
// each thread. Can only contain booleans, strings, and numbers.
export type ThreadMetadata = {
  resolved: boolean;
};

// Create typed hooks for Liveblocks
export const {
  suspense: {
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
  },
} = createRoomContext<Presence, Storage, UserMeta, RoomEvent, ThreadMetadata>(
  liveblocksClient
);
