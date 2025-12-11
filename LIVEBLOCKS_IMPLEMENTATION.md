# Liveblocks Integration - Implementation Summary

This document provides a comprehensive overview of the Liveblocks integration for real-time collaborative editing in the Online Note Platform.

## Overview

The integration adds real-time collaborative editing capabilities to the existing Next.js + Plate editor application, allowing multiple users to edit notes simultaneously with presence indicators, cursor tracking, and permission management.

## Features Implemented

### 1. **Real-time Collaboration**
- Multiple users can edit the same note simultaneously
- Changes are synchronized in real-time via Liveblocks
- Collaborative editing is only enabled for existing notes (not for new/unsaved notes)

### 2. **Presence Indicators**
- Display active collaborators with avatars in the top-right corner
- Shows up to 3 users directly, with a "+N" indicator for additional users
- Hover over avatars to see user names

### 3. **Permission Management**
- Only note owners can invite users to collaborate
- Two permission levels: "read" (view-only) and "write" (can edit)
- Note owners can revoke access at any time
- Invited users see shared notes in their dashboard alongside their own notes

### 4. **Automatic Snapshots**
- Periodic snapshots saved every 10 seconds to Supabase
- Final snapshot saved when user leaves the page
- Snapshots stored in `liveblocks_snapshots` table
- Only users with write access can save snapshots

### 5. **Share Dialog**
- Share button visible only for existing notes (after first save)
- Invite users by email address
- View list of users with access to the note
- Revoke access from the same dialog

## Architecture

### Database Schema

Two new tables were created:

#### `liveblocks_snapshots`
Stores periodic snapshots of collaborative documents.
- `id`: UUID primary key
- `note_id`: Reference to notes table
- `snapshot_data`: JSONB containing editor state
- `created_at`: Timestamp
- `created_by`: User who created the snapshot

#### `note_shares`
Manages sharing and permissions for notes.
- `id`: UUID primary key
- `note_id`: Reference to notes table
- `shared_with_user_id`: User who has access
- `permission`: Either 'read' or 'write'
- `invited_by`: User who granted access
- `created_at`: Timestamp

Both tables have Row Level Security (RLS) policies to ensure users can only access appropriate data.

### API Routes

Four serverless API routes were created under `/api/liveblocks/`:

#### `/api/liveblocks/auth` (POST)
Authenticates users with Liveblocks.
- Accepts: `noteId` in request body
- Requires: `Authorization: Bearer <supabase_token>` header
- Returns: Liveblocks session token

#### `/api/liveblocks/access` (GET)
Checks if a user has access to a note.
- Accepts: `noteId` query parameter
- Requires: Authorization header
- Returns: `{ hasAccess, permission, isOwner }`

#### `/api/liveblocks/invite` (POST, GET, DELETE)
Manages note sharing invitations.
- POST: Invite a user (requires `noteId`, `userEmail`, `permission`)
- GET: List users with access (requires `noteId` query param)
- DELETE: Revoke access (requires `shareId`)
- Only note owners can use this endpoint

#### `/api/liveblocks/snapshot` (POST, GET)
Manages note snapshots.
- POST: Save a snapshot (requires `noteId`, `snapshotData`)
- GET: Retrieve latest snapshot (requires `noteId` query param)
- Requires write access to the note

### Frontend Components

#### `src/components/collaboration/`

**collaborative-editor-provider.tsx**
- Wraps the Plate editor with Liveblocks RoomProvider
- Only activates for existing notes (not new notes)
- Handles Liveblocks room initialization

**collaborators.tsx**
- Displays active collaborators with avatars
- Shows user presence information
- Tooltips show user names

**share-dialog.tsx**
- UI for inviting users to collaborate
- Displays current shares and permissions
- Allows revoking access

#### `src/lib/liveblocks.config.ts`
- Configures Liveblocks client
- Sets up custom authentication endpoint
- Creates typed hooks for Liveblocks features

#### `src/hooks/use-snapshot.ts`
- Custom hook for managing periodic snapshots
- Handles automatic saving every 10 seconds
- Saves final snapshot on page unload

### Frontend Integration

The main `plate-editor.tsx` component was modified to:
1. Import collaboration components
2. Add share button (only for saved notes)
3. Display collaborators in top-right corner
4. Wrap editor with CollaborativeEditorProvider for existing notes
5. Initialize snapshot hook for automatic saving

The `use-notes.ts` hook was enhanced to:
- Fetch both owned notes and shared notes
- Display shared notes in the dashboard
- Deduplicate notes if user has multiple access types

## Environment Variables Required

The following environment variables must be set:

```env
# Liveblocks Public Key (safe to commit to client-side code)
NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY=pk_xxx

# Liveblocks Secret Key (server-side only, NEVER commit to git)
LIVEBLOCKS_SECRET=sk_xxx

# Supabase URLs and Keys (existing)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_KEY=xxx

# Optional: Supabase Service Role Key for admin operations
SUPABASE_SERVICE_ROLE_KEY=xxx
```

## Setup Instructions

### 1. Database Setup
Run the SQL migration script:
```bash
# Copy the contents of server/migrations/001_liveblocks_schema.sql
# and execute in Supabase SQL Editor
```

Or use Supabase CLI:
```bash
supabase db push
```

### 2. Get Liveblocks API Keys
1. Sign up at https://liveblocks.io
2. Create a new project
3. Go to API keys section
4. Copy the Public Key and Secret Key

### 3. Configure Environment Variables
In Vercel or your deployment platform:
1. Add `NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY`
2. Add `LIVEBLOCKS_SECRET` (mark as secret)
3. Ensure Supabase keys are configured

For local development, create `.env.local`:
```bash
NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY=pk_dev_xxx
LIVEBLOCKS_SECRET=sk_dev_xxx
```

### 4. Install Dependencies
```bash
npm install
```

### 5. Build and Test
```bash
npm run build
npm run dev
```

## Testing Checklist

### Database Testing
- [ ] Verify tables are created in Supabase
- [ ] Test RLS policies by accessing data as different users
- [ ] Verify foreign key constraints work correctly

### Authentication Testing
- [ ] Test Liveblocks auth endpoint with valid Supabase token
- [ ] Test auth endpoint with invalid token (should fail)
- [ ] Verify only users with access can authenticate for a note

### Collaboration Testing
- [ ] Open same note in two different browsers/users
- [ ] Verify both users can see each other in collaborators list
- [ ] Test simultaneous editing
- [ ] Verify changes sync in real-time

### Permission Testing
- [ ] Share a note with another user (read permission)
- [ ] Verify shared user can view but not edit
- [ ] Share a note with write permission
- [ ] Verify shared user can edit
- [ ] Test revoking access
- [ ] Verify revoked user can no longer access the note

### Snapshot Testing
- [ ] Edit a note and wait 10 seconds
- [ ] Verify snapshot appears in liveblocks_snapshots table
- [ ] Close browser without saving
- [ ] Reopen note and verify data is preserved
- [ ] Check snapshot data structure in database

### UI Testing
- [ ] Verify share button appears only for saved notes
- [ ] Test share dialog opens and closes properly
- [ ] Verify collaborators display correctly
- [ ] Test inviting user by email
- [ ] Test permission dropdown (read/write)
- [ ] Verify error messages for invalid email

### Dashboard Testing
- [ ] Create a note and share it with another user
- [ ] Login as the other user
- [ ] Verify shared note appears in dashboard
- [ ] Verify shared note is accessible

## Known Limitations

1. **New Notes**: Collaboration features are disabled for new/unsaved notes. Users must save a note at least once before it can be shared.

2. **User Lookup**: Inviting users requires knowing their exact email address. There's no user search functionality.

3. **Real-time Conflicts**: While Liveblocks handles concurrent edits, complex scenarios (e.g., both users deleting the same content) may produce unexpected results. This is expected behavior for CRDT-based systems.

4. **Font Loading**: The build may fail due to Google Fonts network issues. This is unrelated to Liveblocks integration.

5. **Cursor Tracking**: Full cursor position tracking is configured but not yet implemented in the Plate editor plugin level. Users can see who's online but not exact cursor positions.

## Future Enhancements

1. **Cursor Tracking**: Implement full cursor position synchronization in the Plate editor
2. **User Search**: Add autocomplete/search when inviting users
3. **Access Notifications**: Notify users when they're granted access to a note
4. **Revision History**: Enhance snapshots to provide full revision history
5. **Comments**: Add commenting system using Liveblocks Comments API
6. **Conflict Resolution UI**: Provide UI for resolving edit conflicts
7. **Offline Support**: Cache changes locally when offline

## Troubleshooting

### "Failed to authenticate with Liveblocks"
- Check that `NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY` is set correctly
- Verify Supabase token is valid
- Check browser console for detailed error messages

### "Note not found"
- Ensure note exists in database
- Verify user has access to the note
- Check note_id is correct UUID format

### Snapshots not saving
- Verify user has write permission
- Check `liveblocks_snapshots` table exists
- Ensure environment variables are set
- Check browser console for errors

### Shared notes not appearing in dashboard
- Verify `note_shares` table has correct entries
- Check RLS policies are applied
- Ensure user is logged in with correct account

## Security Considerations

1. **Token Security**: Supabase access tokens are used for authentication. These are short-lived and automatically refreshed.

2. **Row Level Security**: All database tables use RLS to prevent unauthorized access.

3. **API Validation**: All API routes validate user permissions before allowing operations.

4. **Secret Keys**: The `LIVEBLOCKS_SECRET` must never be exposed to the client. It's only used in server-side API routes.

## Support

For issues or questions:
- Check the Liveblocks documentation: https://liveblocks.io/docs
- Check the Plate documentation: https://platejs.org
- Review the code in `src/components/collaboration/` for implementation details
- Open an issue in the repository

## License

This integration follows the same license as the main project (MIT).
