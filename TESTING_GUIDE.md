# Testing Guide for Liveblocks Integration

This guide provides step-by-step instructions for testing the Liveblocks collaborative editing integration.

## Prerequisites

Before testing, ensure:
1. You have completed the setup steps in `LIVEBLOCKS_INTEGRATION.md`
2. The `note_permissions` table has been created in Supabase
3. Environment variables are configured (`.env.local` or `.env`)
4. The application is running

## Setup Steps

### 1. Database Setup

Run the migration script in Supabase SQL Editor:
```sql
-- Copy and execute the contents of database/migrations/001_create_note_permissions.sql
```

### 2. Environment Configuration

Ensure your `.env.local` contains:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_KEY=your_supabase_anon_key
LIVEBLOCKS_SECRET_KEY=your_liveblocks_secret_key
```

### 3. Install Dependencies

```bash
npm install
# or
pnpm install
```

### 4. Start the Development Server

```bash
npm run dev
```

## Testing Scenarios

### Test 1: Single User Editing

**Objective**: Verify that a single user can edit notes without collaborative features interfering.

1. Sign in to the application
2. Create a new note
3. Add content to the note
4. Verify that content is saved automatically every 3 seconds (local storage)
5. Wait for 10 seconds and check that a snapshot is saved to Supabase
6. Refresh the page and verify content persists

**Expected Results**:
- Content saves to local storage immediately
- Periodic snapshots occur every 10 seconds
- No Liveblocks connection errors in console

### Test 2: Real-time Collaborative Editing

**Objective**: Verify that multiple users can edit the same note simultaneously.

**Setup**:
1. Create two user accounts in Supabase Auth
2. User A creates a note
3. User A shares the note with User B (using the permissions API)

**Test Steps**:
1. User A signs in and opens the note in Browser Window 1
2. User B signs in and opens the same note in Browser Window 2 (or incognito)
3. User A types "Hello from User A"
4. User B should see the text appear in real-time
5. User B types "Hello from User B"
6. User A should see the text appear in real-time
7. Both users edit different parts of the document simultaneously
8. Verify no conflicts or data loss occurs

**Expected Results**:
- Changes appear in real-time for both users
- No data conflicts or overwrites
- Smooth editing experience
- Console shows successful Liveblocks connections

### Test 3: Permission Management

**Objective**: Verify that permission checks work correctly.

#### Test 3a: Grant Read Permission

1. User A (note owner) grants read permission to User B:
```bash
curl -X POST http://localhost:3000/api/notes/permissions \
  -H "Authorization: Bearer USER_A_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "noteId": "NOTE_ID",
    "userId": "USER_B_ID",
    "permissionType": "read"
  }'
```

2. User B opens the note
3. User B attempts to edit

**Expected Results**:
- User B can view the note
- User B's edits should be rejected or read-only (depending on Liveblocks config)

#### Test 3b: Grant Write Permission

1. User A updates permission to write:
```bash
curl -X POST http://localhost:3000/api/notes/permissions \
  -H "Authorization: Bearer USER_A_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "noteId": "NOTE_ID",
    "userId": "USER_B_ID",
    "permissionType": "write"
  }'
```

2. User B refreshes the page
3. User B attempts to edit

**Expected Results**:
- User B can now edit the note
- Changes sync properly

#### Test 3c: Revoke Permission

1. User A revokes permission:
```bash
curl -X DELETE "http://localhost:3000/api/notes/permissions?noteId=NOTE_ID&userId=USER_B_ID" \
  -H "Authorization: Bearer USER_A_ACCESS_TOKEN"
```

2. User B refreshes the page

**Expected Results**:
- User B receives a 403 Forbidden error
- User B cannot access the note

### Test 4: Authentication Flow

**Objective**: Verify that authentication works correctly.

1. User attempts to access Liveblocks without being signed in
2. User signs in
3. User opens a note

**Expected Results**:
- Unauthenticated users cannot connect to Liveblocks
- After sign-in, Liveblocks connection succeeds
- Access token is properly validated

### Test 5: Snapshot Functionality

**Objective**: Verify periodic snapshots save correctly.

1. User opens a note
2. Make several edits
3. Wait for 10+ seconds
4. Check Supabase database for updated content
5. Check browser console for "Snapshot saved" messages

**Expected Results**:
- Snapshots save every 10 seconds
- Database `updated_at` field updates
- No errors in console

### Test 6: Offline/Online Behavior

**Objective**: Verify behavior when network is interrupted.

1. User opens a note
2. Disable network connection
3. Make edits
4. Re-enable network connection

**Expected Results**:
- Liveblocks shows disconnection status
- Edits continue to work (local changes)
- Upon reconnection, changes sync automatically
- No data loss

### Test 7: Concurrent Editing Conflicts

**Objective**: Test CRDT conflict resolution.

1. Two users open the same note
2. Both users edit the same line simultaneously
3. Both users edit different parts of the same paragraph

**Expected Results**:
- Yjs/Liveblocks resolves conflicts automatically
- No data loss
- Final result is deterministic and consistent

### Test 8: List Permissions

**Objective**: Verify getting list of users with access.

```bash
curl -X GET "http://localhost:3000/api/notes/permissions?noteId=NOTE_ID" \
  -H "Authorization: Bearer USER_A_ACCESS_TOKEN"
```

**Expected Results**:
- Returns list of permissions
- Only note owner can access this endpoint
- Returns proper permission types (read/write)

## Common Issues and Solutions

### Issue: "No access token available"
**Solution**: Ensure user is signed in and session is valid

### Issue: "Invalid or expired access token"
**Solution**: Sign out and sign back in to refresh the token

### Issue: "Failed to authenticate" in Liveblocks
**Solution**: 
- Check LIVEBLOCKS_SECRET_KEY is set correctly
- Verify API route is accessible
- Check network tab for 401/403 errors

### Issue: Snapshots not saving
**Solution**:
- Check browser console for errors
- Verify Supabase connection
- Check `notes` table permissions

### Issue: Real-time sync not working
**Solution**:
- Check Liveblocks connection status in browser console
- Verify both users are authenticated
- Check that note_id is correct in room name format: `note_{noteId}`

## Browser Console Debugging

Enable verbose logging:
```javascript
// In browser console
localStorage.debug = 'liveblocks:*'
```

Check for:
- Liveblocks connection messages
- Authentication success/failure
- Snapshot save confirmations
- WebSocket connection status

## Performance Testing

### Metrics to Monitor

1. **Latency**: Time for changes to appear for other users (<100ms ideal)
2. **Snapshot Duration**: Time to save snapshots (<1s ideal)
3. **Memory Usage**: Monitor for memory leaks during long sessions
4. **Network Traffic**: Monitor WebSocket data size

### Load Testing

Test with multiple users:
- 2 users: Basic collaborative editing
- 5 users: Medium load
- 10+ users: High load (may require Liveblocks paid plan)

## Security Testing

### Test Invalid Access

1. Attempt to access note without permission
2. Attempt to use expired token
3. Attempt to manipulate permission checks client-side

**Expected Results**:
- All unauthorized access attempts fail
- Server-side validation prevents bypassing

### Test Token Security

1. Verify tokens are not exposed in URLs
2. Check that tokens are transmitted via headers only
3. Verify HTTPS is used in production

## Rollback Plan

If critical issues are found:

1. Remove collaborative provider wrapper:
```tsx
// In plate-editor.tsx, remove CollaborativeEditorProvider
// Revert to non-collaborative mode
```

2. Disable Liveblocks endpoints:
```typescript
// In src/app/api/liveblocks/auth/route.ts
export async function POST() {
  return NextResponse.json({ error: 'Temporarily disabled' }, { status: 503 });
}
```

3. Feature flag approach (recommended):
```typescript
const ENABLE_COLLABORATION = process.env.NEXT_PUBLIC_ENABLE_COLLABORATION === 'true';
```

## Success Criteria

The integration is considered successful when:

- ✅ Two users can simultaneously edit the same note
- ✅ Changes appear in real-time (<500ms latency)
- ✅ No data loss or conflicts occur
- ✅ Permissions are properly enforced
- ✅ Snapshots save successfully every 10 seconds
- ✅ Authentication flow works correctly
- ✅ No security vulnerabilities detected
- ✅ Performance is acceptable (no noticeable lag)

## Reporting Issues

When reporting issues, include:
1. Browser and version
2. Steps to reproduce
3. Expected vs actual behavior
4. Console error messages
5. Network tab screenshots
6. User IDs and note IDs (for debugging)

## Next Steps After Testing

1. Document any edge cases discovered
2. Add user-facing error messages
3. Implement presence indicators (cursors, avatars)
4. Add UI for permission management
5. Set up monitoring and analytics
6. Plan for production rollout
