# Liveblocks Integration - Setup Instructions

## Database Setup

The database schema for Liveblocks integration needs to be applied to your Supabase database. The schema includes:

1. **liveblocks_snapshots** - Stores periodic snapshots of collaborative documents
2. **note_shares** - Manages sharing and permissions for collaborative notes

### How to Apply the Schema

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy the contents of `server/migrations/001_liveblocks_schema.sql`
4. Paste and execute the SQL in the SQL Editor

Alternatively, if you have Supabase CLI installed:

```bash
# Make sure you're in the project root
supabase db push
```

## Environment Variables

The following environment variables must be set for Liveblocks integration to work:

### Required Variables

Add these to your Vercel project or `.env.local` file:

```env
# Liveblocks Public Key (get from https://liveblocks.io/dashboard)
NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY=pk_xxx

# Liveblocks Secret Key (get from https://liveblocks.io/dashboard)
# ⚠️ NEVER commit this to git - only set in Vercel environment variables
LIVEBLOCKS_SECRET=sk_xxx

# Supabase Service Role Key (optional, for admin operations)
# If not provided, will use NEXT_PUBLIC_SUPABASE_KEY
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Getting Liveblocks Keys

1. Sign up at https://liveblocks.io
2. Create a new project
3. Go to the API keys section
4. Copy the Public Key and Secret Key
5. Add them to your environment variables in Vercel

⚠️ **Important**: Never commit the `LIVEBLOCKS_SECRET` to your repository. Always use environment variables.

## Testing

After setting up the database and environment variables:

1. Build the application: `npm run build`
2. Start the development server: `npm run dev`
3. Open a note in the editor
4. The collaboration features should be available

## Features Included

- **Real-time Collaboration**: Multiple users can edit the same note simultaneously
- **Presence Indicators**: See who else is viewing/editing the note
- **Automatic Snapshots**: Note state is saved every 10 seconds and on page unload
- **Permission Management**: Note owners can invite users with read or write access
- **Secure Authentication**: Uses Supabase access tokens for authentication
