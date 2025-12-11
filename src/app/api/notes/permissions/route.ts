import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Note Permissions API
 * 
 * Manage sharing permissions for notes. Only note owners can grant/revoke permissions.
 * 
 * Endpoints:
 * - GET: List all users with access to a note
 * - POST: Grant permission to a user
 * - DELETE: Revoke permission from a user
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_KEY || '';

/**
 * GET /api/notes/permissions?noteId={noteId}
 * List all users with access to a note
 */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid Authorization header' },
        { status: 401 }
      );
    }

    const accessToken = authHeader.substring(7);
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid or expired access token' },
        { status: 401 }
      );
    }

    // Get noteId from query params
    const { searchParams } = new URL(req.url);
    const noteId = searchParams.get('noteId');

    if (!noteId) {
      return NextResponse.json(
        { error: 'Missing noteId parameter' },
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

    if (note.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Only note owner can view permissions' },
        { status: 403 }
      );
    }

    // Get all permissions for this note
    const { data: permissions, error: permError } = await supabase
      .from('note_permissions')
      .select('id, user_id, permission_type, created_at')
      .eq('note_id', noteId);

    if (permError) {
      return NextResponse.json(
        { error: permError.message },
        { status: 500 }
      );
    }

    // Get user details for each permission
    const permissionsWithUsers = await Promise.all(
      (permissions || []).map(async (perm) => {
        const { data: userData } = await supabase
          .from('users')
          .select('id, email')
          .eq('id', perm.user_id)
          .single();

        return {
          ...perm,
          user: userData,
        };
      })
    );

    return NextResponse.json({ permissions: permissionsWithUsers });
  } catch (error) {
    console.error('Error fetching permissions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/notes/permissions
 * Grant permission to a user
 * 
 * Body: {
 *   noteId: string,
 *   userEmail: string,
 *   permissionType: 'read' | 'write'
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid Authorization header' },
        { status: 401 }
      );
    }

    const accessToken = authHeader.substring(7);
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid or expired access token' },
        { status: 401 }
      );
    }

    // Parse request body
    const { noteId, userEmail, permissionType } = await req.json();

    if (!noteId || !userEmail || !permissionType) {
      return NextResponse.json(
        { error: 'Missing required fields: noteId, userEmail, permissionType' },
        { status: 400 }
      );
    }

    if (!['read', 'write'].includes(permissionType)) {
      return NextResponse.json(
        { error: 'Invalid permissionType. Must be "read" or "write"' },
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

    if (note.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Only note owner can grant permissions' },
        { status: 403 }
      );
    }

    // Find the user by email
    const { data: targetUser, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', userEmail)
      .single();

    if (userError || !targetUser) {
      return NextResponse.json(
        { error: 'User not found with that email' },
        { status: 404 }
      );
    }

    // Check if owner is trying to share with themselves
    if (targetUser.id === user.id) {
      return NextResponse.json(
        { error: 'Cannot share note with yourself' },
        { status: 400 }
      );
    }

    // Insert or update permission
    const { data: permission, error: permError } = await supabase
      .from('note_permissions')
      .upsert({
        note_id: noteId,
        user_id: targetUser.id,
        permission_type: permissionType,
        granted_by: user.id,
      }, {
        onConflict: 'note_id,user_id'
      })
      .select()
      .single();

    if (permError) {
      return NextResponse.json(
        { error: permError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      message: 'Permission granted successfully',
      permission 
    });
  } catch (error) {
    console.error('Error granting permission:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/notes/permissions?noteId={noteId}&userId={userId}
 * Revoke permission from a user
 */
export async function DELETE(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid Authorization header' },
        { status: 401 }
      );
    }

    const accessToken = authHeader.substring(7);
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid or expired access token' },
        { status: 401 }
      );
    }

    // Get params from query
    const { searchParams } = new URL(req.url);
    const noteId = searchParams.get('noteId');
    const userId = searchParams.get('userId');

    if (!noteId || !userId) {
      return NextResponse.json(
        { error: 'Missing noteId or userId parameter' },
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

    if (note.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Only note owner can revoke permissions' },
        { status: 403 }
      );
    }

    // Delete permission
    const { error: deleteError } = await supabase
      .from('note_permissions')
      .delete()
      .eq('note_id', noteId)
      .eq('user_id', userId);

    if (deleteError) {
      return NextResponse.json(
        { error: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      message: 'Permission revoked successfully' 
    });
  } catch (error) {
    console.error('Error revoking permission:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
