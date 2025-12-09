export type PermissionType = 'viewer' | 'commenter' | 'editor';

export interface NotePermission {
  id: string;
  note_id: string;
  user_id: string;
  permission: PermissionType;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  user_metadata?: {
    full_name?: string;
    avatar_url?: string;
  };
}
