'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Save, Cloud, Trash2, Eraser } from 'lucide-react';
import { Note } from '@/types/note';

type EditorActionsProps = {
  note?: Note;
  saving: boolean;
  lastSaved: Date | null;
  showDeleteDialog: boolean;
  showClearDialog: boolean;
  setShowDeleteDialog: (show: boolean) => void;
  setShowClearDialog: (show: boolean) => void;
  onSave: () => void;
  onDelete: () => void;
  onClear: () => void;
};

/**
 * EditorActions Component
 * 
 * Displays action buttons for the editor including save, clear, and delete.
 * This component is extracted to avoid code duplication between collaborative
 * and non-collaborative editor modes.
 */
export function EditorActions({
  note,
  saving,
  lastSaved,
  showDeleteDialog,
  showClearDialog,
  setShowDeleteDialog,
  setShowClearDialog,
  onSave,
  onDelete,
  onClear,
}: EditorActionsProps) {
  return (
    <>
      {/* 最后保存时间 - 右上角（toolbar下方） */}
      {lastSaved && (
        <div className="absolute top-14 right-4 z-10 text-xs text-muted-foreground whitespace-nowrap">
          自动保存于: {lastSaved.toLocaleTimeString()}
        </div>
      )}
      
      {/* 操作按钮区域 */}
      <div className="fixed bottom-8 right-8 flex items-center gap-2 z-10">
        {/* 保存按钮 */}
        <Button 
          onClick={onSave}
          disabled={saving}
          className="flex items-center gap-2 bg-primary hover:bg-primary/90"
        >
          {saving ? (
            <>
              <Cloud className="h-4 w-4 animate-spin" />
              保存中...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              保存笔记
            </>
          )}
        </Button>
      </div>

      {/* 清空和删除按钮 */}
      <div className="fixed bottom-8 left-8 flex gap-2 z-10 transition-all duration-200 button-container-bottom-left">
        {/* 清空文档按钮 */}
        <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
          <DialogTrigger asChild>
            <Button variant="secondary" className="flex items-center gap-2">
              <Eraser className="h-4 w-4" />
              清空文档
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>确认清空</DialogTitle>
              <DialogDescription>
                您确定要清空当前文档吗？此操作无法撤销，但笔记本身不会被删除。
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setShowClearDialog(false)}>
                取消
              </Button>
              <Button variant="destructive" onClick={onClear}>
                确认清空
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 删除笔记按钮 */}
        {note && (
          <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
            <DialogTrigger asChild>
              <Button variant="destructive" className="flex items-center gap-2">
                <Trash2 className="h-4 w-4" />
                删除笔记
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>确认删除</DialogTitle>
                <DialogDescription>
                  您确定要删除这篇笔记吗？此操作无法撤销。
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setShowDeleteDialog(false)}>
                  取消
                </Button>
                <Button variant="destructive" onClick={onDelete}>
                  确认删除
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </>
  );
}
