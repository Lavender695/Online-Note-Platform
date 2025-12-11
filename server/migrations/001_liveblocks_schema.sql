-- Liveblocks Integration Schema
-- This migration creates tables needed for collaborative editing with Liveblocks

-- Table for storing periodic snapshots of collaborative documents
CREATE TABLE IF NOT EXISTS liveblocks_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  snapshot_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Index for efficient snapshot retrieval by note
CREATE INDEX IF NOT EXISTS idx_liveblocks_snapshots_note_id ON liveblocks_snapshots(note_id);
CREATE INDEX IF NOT EXISTS idx_liveblocks_snapshots_created_at ON liveblocks_snapshots(created_at DESC);

-- Table for managing note sharing and permissions
CREATE TABLE IF NOT EXISTS note_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  shared_with_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission VARCHAR(20) NOT NULL CHECK (permission IN ('read', 'write')),
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(note_id, shared_with_user_id)
);

-- Indexes for efficient permission checks
CREATE INDEX IF NOT EXISTS idx_note_shares_note_id ON note_shares(note_id);
CREATE INDEX IF NOT EXISTS idx_note_shares_user_id ON note_shares(shared_with_user_id);

-- Enable Row Level Security
ALTER TABLE liveblocks_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_shares ENABLE ROW LEVEL SECURITY;

-- RLS Policies for liveblocks_snapshots
-- Users can view snapshots for notes they own or have access to
CREATE POLICY "Users can view snapshots for accessible notes" ON liveblocks_snapshots
  FOR SELECT
  USING (
    note_id IN (
      SELECT id FROM notes WHERE user_id = auth.uid()
      UNION
      SELECT note_id FROM note_shares WHERE shared_with_user_id = auth.uid()
    )
  );

-- Users can create snapshots for notes they own or have write access to
CREATE POLICY "Users can create snapshots for writable notes" ON liveblocks_snapshots
  FOR INSERT
  WITH CHECK (
    note_id IN (
      SELECT id FROM notes WHERE user_id = auth.uid()
      UNION
      SELECT note_id FROM note_shares WHERE shared_with_user_id = auth.uid() AND permission = 'write'
    )
  );

-- RLS Policies for note_shares
-- Users can view shares for notes they own
CREATE POLICY "Note owners can view shares" ON note_shares
  FOR SELECT
  USING (
    note_id IN (SELECT id FROM notes WHERE user_id = auth.uid())
  );

-- Users can view their own access grants
CREATE POLICY "Users can view their own access grants" ON note_shares
  FOR SELECT
  USING (shared_with_user_id = auth.uid());

-- Only note owners can create/manage shares
CREATE POLICY "Note owners can manage shares" ON note_shares
  FOR ALL
  USING (
    note_id IN (SELECT id FROM notes WHERE user_id = auth.uid())
  )
  WITH CHECK (
    note_id IN (SELECT id FROM notes WHERE user_id = auth.uid())
  );

-- Comments
COMMENT ON TABLE liveblocks_snapshots IS 'Stores periodic snapshots of collaborative documents for Liveblocks';
COMMENT ON TABLE note_shares IS 'Manages sharing and permissions for collaborative notes';
