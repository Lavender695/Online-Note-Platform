import { Liveblocks } from '@liveblocks/node';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Liveblocks Authentication API Route
 * 
 * This endpoint authenticates users for Liveblocks collaborative editing.
 * It verifies the Supabase access token and checks note permissions.
 * 
 * Expected request:
 * - Authorization: Bearer <supabase_access_token>
 * - Body: { roomId: string } (roomId format: "note_{noteId}")
 * 
 * Returns:
 * - Liveblocks session token with room access
 */

// Initialize Liveblocks with secret key
const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY || '',
});

// Initialize Supabase client for server-side operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_KEY || '';

export async function POST(req: NextRequest) {
  try {
    // Extract Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid Authorization header' },
        { status: 401 }
      );
    }

    const accessToken = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify the Supabase access token and get user info
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid or expired access token' },
        { status: 401 }
      );
    }

    // Parse request body
    const { roomId } = await req.json();

    if (!roomId || typeof roomId !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid roomId' },
        { status: 400 }
      );
    }

    // Extract note ID from roomId (format: "note_{noteId}")
    const noteIdMatch = roomId.match(/^note_(.+)$/);
    if (!noteIdMatch) {
      return NextResponse.json(
        { error: 'Invalid roomId format. Expected: note_{noteId}' },
        { status: 400 }
      );
    }

    const noteId = noteIdMatch[1];

    // Check if the note exists and get ownership information
    const { data: note, error: noteError } = await supabase
      .from('notes')
      .select('id, user_id')
      .eq('id', noteId)
      .single();

    if (noteError || !note) {
      return NextResponse.json(
        { error: 'Note not found' },
        { status: 404 }
      );
    }

    // Check if user has access to this note
    const isOwner = note.user_id === user.id;
    let hasWriteAccess = isOwner;

    // Check for shared access permissions
    if (!isOwner) {
      // Check if there's a note_permissions table for shared access
      const { data: permission } = await supabase
        .from('note_permissions')
        .select('permission_type')
        .eq('note_id', noteId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (!permission) {
        return NextResponse.json(
          { error: 'You do not have permission to access this note' },
          { status: 403 }
        );
      }

      // Set write access based on permission type
      hasWriteAccess = permission.permission_type === 'write';
    }

    // Create Liveblocks session with appropriate permissions
    const session = liveblocks.prepareSession(user.id, {
      userInfo: {
        name: user.email || 'Anonymous',
        email: user.email || '',
        avatar: user.user_metadata?.avatar_url || '',
      },
    });

    // Grant access to the specific room
    // Users with write permission get full access, others get read access only
    session.allow(roomId, hasWriteAccess ? session.FULL_ACCESS : session.READ_ACCESS);

    // Authorize the session
    const { status, body } = await session.authorize();

    return new NextResponse(body, { status });
  } catch (error) {
    console.error('Liveblocks auth error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
