import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_KEY!
);

// Check user's access to a note
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization token' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid token or user not found' },
        { status: 401 }
      );
    }

    const noteId = request.nextUrl.searchParams.get('noteId');

    if (!noteId) {
      return NextResponse.json(
        { error: 'noteId is required' },
        { status: 400 }
      );
    }

    // Check if user owns the note
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

    if (note.user_id === user.id) {
      return NextResponse.json({
        hasAccess: true,
        permission: 'write',
        isOwner: true,
      });
    }

    // Check if user has shared access
    const { data: share, error: shareError } = await supabase
      .from('note_shares')
      .select('permission')
      .eq('note_id', noteId)
      .eq('shared_with_user_id', user.id)
      .single();

    if (shareError || !share) {
      return NextResponse.json({
        hasAccess: false,
        permission: null,
        isOwner: false,
      });
    }

    return NextResponse.json({
      hasAccess: true,
      permission: share.permission,
      isOwner: false,
    });
  } catch (error) {
    console.error('Access check error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
