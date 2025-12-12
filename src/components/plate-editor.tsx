'use client';

import * as React from 'react';

import { normalizeNodeId } from 'platejs';
import { Plate, usePlateEditor } from 'platejs/react';

import { EditorKit } from '@/components/editor-kit';
import { Editor, EditorContainer } from '@/components/ui/editor';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Note } from '@/types/note';
import { useNotes } from '@/hooks/use-notes';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';
import { Save, Cloud, Trash2, Eraser, Sparkles, X } from 'lucide-react';
import type { MyValue, RichText } from '@/components/plate-types';
import { AIToolbar } from '@/components/ai-toolbar';

type Props = {
  note?: Note;
};

export function PlateEditor({ note }: Props) {
  const { user, loading: authLoading } = useAuth();
  const { createNote, updateNote, deleteNotes, notes } = useNotes();
  const [saving, setSaving] = React.useState(false);
  const [lastSaved, setLastSaved] = React.useState<Date | null>(null);
  const [userActivityTime, setUserActivityTime] = React.useState(Date.now());
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
  const [showClearDialog, setShowClearDialog] = React.useState(false);
  const [showAIToolbar, setShowAIToolbar] = React.useState(false);
  // 新增：跟踪当前编辑的笔记（解决新建笔记时重复创建的问题）
  const [currentNote, setCurrentNote] = React.useState<Note | undefined>(note);
  
  // 检查用户状态和笔记列表
  React.useEffect(() => {
    console.log('用户状态:', user);
    console.log('认证加载中:', authLoading);
    console.log('笔记列表:', notes);
  }, [user, authLoading, notes]);

  // Get local storage key for this note
  const getLocalStorageKey = () => {
    return note ? `note_${note.id}` : 'new_note';
  };

  // Convert note content to editor value
  const getEditorValue = () => {
    // Check local storage first for unsaved changes
    const localContent = localStorage.getItem(getLocalStorageKey());
    if (localContent) {
      try {
        return JSON.parse(localContent);
      } catch (e) {
        console.error('本地存储解析失败:', e);
      }
    }

    if (!note) {
      // Empty editor for new notes
      return normalizeNodeId([
        {
          children: [{ text: '' }],
          type: 'h1',
        },
      ]);
    }
    
    // 检查内容是否是JSON字符串，如果是则解析，否则使用简单转换
    try {
      const parsedContent = JSON.parse(note.content);
      if (Array.isArray(parsedContent)) {
        // 如果是有效的编辑器内容结构，直接使用
        return normalizeNodeId(parsedContent);
      }
    } catch (e) {
      // 如果解析失败，说明是纯文本，使用简单转换
      console.error('笔记内容解析失败，使用纯文本模式:', e);
    }
    
    return normalizeNodeId([
      {
        children: [{ text: note.title }],
        type: 'h1',
      },
      {
        children: [{ text: note.content }],
        type: 'p',
      },
    ]);
  };

  const editor = usePlateEditor({
    plugins: EditorKit,
    value: getEditorValue(),
  });

  // 将AI生成的结果插入到编辑器中
  const handleAIResult = React.useCallback((result: string, mode: 'summary' | 'completion') => {
    if (!editor) return;

    if (mode === 'completion') {
      // 智能续写 - 插入到当前光标位置
      editor.tf.insertText(result);
      // 聚焦编辑器
      editor.tf.focus();
    } else if (mode === 'summary') {
      // 生成摘要 - 追加到文档末尾
      // 先移动到文档末尾
      editor.tf.collapse({ edge: 'end' });
      // 插入空行
      editor.tf.insertNodes({ type: 'p', children: [{ text: '' }] });
      // 插入摘要标题
      editor.tf.insertNodes({ type: 'h2', children: [{ text: 'AI 生成摘要' }] });
      // 插入摘要内容
      editor.tf.insertNodes({ type: 'p', children: [{ text: result }] });
      // 聚焦编辑器
      editor.tf.focus();
    }
  }, [editor]);

  // 获取当前编辑器的纯文本内容
  const getCurrentTextContent = () => {
    if (!editor?.children) return '';
    
    const content = editor.children as MyValue;
    let text = '';
    
    const extractText = (node: any) => {
      if (node.text) {
        text += node.text;
      } else if (node.children) {
        node.children.forEach(extractText);
      }
    };
    
    content.forEach(extractText);
    return text;
  };

  // 检查用户认证状态
  React.useEffect(() => {
    console.log('用户状态:', user);
  }, [user]);

  // Handle user input to reset debounce timer
  const handleUserActivity = () => {
    setUserActivityTime(Date.now());
  };

  // Auto-save to local storage when editor value changes
  React.useEffect(() => {
    if (!editor) return;

    const saveToLocal = () => {
      const value = editor.children;
      localStorage.setItem(getLocalStorageKey(), JSON.stringify(value));
      console.log('已保存到本地存储:', value);
    };

    // Save on every change with a small delay
    const debounceTimer = setTimeout(saveToLocal, 500);
    return () => clearTimeout(debounceTimer);
  }, [editor?.children, getLocalStorageKey]);

  // Save note to Supabase
  const saveNote = async (isManualSave = false) => {
    if (!user) {
      console.error('用户未登录');
      if (isManualSave) toast.error('请先登录');
      return;
    }

    if (authLoading) {
      console.error('认证状态加载中');
      if (isManualSave) toast.error('认证状态加载中，请稍候');
      return;
    }

    // 只有手动保存时才显示"保存中..."
    if (isManualSave) setSaving(true);
    try {
      const { title, content } = extractNoteData();
      console.log('提取的笔记数据:', { title, content });

      // 确保title和content至少有一个非空
      if (!title.trim() && !content.trim()) {
        if (isManualSave) toast.error('笔记内容不能为空');
        return;
      }

      if (currentNote || note) {
        // 更新现有笔记（包括新建后正在编辑的笔记）
        const targetNote = currentNote || note;
        console.log('更新现有笔记:', targetNote.id);
        const updatedNote = await updateNote(targetNote.id, title, content);
        console.log('笔记已更新:', updatedNote);
        if (isManualSave) toast.success('笔记已更新');
      } else {
        // 创建新笔记（仅第一次保存时）
        console.log('创建新笔记:', user.id);
        const newNote = await createNote(title, content);
        console.log('新笔记已创建:', newNote);
        if (isManualSave) toast.success('笔记已保存');
        // 保存新创建的笔记到状态中，后续自动保存将更新这个笔记
        setCurrentNote(newNote);
        // Clear local storage for new note
        localStorage.removeItem('new_note');
      }

      setLastSaved(new Date());
    } catch (error: any) {
      console.error('保存失败:', error);
      if (isManualSave) toast.error('保存失败: ' + (error.message || '未知错误'));
    } finally {
      // 只有手动保存时才重置"保存中..."状态
      if (isManualSave) setSaving(false);
    }
  };

  // 自动保存功能
  React.useEffect(() => {
    const autoSaveTimer = setTimeout(async () => {
      const inactivityTime = Date.now() - userActivityTime;
      if (inactivityTime >= 3000 && editor?.children) {
        await saveNote(false); // 自动保存不显示toast
      }
    }, 3000); // 在这里修改自动保存的时间间隔

    return () => clearTimeout(autoSaveTimer);
  }, [userActivityTime, editor?.children, saveNote]);

  // 根据sidebar状态调整按钮位置
  React.useEffect(() => {
    const updateButtonPosition = () => {
      const buttonContainer = document.querySelector('.button-container-bottom-left') as HTMLElement | null;
      if (buttonContainer) {
        if (document.body.classList.contains('sidebar-expanded')) {
          buttonContainer.style.left = '17rem'; // sidebar展开时的位置
        } else {
          buttonContainer.style.left = '2rem'; // sidebar关闭时的位置
        }
      }
    };

    // 初始化时设置位置
    updateButtonPosition();

    // 监听body类名变化
    const observer = new MutationObserver(updateButtonPosition);
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });

    return () => observer.disconnect();
  }, []);

  // Listen for user activity events to reset the timer
  React.useEffect(() => {
    const handleActivity = () => handleUserActivity();
    
    // Add event listeners for various user activities
    const editorElement = document.querySelector('.slate-editor');
    if (editorElement) {
      editorElement.addEventListener('keydown', handleActivity);
      editorElement.addEventListener('keyup', handleActivity);
      editorElement.addEventListener('click', handleActivity);
      editorElement.addEventListener('paste', handleActivity);
      editorElement.addEventListener('cut', handleActivity);
      editorElement.addEventListener('delete', handleActivity);
      editorElement.addEventListener('input', handleActivity);
    }

    return () => {
      if (editorElement) {
        editorElement.removeEventListener('keydown', handleActivity);
        editorElement.removeEventListener('keyup', handleActivity);
        editorElement.removeEventListener('click', handleActivity);
        editorElement.removeEventListener('paste', handleActivity);
        editorElement.removeEventListener('cut', handleActivity);
        editorElement.removeEventListener('delete', handleActivity);
        editorElement.removeEventListener('input', handleActivity);
      }
    };
  }, []);

  // 辅助函数：递归提取文本内容
  const getTextContent = (element: any): string => {
    if (!element) return '';
    
    // 如果是文本节点
    if (typeof element === 'object' && 'text' in element) {
      return element.text || '';
    }
    
    // 如果是包含children的元素
    if (typeof element === 'object' && 'children' in element && Array.isArray(element.children)) {
      return element.children.map(getTextContent).join('');
    }
    
    return '';
  };

  // Extract title and content from editor value
  const extractNoteData = (): { title: string; content: string } => {
    if (!editor) {
      console.error('editor is null/undefined');
      return { title: '', content: '' };
    }

    const value = editor.children as MyValue;
    console.log('编辑器内容:', value);
    
    let title = '无标题笔记';
    let content = '';

    // 确保有内容
    if (value.length === 0) {
      console.error('编辑器内容为空');
      return { title, content };
    }

    // 提取标题 - 使用第一个非空块的内容
    for (const block of value) {
      const blockText = getTextContent(block);
      if (blockText.trim()) {
        title = blockText.trim();
        break;
      }
    }

    // 提取内容 - 使用整个编辑器内容的JSON字符串
    // 这样可以保存完整的富文本格式
    content = JSON.stringify(value);

    console.log('提取的数据:', { title, content });
    return { title, content };
  };

  // Delete note function
  const handleDeleteNote = async () => {
    if (!note?.id) return;

    try {
      await deleteNotes([note.id]);
      toast.success('笔记已删除');
      // Navigate to dashboard
      window.location.href = '/dashboard';
    } catch (error: any) {
      console.error('删除笔记失败:', error);
      toast.error('删除失败: ' + (error.message || '未知错误'));
    } finally {
      setShowDeleteDialog(false);
    }
  };

  // Clear document function
  const handleClearDocument = () => {
    if (!editor) return;

    // Set editor to empty state with just a paragraph
    editor.children = normalizeNodeId([
      { type: 'h1', children: [{ text: '' }] }
    ]);

    // Clear local storage
    localStorage.removeItem(getLocalStorageKey());
    
    toast.success('文档已清空');
    setShowClearDialog(false);
  };

  return (
    <Plate editor={editor}>
      <EditorContainer className="relative w-full max-w-full m-0">
        <Editor 
          className="min-h-[500px] min-w-[70vw] w-full max-w-full mx-5 overflow-x-hidden overflow-y-auto whitespace-pre-wrap break-words rounded-b-lg bg-background text-sm"
        />
        
        {/* 最后保存时间 - 右上角（toolbar下方） */}
        {lastSaved && (
          <div className="absolute top-14 right-4 z-10 text-xs text-muted-foreground whitespace-nowrap">
            自动保存于: {lastSaved.toLocaleTimeString()}
          </div>
        )}
        
        {/* AI 工具栏 */}
        <div className="absolute top-14 left-4 z-10">
          <Button
            onClick={() => setShowAIToolbar(!showAIToolbar)}
            variant="outline"
            size="icon"
            className="h-8 w-8"
            aria-label="AI 助手"
          >
            <Sparkles className="h-4 w-4" />
          </Button>
        </div>
        
        {/* AI 工具栏面板 */}
        {showAIToolbar && (
          <div className="fixed top-24 left-4 z-100 bg-white border rounded-lg shadow-lg p-4 w-80">
            {/* 关闭按钮 */}
            <div className="flex justify-end mb-2">
              <Button
                onClick={() => setShowAIToolbar(false)}
                variant="ghost"
                size="icon"
                className="h-6 w-6"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <AIToolbar
              content={getCurrentTextContent()}
              onResult={handleAIResult}
            />
          </div>
        )}
        
        {/* 操作按钮区域 */}
        <div className="fixed bottom-8 right-8 flex items-center gap-2 z-10">
          {/* 保存按钮 */}
          <Button 
            onClick={() => saveNote(true)}
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
                <Button variant="destructive" onClick={handleClearDocument}>
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
                  <Button variant="destructive" onClick={handleDeleteNote}>
                    确认删除
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </EditorContainer>
    </Plate>
  );
}