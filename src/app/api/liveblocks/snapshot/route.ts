import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_KEY!
);

// Save snapshot
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { noteId, snapshotData } = body;

    if (!noteId || !snapshotData) {
      return NextResponse.json(
        { error: 'noteId and snapshotData are required' },
        { status: 400 }
      );
    }

    // Verify user has write access to this note
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

    if (!isOwner) {
      // Check if user has write access
      const { data: share } = await supabase
        .from('note_shares')
        .select('permission')
        .eq('note_id', noteId)
        .eq('shared_with_user_id', user.id)
        .single();

      if (!share || share.permission !== 'write') {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        );
      }
    }

    // Save snapshot
    const { data: snapshot, error: snapshotError } = await supabase
      .from('liveblocks_snapshots')
      .insert({
        note_id: noteId,
        snapshot_data: snapshotData,
        created_by: user.id,
      })
      .select()
      .single();

    if (snapshotError) {
      console.error('Snapshot save error:', snapshotError);
      return NextResponse.json(
        { error: 'Failed to save snapshot' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      snapshot,
    });
  } catch (error) {
    console.error('Snapshot error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Get latest snapshot
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

    // Verify user has access to this note
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

    if (!isOwner) {
      // Check if user has access
      const { data: share } = await supabase
        .from('note_shares')
        .select('permission')
        .eq('note_id', noteId)
        .eq('shared_with_user_id', user.id)
        .single();

      if (!share) {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        );
      }
    }

    // Get latest snapshot
    const { data: snapshot, error: snapshotError } = await supabase
      .from('liveblocks_snapshots')
      .select('*')
      .eq('note_id', noteId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (snapshotError && snapshotError.code !== 'PGRST116') {
      // PGRST116 is "no rows returned" which is OK
      console.error('Snapshot fetch error:', snapshotError);
      return NextResponse.json(
        { error: 'Failed to fetch snapshot' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      snapshot: snapshot || null,
    });
  } catch (error) {
    console.error('Snapshot fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
