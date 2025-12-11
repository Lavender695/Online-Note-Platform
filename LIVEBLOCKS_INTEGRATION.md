# Liveblocks Integration for Collaborative Editing

This document describes the Liveblocks integration for real-time collaborative editing in the Online Note Platform.

## Overview

The integration allows multiple users to edit notes simultaneously with real-time synchronization using:
- **Liveblocks**: Real-time collaboration infrastructure
- **Yjs**: Conflict-free replicated data type (CRDT) for document synchronization
- **Plate Editor**: Rich text editor with Yjs integration

## Features

1. **Real-time Collaborative Editing**: Multiple users can edit the same note simultaneously
2. **Server-side Authentication**: Uses Supabase access tokens for secure authentication
3. **Periodic Snapshots**: Automatically saves document state to Supabase every 10 seconds
4. **Permission Management**: Only note owners can authorize other users to view/edit notes

## Setup

### 1. Environment Variables

Add the following to your `.env` file:

```env
LIVEBLOCKS_SECRET_KEY=your_liveblocks_secret_key
```

Get your secret key from [Liveblocks Dashboard](https://liveblocks.io/dashboard/apikeys).

### 2. Database Schema

Create a `note_permissions` table in Supabase for managing shared access:

```sql
CREATE TABLE note_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_type TEXT NOT NULL CHECK (permission_type IN ('read', 'write')),
  granted_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(note_id, user_id)
);

-- Add indexes for faster queries
CREATE INDEX idx_note_permissions_note_id ON note_permissions(note_id);
CREATE INDEX idx_note_permissions_user_id ON note_permissions(user_id);

-- Enable Row Level Security
ALTER TABLE note_permissions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view permissions for notes they own or have access to
CREATE POLICY "Users can view their note permissions"
ON note_permissions FOR SELECT
USING (
  user_id = auth.uid() 
  OR granted_by = auth.uid()
  OR note_id IN (SELECT id FROM notes WHERE user_id = auth.uid())
);

-- Policy: Only note owners can grant permissions
CREATE POLICY "Only note owners can grant permissions"
ON note_permissions FOR INSERT
WITH CHECK (
  note_id IN (SELECT id FROM notes WHERE user_id = auth.uid())
);

-- Policy: Only note owners can revoke permissions
CREATE POLICY "Only note owners can delete permissions"
ON note_permissions FOR DELETE
USING (
  note_id IN (SELECT id FROM notes WHERE user_id = auth.uid())
);
```

## Architecture

### Authentication Flow

1. Client requests Liveblocks access with Supabase access token
2. Server verifies token with Supabase `auth.getUser()`
3. Server checks note ownership and permissions
4. Server creates Liveblocks session with appropriate access level
5. Client receives Liveblocks token and connects to room

### Room Naming Convention

Rooms are named using the format: `note_{noteId}`

Example: `note_123e4567-e89b-12d3-a456-426614174000`

### Permission Levels

- **Owner**: Full access (read + write)
- **Shared User**: Read-only or write access based on `note_permissions` table

## API Endpoints

### POST /api/liveblocks/auth

Authenticates users for Liveblocks collaborative editing.

**Request:**
```typescript
Headers: {
  Authorization: "Bearer <supabase_access_token>"
  Content-Type: "application/json"
}

Body: {
  roomId: "note_{noteId}"
}
```

**Response:**
- Success (200): Liveblocks session token
- Unauthorized (401): Invalid or expired token
- Forbidden (403): No permission to access note
- Not Found (404): Note doesn't exist

## Usage

The collaborative editing is automatically enabled for existing notes. When viewing a note, the editor is wrapped with `CollaborativeEditorProvider`:

```tsx
<CollaborativeEditorProvider note={note}>
  <Editor />
</CollaborativeEditorProvider>
```

## Periodic Snapshots

The system automatically saves the document state to Supabase every 10 seconds. This ensures data persistence and provides backup points.

Snapshots are saved to the `notes` table, updating the `content` and `updated_at` fields.

## Future Enhancements

1. **Presence Indicators**: Show cursors and selections of other users
2. **User Avatars**: Display who is currently editing
3. **Conflict Resolution UI**: Better handling of merge conflicts
4. **Offline Support**: Queue changes when offline and sync when back online
5. **Permission Management UI**: Allow owners to share notes with specific users

## Troubleshooting

### Authentication Errors

- Ensure `LIVEBLOCKS_SECRET_KEY` is set correctly
- Verify Supabase access token is valid
- Check user has permission to access the note

### Synchronization Issues

- Check browser console for Liveblocks connection errors
- Verify network connectivity
- Ensure Yjs document is properly initialized

### Snapshot Failures

- Check Supabase connection
- Verify `notes` table permissions
- Check browser console for error messages

## Security Considerations

1. **Token Verification**: Always verify Supabase tokens on the server
2. **Permission Checks**: Validate user permissions before granting room access
3. **Room Isolation**: Each note has its own isolated room
4. **RLS Policies**: Use Row Level Security for all database operations
5. **No Service Role Key**: Never expose Supabase service role key to clients

## Dependencies

- `@liveblocks/client`: ^3.11.1
- `@liveblocks/react`: ^3.11.1
- `@liveblocks/node`: ^3.11.1
- `@liveblocks/yjs`: ^3.11.1
- `@slate-yjs/core`: Latest
- `yjs`: ^13.6.27
