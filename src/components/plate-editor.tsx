'use client';

import * as React from 'react';

import { normalizeNodeId } from 'platejs';
import { Plate, usePlateEditor } from 'platejs/react';

import { EditorKit } from '@/components/editor-kit';
import { Editor, EditorContainer } from '@/components/ui/editor';
import { Note } from '@/types/note';
import { useNotes } from '@/hooks/use-notes';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';
import type { MyValue, RichText } from '@/components/plate-types';
import { CollaborativeEditorProvider } from '@/components/collaborative-editor-provider';
import { EditorActions } from '@/components/editor-actions';

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

      if (note) {
        // Update existing note
        console.log('更新现有笔记:', note.id);
        const updatedNote = await updateNote(note.id, title, content);
        console.log('笔记已更新:', updatedNote);
        if (isManualSave) toast.success('笔记已更新');
      } else {
        // Create new note
        console.log('创建新笔记:', user.id);
        const newNote = await createNote(title, content);
        console.log('新笔记已创建:', newNote);
        if (isManualSave) toast.success('笔记已保存');
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
      {note ? (
        <CollaborativeEditorProvider note={note}>
          <EditorContainer className="relative w-full max-w-full m-0">
            <Editor 
              className="min-h-[500px] min-w-[70vw] w-full max-w-full mx-5 overflow-x-hidden overflow-y-auto whitespace-pre-wrap break-words rounded-b-lg bg-background text-sm"
            />
            <EditorActions
              note={note}
              saving={saving}
              lastSaved={lastSaved}
              showDeleteDialog={showDeleteDialog}
              showClearDialog={showClearDialog}
              setShowDeleteDialog={setShowDeleteDialog}
              setShowClearDialog={setShowClearDialog}
              onSave={() => saveNote(true)}
              onDelete={handleDeleteNote}
              onClear={handleClearDocument}
            />
          </EditorContainer>
        </CollaborativeEditorProvider>
      ) : (
        <EditorContainer className="relative w-full max-w-full m-0">
          <Editor 
            className="min-h-[500px] min-w-[70vw] w-full max-w-full mx-5 overflow-x-hidden overflow-y-auto whitespace-pre-wrap break-words rounded-b-lg bg-background text-sm"
          />
          <EditorActions
            note={note}
            saving={saving}
            lastSaved={lastSaved}
            showDeleteDialog={showDeleteDialog}
            showClearDialog={showClearDialog}
            setShowDeleteDialog={setShowDeleteDialog}
            setShowClearDialog={setShowClearDialog}
            onSave={() => saveNote(true)}
            onDelete={handleDeleteNote}
            onClear={handleClearDocument}
          />
        </EditorContainer>
      )}
    </Plate>
  );
}