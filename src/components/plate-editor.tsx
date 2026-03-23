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
import { useUser } from '@clerk/nextjs';
import { toast } from 'sonner';
import { Save, Cloud, Trash2, Eraser, Sparkles, X, Database } from 'lucide-react';
import type { MyValue } from '@/components/plate-types';
import { useSidebar } from '@/components/ui/sidebar';

// AI imports
import { AIToolbar } from '@/components/ai-toolbar';

type Props = {
  note?: Note;
};

export function PlateEditor({ note }: Props) {
  const { user, isLoaded } = useUser();
  const authLoading = !isLoaded;
  const { createNote, updateNote, deleteNotes, notes, getAllTags } = useNotes();
  const { state } = useSidebar();
  
  const [saving, setSaving] = React.useState(false);
  const [lastSaved, setLastSaved] = React.useState<Date | null>(null);
  const [userActivityTime, setUserActivityTime] = React.useState(Date.now());
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
  const [showClearDialog, setShowClearDialog] = React.useState(false);
  
  // 原生离线状态检测
  const [isOffline, setIsOffline] = React.useState(typeof navigator !== 'undefined' ? !navigator.onLine : false);
  
  const [tagInput, setTagInput] = React.useState('');
  const [tags, setTags] = React.useState<string[]>([]);
  const [showAIToolbar, setShowAIToolbar] = React.useState(false);
  const [showTagDropdown, setShowTagDropdown] = React.useState(false);
  const [allTags, setAllTags] = React.useState<string[]>([]);
  const tagDropdownRef = React.useRef<HTMLDivElement>(null);

  // 获取 Storage Key
  const getLocalStorageKey = React.useCallback(() => {
    return note ? `note_draft_${note.id}` : 'new_note_draft';
  }, [note]);

  // 获取所有可用标签
  React.useEffect(() => {
    setAllTags(getAllTags());
  }, [getAllTags, notes]);

  // 从 note 对象初始化标签
  React.useEffect(() => {
    if (note && note.tags) {
      setTags(note.tags);
    } else {
      setTags([]);
    }
  }, [note]);

  // 监听��线/离线状态
  React.useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // 点击外部关闭标签下拉菜单
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tagDropdownRef.current && !tagDropdownRef.current.contains(event.target as Node)) {
        setShowTagDropdown(false);
      }
    };
    if (showTagDropdown) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showTagDropdown]);

  // 将内容转为 Editor Value
  const getEditorValue = () => {
    // 1. 先尝试从 LocalStorage 恢复草稿
    if (typeof window !== 'undefined') {
      const draft = localStorage.getItem(getLocalStorageKey());
      if (draft) {
        try {
          const parsed = JSON.parse(draft);
          if (Array.isArray(parsed) && parsed.length > 0) {
            console.log('已从本地缓存恢复草稿');
            return normalizeNodeId(parsed);
          }
        } catch (e) {
          console.error('Failed to parse local draft', e);
        }
      }
    }

    // 2. 如果没有草稿，且没有 note（新建），返回默认值
    if (!note) {
      return normalizeNodeId([
        { children: [{ text: '新笔记' }], type: 'h1' },
        { children: [{ text: '' }], type: 'p' },
      ]);
    }
    
    // 3. 如果有 note，解析 note 的内容
    try {
      const parsedContent = JSON.parse(note.content);
      if (Array.isArray(parsedContent)) {
        return normalizeNodeId(parsedContent);
      }
    } catch (e) {
      // 纯文本兼容
    }
    
    return normalizeNodeId([
      { children: [{ text: note.title || '无标题' }], type: 'h1' },
      { children: [{ text: note.content }], type: 'p' },
    ]);
  };

  const editor = usePlateEditor({
    plugins: EditorKit,
    value: getEditorValue(),
  });

  // Handle user input to reset debounce timer
  const handleUserActivity = () => {
    setUserActivityTime(Date.now());
  };

  // 原生自动保存到 LocalStorage
  React.useEffect(() => {
    if (!editor || !editor.children) return;

    const saveToLocal = () => {
      const value = editor.children;
      localStorage.setItem(getLocalStorageKey(), JSON.stringify(value));
    };

    const debounceTimer = setTimeout(saveToLocal, 500);
    return () => clearTimeout(debounceTimer);
  }, [editor?.children, getLocalStorageKey]);

  // 添加/删除标签
  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
      handleUserActivity();
      saveNote(false);
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
    handleUserActivity();
    saveNote(false);
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    }
  };

  // 辅助函数：递归提取文本内容
  const getTextContent = (element: any): string => {
    if (!element) return '';
    if (Array.isArray(element)) return element.map(getTextContent).join('');
    if (typeof element === 'object' && 'text' in element) return element.text || '';
    if (typeof element === 'object' && 'children' in element && Array.isArray(element.children)) {
      return element.children.map(getTextContent).join('');
    }
    return '';
  };

  // 获取当前编辑器文本内容的回调函数 (供AI使用)
  const getCurrentTextContent = React.useCallback((): string => {
    if (editor && editor.children) {
      return getTextContent(editor.children);
    }
    return '';
  }, [editor]);

  // 提取标题和内容
  const extractNoteData = (): { title: string; content: string } => {
    if (!editor || !editor.children) return { title: '', content: '' };
    
    const value = editor.children as MyValue;
    let title = '无标题笔记';
    
    if (value.length > 0) {
      for (const block of value) {
        const blockText = getTextContent(block);
        if (blockText.trim()) {
          title = blockText.trim();
          break;
        }
      }
    }

    const content = JSON.stringify(value);
    return { title, content };
  };

  // 核心保存逻辑
  const saveNote = async (isManualSave = false) => {
    if (!user) {
      if (isManualSave) toast.error('请先登录');
      return;
    }

    if (authLoading) {
      if (isManualSave) toast.error('认证状态加载中，请稍候');
      return;
    }

    if (isManualSave) setSaving(true);
    
    try {
      const { title, content } = extractNoteData();

      if (!title.trim() && !content.trim()) {
        if (isManualSave) toast.error('笔记内容不能为空');
        return;
      }

      if (note) {
        await updateNote(note.id, title, content, tags);
        if (isManualSave) toast.success('笔记已更新');
      } else {
        await createNote(title, content, tags);
        if (isManualSave) toast.success('笔记已保存');
        // 保存后清理本地“新建草稿”缓存
        localStorage.removeItem('new_note_draft');
      }

      setLastSaved(new Date());
    } catch (error: any) {
      console.error('保存失败:', error);
      if (isManualSave) {
        if (isOffline) {
          toast.info('当前处于离线状态，已保存至本地草稿');
        } else {
          toast.error('保存失败: ' + (error.message || '未知错误'));
        }
      }
    } finally {
      if (isManualSave) setSaving(false);
    }
  };
  
  // 网络恢复时自动同步
  React.useEffect(() => {
    const handleOnlineSync = async () => {
      if (!isOffline && user && editor && lastSaved) {
        const timeSinceLastSave = Date.now() - lastSaved.getTime();
        if (timeSinceLastSave > 1000) {
          await saveNote(false);
          toast.success('网络已恢复，草稿已自动同步');
        }
      }
    };
    
    window.addEventListener('online', handleOnlineSync);
    return () => window.removeEventListener('online', handleOnlineSync);
  }, [isOffline, user, editor, lastSaved]);

  // 定时自动保存
  React.useEffect(() => {
    const autoSaveTimer = setTimeout(async () => {
      const inactivityTime = Date.now() - userActivityTime;
      if (inactivityTime >= 3000 && (editor?.children || tags.length > 0)) {
        await saveNote(false);
      }
    }, 3000);

    return () => clearTimeout(autoSaveTimer);
  }, [userActivityTime, editor?.children, tags]);

  // 根据sidebar状态调整按钮位置
  React.useEffect(() => {
    const updateButtonPosition = () => {
      const buttonContainer = document.querySelector('.button-container-bottom-left') as HTMLElement | null;
      if (buttonContainer) {
        if (document.body.classList.contains('sidebar-expanded')) {
          buttonContainer.style.left = '17rem';
        } else {
          buttonContainer.style.left = '2rem';
        }
      }
    };

    updateButtonPosition();
    const observer = new MutationObserver(updateButtonPosition);
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // 监听用户活跃度
  React.useEffect(() => {
    const handleActivity = () => handleUserActivity();
    const editorElement = document.querySelector('.slate-editor');
    
    if (editorElement) {
      const events = ['keydown', 'keyup', 'click', 'paste', 'cut', 'delete', 'input'];
      events.forEach(e => editorElement.addEventListener(e, handleActivity));
      return () => events.forEach(e => editorElement.removeEventListener(e, handleActivity));
    }
  }, []);

  // 处理AI结果
  const handleAIResult = (result: string, mode: 'summary' | 'completion' | 'search') => {
    if (mode === 'completion' && editor) {
      const { selection } = editor;
      if (selection) {
        const { anchor } = selection;
        editor.tf.insertText(result, { at: anchor });
      }
    } else {
      toast.info('AI结果已生成');
    }
  };

  // Delete note function
  const handleDeleteNote = async () => {
    if (!note?.id) return;
    try {
      await deleteNotes([note.id]);
      localStorage.removeItem(getLocalStorageKey()); // 删掉本地草稿
      toast.success('笔记已删除');
      window.location.href = '/dashboard';
    } catch (error: any) {
      toast.error('删除失败: ' + (error.message || '未知错误'));
    } finally {
      setShowDeleteDialog(false);
    }
  };

  // Clear document function
  const handleClearDocument = () => {
    if (!editor) return;
    const emptyContent = normalizeNodeId([{ type: 'h1', children: [{ text: '' }] }]);
    editor.children = emptyContent;
    localStorage.setItem(getLocalStorageKey(), JSON.stringify(emptyContent));
    
    toast.success('文档已清空');
    setShowClearDialog(false);
  };

  return (
    <Plate editor={editor} onChange={handleUserActivity}>
      {/* 标签输入区域 */}
      <div className={`border-b border-border px-8 py-3 z-50 bg-background sticky top-0 w-screen`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {/* 标签输入和下拉菜单 */}
            <div className="relative" ref={tagDropdownRef}>
              <button
                onClick={() => setShowTagDropdown(!showTagDropdown)}
                className="flex items-center gap-1 px-3 py-1 border border-input rounded-full text-sm hover:bg-background/80 focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                {tagInput ? tagInput : '标签'}
                <span className={`transform transition-transform ${showTagDropdown ? 'rotate-180' : ''}`}>
                  ▼
                </span>
              </button>
              
              {showTagDropdown && (
                <div className="absolute z-50 mt-1 w-64 bg-background border border-input rounded-md shadow-lg overflow-hidden">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagInputKeyDown}
                    placeholder="搜索或创建标签..."
                    className="w-full px-3 py-2 border-b border-input text-sm focus:outline-none"
                  />
                  
                  {tags.length > 0 && (
                    <div className="px-3 py-2 border-b border-input">
                      <div className="text-xs text-muted-foreground mb-1">已添加标签</div>
                      <div className="flex flex-wrap gap-1">
                        {tags.map((tag) => (
                          <span
                            key={tag}
                            className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs"
                          >
                            {tag}
                            <button onClick={() => removeTag(tag)} className="hover:text-primary/70 focus:outline-none">✕</button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="max-h-40 overflow-y-auto">
                    {allTags.length > 0 ? (
                      allTags.map((availableTag) => (
                        <button
                          key={availableTag}
                          onClick={() => {
                              if (!tags.includes(availableTag)) {
                                setTags([...tags, availableTag]);
                                handleUserActivity();
                                saveNote(false);
                              }
                              setTagInput('');
                              setShowTagDropdown(false);
                            }}
                          className={`w-full px-3 py-2 text-left text-sm hover:bg-primary/10 transition-colors ${tags.includes(availableTag) ? 'text-muted-foreground' : 'text-foreground'}`}
                          disabled={tags.includes(availableTag)}
                        >
                          <span className="flex items-center justify-between">
                            <span>{availableTag}</span>
                            {tags.includes(availableTag) && <span className="text-primary">已添加</span>}
                          </span>
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-4 text-center text-sm text-muted-foreground">暂无标签，您可以创建新标签</div>
                    )}
                  </div>
                  
                  {tagInput.trim() && !allTags.includes(tagInput.trim()) && (
                    <div className="border-t border-input p-2">
                      <button
                        onClick={() => {
                          addTag();
                          setShowTagDropdown(false);
                        }}
                        className="w-full px-3 py-2 bg-primary/10 text-primary text-sm rounded hover:bg-primary/20 transition-colors"
                      >
                        创建新标签: {tagInput.trim()}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex gap-2 fixed right-5">
            <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
              <DialogTrigger asChild>
                <Button variant="secondary" size="sm" className="flex items-center gap-2 cursor-pointer">
                  <Eraser className="h-3 w-3" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>确认清空</DialogTitle>
                  <DialogDescription>您确定要清空当前文档吗？此操作无法撤销，但笔记本身不会被删除。</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setShowClearDialog(false)}>取消</Button>
                  <Button variant="destructive" onClick={handleClearDocument}>确认清空</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {note && (
              <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="flex items-center gap-2 cursor-pointer">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>确认删除</DialogTitle>
                    <DialogDescription>您确定要删除这篇笔记吗？此操作无法撤销。</DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="ghost" onClick={() => setShowDeleteDialog(false)}>取消</Button>
                    <Button variant="destructive" onClick={handleDeleteNote}>确认删除</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}

            <Button 
              onClick={() => saveNote(true)}
              disabled={saving}
              variant="default"
              size="sm"
              className="flex items-center gap-2 bg-primary hover:bg-primary/90 cursor-pointer"
            >
              {saving ? (
                <><Cloud className="h-3 w-3 animate-spin" />保存中...</>
              ) : (
                <><Save className="h-3 w-3" />{isOffline ? '存为草稿' : '保存笔记'}</>
              )}
            </Button>
          </div>
        </div>
      </div>

      <EditorContainer className="relative w-full max-w-full m-0">
        <Editor className="min-h-[500px] min-w-[70vw] w-full max-w-full mx-5 overflow-x-hidden overflow-y-auto whitespace-pre-wrap wrap-break-word rounded-b-lg bg-background text-sm" />
        
        {lastSaved && (
          <div className="fixed top-40 right-4 z-10 text-xs text-muted-foreground whitespace-nowrap">
            自动保存于: {lastSaved.toLocaleTimeString()}
          </div>
        )}
        
        {showAIToolbar && (
          <div className="fixed bottom-20 right-4 z-100 bg-muted border rounded-lg shadow-lg p-4 w-80">
            <div className="flex justify-end mb-2">
              <Button onClick={() => setShowAIToolbar(false)} variant="ghost" size="icon" className="h-6 w-6">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <AIToolbar getContent={getCurrentTextContent} onResult={handleAIResult} />
          </div>
        )}
        
        <div className="fixed bottom-8 right-8 flex items-center gap-2 z-10">
          <Button onClick={() => setShowAIToolbar(!showAIToolbar)} variant="outline" size="icon" className="h-8 w-8" aria-label="AI 助手">
            <Sparkles className="h-4 w-4" />
          </Button>
          
          {isOffline && (
            <div className="flex items-center gap-1 px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
              <Database className="h-3 w-3" /> 离线模式
            </div>
          )}
        </div>
      </EditorContainer>
    </Plate>
  );
}