-- Migration: Create note_permissions table for collaborative editing
-- Purpose: Allow note owners to share notes with other users
-- Created: 2025-12-11

-- Create note_permissions table
CREATE TABLE IF NOT EXISTS note_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL,
  user_id UUID NOT NULL,
  permission_type TEXT NOT NULL CHECK (permission_type IN ('read', 'write')),
  granted_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT note_permissions_note_user_unique UNIQUE(note_id, user_id)
);

-- Add foreign key constraints
-- Note: Adjust these based on your actual table structure
-- If your notes table exists and has an id column:
ALTER TABLE note_permissions
  ADD CONSTRAINT fk_note_permissions_note
  FOREIGN KEY (note_id) 
  REFERENCES notes(id) 
  ON DELETE CASCADE;

-- If you're using Supabase auth.users:
ALTER TABLE note_permissions
  ADD CONSTRAINT fk_note_permissions_user
  FOREIGN KEY (user_id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;

ALTER TABLE note_permissions
  ADD CONSTRAINT fk_note_permissions_granted_by
  FOREIGN KEY (granted_by) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_note_permissions_note_id 
  ON note_permissions(note_id);

CREATE INDEX IF NOT EXISTS idx_note_permissions_user_id 
  ON note_permissions(user_id);

CREATE INDEX IF NOT EXISTS idx_note_permissions_granted_by 
  ON note_permissions(granted_by);

-- Enable Row Level Security
ALTER TABLE note_permissions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their note permissions" ON note_permissions;
DROP POLICY IF EXISTS "Only note owners can grant permissions" ON note_permissions;
DROP POLICY IF EXISTS "Only note owners can delete permissions" ON note_permissions;

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

-- Policy: Note owners and granted users can update their permission settings
CREATE POLICY "Users can update their permissions"
ON note_permissions FOR UPDATE
USING (
  note_id IN (SELECT id FROM notes WHERE user_id = auth.uid())
  OR user_id = auth.uid()
);

-- Policy: Only note owners can revoke permissions
CREATE POLICY "Only note owners can delete permissions"
ON note_permissions FOR DELETE
USING (
  note_id IN (SELECT id FROM notes WHERE user_id = auth.uid())
);

-- Create a function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_note_permissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating updated_at
DROP TRIGGER IF EXISTS update_note_permissions_updated_at_trigger ON note_permissions;
CREATE TRIGGER update_note_permissions_updated_at_trigger
  BEFORE UPDATE ON note_permissions
  FOR EACH ROW
  EXECUTE FUNCTION update_note_permissions_updated_at();

-- Add comment to table
COMMENT ON TABLE note_permissions IS 'Stores sharing permissions for notes in the collaborative editing system';
COMMENT ON COLUMN note_permissions.permission_type IS 'Type of permission: read (view only) or write (edit)';
COMMENT ON COLUMN note_permissions.granted_by IS 'User ID of the note owner who granted this permission';
