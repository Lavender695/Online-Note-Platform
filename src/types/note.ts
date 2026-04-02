export interface Note {
  id: string;
  title: string;
  content: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  tags: string[];
  syncState: 'local' | 'synced' | 'dirty';
}
