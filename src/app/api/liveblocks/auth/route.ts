import { Liveblocks } from '@liveblocks/node';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Liveblocks with secret key
const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET!,
});

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    // Get the authorization token from header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization token' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify the user with Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid token or user not found' },
        { status: 401 }
      );
    }

    // Get noteId from request body or query
    const body = await request.json().catch(() => ({}));
    const noteId = body.noteId || request.nextUrl.searchParams.get('noteId');

    if (!noteId) {
      return NextResponse.json(
        { error: 'noteId is required' },
        { status: 400 }
      );
    }

    // Check if user has access to this note
    // First check if user owns the note
    const { data: note, error: noteError } = await supabase
      .from('notes')
      .select('user_id')
      .eq('id', noteId)
      .single();

    if (noteError || !note) {
      return NextResponse.json(
        { error: 'Note not found' },
        { status: 404 }
      );
    }

    const isOwner = note.user_id === user.id;

    // If not owner, check if user has shared access
    let hasAccess = isOwner;
    let permission = isOwner ? 'write' : 'read';

    if (!isOwner) {
      const { data: share, error: shareError } = await supabase
        .from('note_shares')
        .select('permission')
        .eq('note_id', noteId)
        .eq('shared_with_user_id', user.id)
        .single();

      if (share && !shareError) {
        hasAccess = true;
        permission = share.permission;
      }
    }

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Create a session for Liveblocks
    const session = liveblocks.prepareSession(user.id, {
      userInfo: {
        name: user.email || 'Anonymous',
        email: user.email || '',
        avatar: user.user_metadata?.avatar_url || '',
      },
    });

    // Give the user access to the room (note)
    session.allow(`note:${noteId}`, session.FULL_ACCESS);

    // Authorize the user and return the result
    const { status, body: responseBody } = await session.authorize();
    
    return new NextResponse(responseBody, { status });
  } catch (error) {
    console.error('Liveblocks auth error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
