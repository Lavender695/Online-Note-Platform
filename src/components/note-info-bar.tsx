'use client';
import React from 'react';
import { Button } from '@/components/ui/button';
import { Share2 } from 'lucide-react';
import { PermissionSettings } from './collaboration/PermissionSettings';
import { Note } from '@/types/note';
import { useAuth } from '@/hooks/use-auth';
import { useNotes } from '@/hooks/use-notes';
import { useUserSearch } from '@/hooks/use-user-search';
import { usePermission } from '@/hooks/use-permission';
import { PermissionType } from '@/types/permissions';

interface NoteInfoBarProps {
  note: Note;
}

export function NoteInfoBar({ note }: NoteInfoBarProps) {
  const { user } = useAuth();
  const { updateNote } = useNotes();
  const [showPermissionSettings, setShowPermissionSettings] = React.useState(false);
  const { permission, isOwner, loading } = usePermission(note);

  if (!note) return null;

  // 权限文本映射
  const permissionTextMap: Record<PermissionType, string> = {
    'viewer': '查看权限',
    'commenter': '建议权限',
    'editor': '编辑权限'
  };

  return (
    <div className="bg-background border-b border-border p-3 flex items-center justify-between shadow-sm">
      {/* 左侧：文档信息 */}
      <div className="flex items-center gap-3">
        <div className="flex flex-col">
          <div className="text-sm text-gray-600">
            <span className="font-medium">所有者：</span>
            <span>{note.user_id}</span>
          </div>
          <div className="text-xs text-gray-500">
            更新于 {new Date(note.updated_at).toLocaleString()}
          </div>
        </div>
      </div>

      {/* 右侧：操作按钮 */}
      <div className="flex items-center gap-2">
        {/* 只有所有者可以管理权限 */}
        {isOwner() && (
          <>
            <PermissionSettings 
              note={note} 
              open={showPermissionSettings} 
              onOpenChange={setShowPermissionSettings}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPermissionSettings(true)}
              className="flex items-center gap-1"
            >
              <Share2 className="h-3 w-3" />
              共享
            </Button>
          </>
        )}

        {/* 非所有者显示权限信息 */}
        {!isOwner() && permission && (
          <div className="text-sm text-gray-600 px-3 py-1 rounded-full bg-gray-100">
            {permissionTextMap[permission]}
          </div>
        )}
      </div>
    </div>
  );
}
