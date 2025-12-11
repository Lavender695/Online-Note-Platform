import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

    const token = authHeader.substring(7);

    // Verify the user with Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid token or user not found' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { noteId, userEmail, permission } = body;

    if (!noteId || !userEmail || !permission) {
      return NextResponse.json(
        { error: 'noteId, userEmail, and permission are required' },
        { status: 400 }
      );
    }

    if (!['read', 'write'].includes(permission)) {
      return NextResponse.json(
        { error: 'Permission must be either "read" or "write"' },
        { status: 400 }
      );
    }

    // Check if user owns this note
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

    if (note.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Only note owner can invite users' },
        { status: 403 }
      );
    }

    // Find the user to invite by email
    // Note: This queries all users which can be inefficient for large user bases.
    // Consider implementing a user lookup endpoint or caching mechanism for production.
    const { data: authData } = await supabase.auth.admin.listUsers();
    
    let invitedUserId = null;
    if (authData?.users) {
      const foundUser = authData.users.find(u => u.email === userEmail);
      if (foundUser) {
        invitedUserId = foundUser.id;
      }
    }

    if (!invitedUserId) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if already shared
    const { data: existingShare } = await supabase
      .from('note_shares')
      .select('id, permission')
      .eq('note_id', noteId)
      .eq('shared_with_user_id', invitedUserId)
      .single();

    if (existingShare) {
      // Update existing share
      const { error: updateError } = await supabase
        .from('note_shares')
        .update({ permission })
        .eq('id', existingShare.id);

      if (updateError) {
        return NextResponse.json(
          { error: 'Failed to update share' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Share updated successfully',
      });
    }

    // Create new share
    const { data: newShare, error: shareError } = await supabase
      .from('note_shares')
      .insert({
        note_id: noteId,
        shared_with_user_id: invitedUserId,
        permission,
        invited_by: user.id,
      })
      .select()
      .single();

    if (shareError) {
      return NextResponse.json(
        { error: 'Failed to create share' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'User invited successfully',
      share: newShare,
    });
  } catch (error) {
    console.error('Invite error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Get list of users shared with a note
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

    // Check if user owns this note
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

    if (note.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Only note owner can view shares' },
        { status: 403 }
      );
    }

    // Get all shares for this note
    const { data: shares, error: sharesError } = await supabase
      .from('note_shares')
      .select('id, shared_with_user_id, permission, created_at')
      .eq('note_id', noteId);

    if (sharesError) {
      return NextResponse.json(
        { error: 'Failed to fetch shares' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      shares: shares || [],
    });
  } catch (error) {
    console.error('Get shares error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Revoke access
export async function DELETE(request: NextRequest) {
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
    const { shareId } = body;

    if (!shareId) {
      return NextResponse.json(
        { error: 'shareId is required' },
        { status: 400 }
      );
    }

    // Get the share to verify ownership
    const { data: share, error: shareError } = await supabase
      .from('note_shares')
      .select('note_id')
      .eq('id', shareId)
      .single();

    if (shareError || !share) {
      return NextResponse.json(
        { error: 'Share not found' },
        { status: 404 }
      );
    }

    // Verify user owns the note
    const { data: note, error: noteError } = await supabase
      .from('notes')
      .select('user_id')
      .eq('id', share.note_id)
      .single();

    if (noteError || !note || note.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Only note owner can revoke access' },
        { status: 403 }
      );
    }

    // Delete the share
    const { error: deleteError } = await supabase
      .from('note_shares')
      .delete()
      .eq('id', shareId);

    if (deleteError) {
      return NextResponse.json(
        { error: 'Failed to revoke access' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Access revoked successfully',
    });
  } catch (error) {
    console.error('Revoke access error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
