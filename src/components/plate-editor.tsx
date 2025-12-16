'use client';

import * as React from 'react';

import { normalizeNodeId } from 'platejs';
import { Plate, usePlateEditor, useEditorSelector } from 'platejs/react';

import { EditorKit } from '@/components/editor-kit';
import { Editor, EditorContainer } from '@/components/ui/editor';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Note } from '@/types/note';
import { useNotes } from '@/hooks/use-notes';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';
import { Save, Cloud, Trash2, Eraser, Sparkles, X, Database } from 'lucide-react';
import type { MyValue, RichText } from '@/components/plate-types';

// Yjs imports
import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';

// AI imports
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
  const [isYjsReady, setIsYjsReady] = React.useState(false);
  const [isOffline, setIsOffline] = React.useState(!navigator.onLine);
  const [tagInput, setTagInput] = React.useState('');
  const [tags, setTags] = React.useState<string[]>([]);
  const [showAIToolbar, setShowAIToolbar] = React.useState(false);
  const [editorContent, setEditorContent] = React.useState<string>('');
  const contentRef = React.useRef<string>('');

  // References
  const yDocRef = React.useRef<Y.Doc | null>(null);
  const yPersistenceRef = React.useRef<IndexeddbPersistence | null>(null);
  
  // 检查用户状态和笔记列表
  React.useEffect(() => {
    console.log('用户状态:', user);
    console.log('认证加载中:', authLoading);
    console.log('笔记列表:', notes);
  }, [user, authLoading, notes]);

  // Get Yjs document key for this note
  const getYDocKey = () => {
    return note ? `note_${note.id}` : 'new_note';
  };

  // Initialize Yjs document and persistence
  React.useEffect(() => {
    if (!user) return;

    const yDocKey = getYDocKey();
    
    // Create Yjs document
    const yDoc = new Y.Doc();
    yDocRef.current = yDoc;
    
    // Get or create Yjs map for storing content - getMap automatically creates if not exists
    yDoc.getMap('content');
    
    // Initialize IndexeddbPersistence
    const persistence = new IndexeddbPersistence(yDocKey, yDoc);
    yPersistenceRef.current = persistence;
    
    // Handle document loaded
    persistence.on('synced', () => {
      console.log('Yjs document synced with IndexedDB');
      setIsYjsReady(true);
    });
    
    // Handle connection state
    const handleOnlineStatus = () => {
      setIsOffline(!navigator.onLine);
    };
    
    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOnlineStatus);
    
    // Cleanup
    return () => {
      persistence.destroy();
      yDoc.destroy();
      window.removeEventListener('online', handleOnlineStatus);
      window.removeEventListener('offline', handleOnlineStatus);
    };
  }, [user, note?.id]);

  // Convert note content to editor value
  const getEditorValue = () => {
    if (!note) {
      // Empty editor for new notes
      return normalizeNodeId([
        {
          children: [{ text: '新笔记' }],
          type: 'h1',
        },
        {
          children: [{ text: '' }],
          type: 'p',
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
    }
    
    return normalizeNodeId([
      {
        children: [{ text: note.title || '无标题' }],
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

  // 设置初始内容到状态
  React.useEffect(() => {
    if (editor) {
      // 设置初始内容到ref和state
      const initialValue = editor.children;
      const text = extractText(initialValue);
      contentRef.current = text;
      setEditorContent(text);
    }
  }, [editor]);

  // 检查用户认证状态
  React.useEffect(() => {
    console.log('用户状态:', user);
  }, [user]);

  // Handle user input to reset debounce timer
  const handleUserActivity = () => {
    setUserActivityTime(Date.now());
  };

  // Auto-save to local storage compatibility (keeping for backward compatibility)
  React.useEffect(() => {
    if (!editor) return;

    const saveToLocal = () => {
      const value = editor.children;
      const localStorageKey = getYDocKey();
      localStorage.setItem(localStorageKey, JSON.stringify(value));
      console.log('已保存到本地存储(兼容模式):', value);
    };

    // Save on every change with a small delay
    const debounceTimer = setTimeout(saveToLocal, 500);
    return () => clearTimeout(debounceTimer);
  }, [editor?.children]);

  // 添加标签
  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  // 删除标签
  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  // 处理标签输入框的按键事件
  const handleTagInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    }
  };

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
      console.log('提取的笔记数据:', { title, content, tags });

      // 确保title和content至少有一个非空
      if (!title.trim() && !content.trim()) {
        if (isManualSave) toast.error('笔记内容不能为空');
        return;
      }

      if (note) {
        // Update existing note
        console.log('更新现有笔记:', note.id);
        const updatedNote = await updateNote(note.id, title, content, tags);
        console.log('笔记已更新:', updatedNote);
        if (isManualSave) toast.success('笔记已更新');
        // Clear local storage for new note
        const localStorageKey = getYDocKey();
        localStorage.removeItem(localStorageKey);
      } else {
        // Create new note
        console.log('创建新笔记:', user.id);
        const newNote = await createNote(title, content, tags);
        console.log('新笔记已创建:', newNote);
        if (isManualSave) toast.success('笔记已保存');
        // Clear local storage for new note
        localStorage.removeItem('new_note');
      }

      setLastSaved(new Date());
    } catch (error: any) {
      console.error('保存失败:', error);
      if (isManualSave) {
        if (isOffline) {
          toast.info('您当前处于离线状态，笔记将在网络恢复后自动保存');
        } else {
          toast.error('保存失败: ' + (error.message || '未知错误'));
        }
      }
    } finally {
      // 只有手动保存时才重置"保存中..."状态
      if (isManualSave) setSaving(false);
    }
  };
  
  // Auto-sync when network comes back online
  React.useEffect(() => {
    const handleOnline = async () => {
      if (!isOffline && user && editor && lastSaved) {
        // Only auto-sync if there are unsaved changes
        const timeSinceLastSave = Date.now() - lastSaved.getTime();
        if (timeSinceLastSave > 1000) { // More than 1 second since last save
          console.log('网络已恢复，自动同步笔记');
          await saveNote(false);
          toast.success('网络已恢复，笔记已自动同步');
        }
      }
    };
    
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [isOffline, user, editor, lastSaved, saveNote]);

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
    console.log('处理元素:', JSON.stringify(element));
    
    if (!element) {
      console.log('元素为空，返回空字符串');
      return '';
    }
    
    // 如果是数组，递归处理每个元素
    if (Array.isArray(element)) {
      console.log('元素是数组，处理每个子元素');
      const result = element.map(getTextContent).join('');
      console.log('数组处理结果:', result);
      return result;
    }
    
    // 如果是文本节点
    if (typeof element === 'object' && 'text' in element) {
      const text = element.text || '';
      console.log('文本节点内容:', text);
      return text;
    }
    
    // 如果是包含children的元素
    if (typeof element === 'object' && 'children' in element && Array.isArray(element.children)) {
      console.log('包含children的元素，递归处理子元素');
      const result = element.children.map(getTextContent).join('');
      console.log('包含children的元素处理结果:', result);
      return result;
    }
    
    console.log('未知类型的元素，返回空字符串');
    return '';
  };

  // 辅助函数：从编辑器节点中提取文本
  const extractText = (nodes: any[]): string => {
    let text = '';
    
    const walk = (node: any) => {
      if (!node) return;
      
      if (node.text) {
        text += node.text;
      } else if (Array.isArray(node.children)) {
        for (const child of node.children) {
          walk(child);
        }
      }
    };
    
    for (const node of nodes) {
      walk(node);
    }
    
    return text;
  };
  
  // 获取当前编辑器文本内容的回调函数
  const getCurrentTextContent = React.useCallback((): string => {
    // 直接从编辑器获取内容
    if (editor && editor.children) {
      let text = '';
      
      // 递归遍历所有节点
      const walk = (nodes: any[]) => {
        for (const node of nodes) {
          if (node.text) {
            text += node.text;
          } else if (node.children) {
            walk(node.children);
          }
        }
      };
      
      walk(editor.children);
      return text;
    }
    
    // 如果编辑器不可用，返回空字符串
    return '';
  }, [editor]);

  // 处理AI结果
  const handleAIResult = (result: string, mode: 'summary' | 'completion' | 'search') => {
    if (mode === 'completion' && editor) {
      // 在当前位置插入AI续写内容
      const { selection } = editor;
      if (selection) {
        const { anchor } = selection;
        // 使用编辑器的transform API插入文本
        editor.tf.insertText(result, { at: anchor });
        toast.success('AI续写内容已插入');
      }
    } else {
      // 其他模式可以根据需要处理
      toast.info('AI结果已生成');
    }
  };

  // Extract title and content from editor value
  const extractNoteData = (): { title: string; content: string } => {
    if (!editor) {
      console.error('editor is null/undefined');
      return { title: '', content: '' };
    }

    // 优先从Yjs文档获取内容（如果可用）
    let value = editor.children as MyValue;
    if (yDocRef.current && isYjsReady) {
      const yDoc = yDocRef.current;
      const contentMap = yDoc.getMap('content');
      const yjsContent = contentMap.get('value');
      if (Array.isArray(yjsContent) && yjsContent.length > 0) {
        value = yjsContent as MyValue;
        console.log('从Yjs文档获取内容:', value);
      }
    }
    
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
    const emptyContent = normalizeNodeId([
      { type: 'h1', children: [{ text: '' }] }
    ]);
    
    editor.children = emptyContent;
    
    // Clear Yjs document
    if (yDocRef.current) {
      const yDoc = yDocRef.current;
      const contentMap = yDoc.getMap('content');
      contentMap.set('value', emptyContent);
    }
    
    // Clear local storage
    const localStorageKey = getYDocKey();
    localStorage.removeItem(localStorageKey);
    
    toast.success('文档已清空');
    setShowClearDialog(false);
  };

  return (
    <Plate editor={editor} onChange={handleUserActivity}>
      {/* 标签输入区域 */}
      <div className="border-b border-border px-8 py-3 sticky top-10 z-20 w-[80vw]">
        <div className="flex flex-wrap items-center gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded-full text-sm"
            >
              {tag}
              <button
                onClick={() => removeTag(tag)}
                className="hover:text-primary/70 focus:outline-none"
              >
                ✕
              </button>
            </span>
          ))}
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleTagInputKeyDown}
            placeholder="添加标签..."
            className="flex-1 max-w-xs px-2 py-1 border border-input rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
      </div>
      <EditorContainer className="relative w-full max-w-full m-0 mt-0">
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
          <div className="fixed top-24 left-4 z-100 bg-muted border rounded-lg shadow-lg p-4 w-80">
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
              getContent={getCurrentTextContent}
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
                {isOffline ? '离线保存' : '保存笔记'}
              </>
            )}
          </Button>
          
          {/* 离线状态指示器 */}
          {isOffline && (
            <div className="flex items-center gap-1 px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
              <Database className="h-3 w-3" />
              离线
            </div>
          )}
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