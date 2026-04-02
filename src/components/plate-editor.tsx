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
import { clearEditorDraft, readEditorDraft } from '@/lib/editor-draft';
import { EditorDraft } from '@/types/editor-draft';

// AI imports
import { AIToolbar } from '@/components/ai-toolbar';

type Props = {
  note?: Note;
};

export function PlateEditor({ note }: Props) {
  const { user, isLoaded } = useUser();
  const authLoading = !isLoaded;
  const { createNote, updateNote, deleteNotes, notes, getAllTags } = useNotes();
  
  const [saving, setSaving] = React.useState(false);
  const [lastSaved, setLastSaved] = React.useState<Date | null>(null);
  const [userActivityTime, setUserActivityTime] = React.useState(Date.now());
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
  const [showClearDialog, setShowClearDialog] = React.useState(false);
  const [activeNoteId, setActiveNoteId] = React.useState<string | null>(note?.id ?? null);
  
  // 原生离线状态检测
  const [isOffline, setIsOffline] = React.useState(typeof navigator !== 'undefined' ? !navigator.onLine : false);
  
  const [tagInput, setTagInput] = React.useState('');
  const [tags, setTags] = React.useState<string[]>([]);
  const [showAIToolbar, setShowAIToolbar] = React.useState(false);
  const [showTagDropdown, setShowTagDropdown] = React.useState(false);
  const [allTags, setAllTags] = React.useState<string[]>([]);
  const tagDropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setActiveNoteId(note?.id ?? null);
  }, [note?.id]);

  // 获取所有可用标签
  React.useEffect(() => {
    setAllTags(getAllTags());
  }, [getAllTags, notes]);

  // 从 note 对象初始化标签
  React.useEffect(() => {
    const noteTags = note?.tags;
    const draft = readEditorDraft();
    const targetNoteId = note?.id ?? null;
    const isMatchedDraft =
      !!draft &&
      draft.userId === (user?.id ?? null) &&
      draft.noteId === targetNoteId;

    if (isMatchedDraft && Array.isArray(draft.tags)) {
      setTags(draft.tags);
      return;
    }

    if (noteTags) {
      setTags(noteTags);
      return;
    }

    setTags([]);
  }, [note?.id, note?.tags, user?.id]);

  // 监听线/离线状态
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

  React.useEffect(() => {
    const legacyKeys: string[] = [];

    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key) continue;

      if (key === 'new_note_draft' || key.startsWith('note_draft_')) {
        legacyKeys.push(key);
      }
    }

    legacyKeys.forEach((key) => localStorage.removeItem(key));
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
    const safeTitle = typeof note?.title === 'string' && note.title.trim() ? note.title : '无标题';
    const safeContent = typeof note?.content === 'string' ? note.content : '';

    // 1. 先尝试从 LocalStorage 恢复单草稿
    const draft: EditorDraft | null = readEditorDraft();
    const targetNoteId = note?.id ?? null;
    const isMatchedDraft =
      !!draft &&
      draft.userId === (user?.id ?? null) &&
      draft.noteId === targetNoteId &&
      Array.isArray(draft.content);

    if (isMatchedDraft && draft.content.length > 0) {
      return normalizeNodeId(draft.content);
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
      const parsedContent = JSON.parse(safeContent);
      if (Array.isArray(parsedContent)) {
        return normalizeNodeId(parsedContent);
      }
    } catch {
      // 纯文本兼容
    }
    
    return normalizeNodeId([
      { children: [{ text: safeTitle }], type: 'h1' },
      { children: [{ text: safeContent }], type: 'p' },
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

      if (activeNoteId) {
        await updateNote(activeNoteId, title, content, tags);
        if (isManualSave) toast.success('笔记已更新');
      } else {
        const createdNote = await createNote(title, content, tags);
        setActiveNoteId(createdNote.id);
        if (isManualSave) toast.success('笔记已保存');
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

  // 监���用户活跃度
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

      const draft = readEditorDraft();
      if (draft?.noteId === note.id && draft.userId === (user?.id ?? null)) {
        clearEditorDraft();
      }

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
    
    toast.success('文档已清空');
    setShowClearDialog(false);
  };

  return (
    <Plate editor={editor} onChange={handleUserActivity}>
      {/* 标签输入区域 */}
      <div className="fixed left-0 right-0 top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80 md:left-(--sidebar-width)">
        <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap px-3 py-2 sm:px-6 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {/* 标签输入和下拉菜单 */}
            <div className="relative shrink-0" ref={tagDropdownRef}>
              <button
                onClick={() => setShowTagDropdown(!showTagDropdown)}
                className="flex items-center gap-1 px-3 py-1 border border-input rounded-full text-sm hover:bg-background/80 focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
              >
                {tagInput ? tagInput : '标签'}
                <span className={`transform transition-transform ${showTagDropdown ? 'rotate-180' : ''}`}>
                  ▼
                </span>
              </button>
              
              {showTagDropdown && (
                <div className="absolute left-0 z-50 mt-1 w-64 max-w-[calc(100vw-1.5rem)] bg-background border border-input rounded-md shadow-lg overflow-hidden">
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
                            <button onClick={() => removeTag(tag)} className="hover:text-primary/70 focus:outline-none cursor-pointer">✕</button>
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
                          className={`w-full px-3 py-2 text-left text-sm hover:bg-primary/10 transition-colors cursor-pointer ${tags.includes(availableTag) ? 'text-muted-foreground' : 'text-foreground'}`}
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
                        className="w-full px-3 py-2 bg-primary/10 text-primary text-sm rounded hover:bg-primary/20 transition-colors cursor-pointer"
                      >
                        创建新标签: {tagInput.trim()}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* AI 按钮移到顶部 */}
            <Button 
              onClick={() => setShowAIToolbar(!showAIToolbar)} 
              variant={showAIToolbar ? "default" : "secondary"} 
              size="sm" 
              className="shrink-0 flex items-center gap-2 cursor-pointer"
              aria-label="AI 助手"
            >
              <Sparkles className="h-3 w-3" />
              <span className="hidden sm:inline">AI 助手</span>
            </Button>

            <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
              <DialogTrigger asChild>
                <Button variant="secondary" size="sm" className="shrink-0 flex items-center gap-2 cursor-pointer">
                  <Eraser className="h-3 w-3" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>确认清空</DialogTitle>
                  <DialogDescription>您确定要清空当前文档吗？此操作无法撤销，但笔记本身不会被删除。</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setShowClearDialog(false)} className="cursor-pointer">取消</Button>
                  <Button variant="destructive" onClick={handleClearDocument} className="cursor-pointer">确认清空</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {note && (
              <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="shrink-0 flex items-center gap-2 cursor-pointer">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>确认删除</DialogTitle>
                    <DialogDescription>您确定要删除这篇笔记吗？此操作无法撤销。</DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="ghost" onClick={() => setShowDeleteDialog(false)} className="cursor-pointer">取消</Button>
                    <Button variant="destructive" onClick={handleDeleteNote} className="cursor-pointer">确认删除</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}

            <Button 
              onClick={() => saveNote(true)}
              disabled={saving}
              variant="default"
              size="sm"
              className="shrink-0 flex items-center gap-2 bg-primary hover:bg-primary/90 cursor-pointer"
            >
              {saving ? (
                <><Cloud className="h-3 w-3 animate-spin" />保存中...</>
              ) : (
                <><Save className="h-3 w-3" />{isOffline ? '存为草稿' : '保存笔记'}</>
              )}
            </Button>
        </div>
      </div>

      <EditorContainer className="relative w-full max-w-full mt-10">
        <Editor className="min-h-[500px] min-w-[70vw] w-full max-w-full overflow-x-hidden overflow-y-auto whitespace-pre-wrap wrap-break-word rounded-b-lg bg-background text-sm" />
        
        {lastSaved && (
          <div className="fixed right-3 top-24 z-10 text-xs text-muted-foreground whitespace-nowrap pointer-events-none sm:right-4 md:top-24">
            自动保存于: {lastSaved.toLocaleTimeString()}
          </div>
        )}
        
        {/* AI 面板弹出位置调整，放在右上角贴近工具栏 */}
        {showAIToolbar && (
          <div className="fixed left-2 right-2 top-20 z-100 w-auto rounded-lg border bg-background/95 p-4 shadow-xl backdrop-blur-sm sm:left-auto sm:right-4 sm:top-16 sm:w-80">
            <div className="flex justify-end mb-2">
              <Button onClick={() => setShowAIToolbar(false)} variant="ghost" size="icon" className="h-6 w-6 cursor-pointer">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <AIToolbar getContent={getCurrentTextContent} onResult={handleAIResult} />
          </div>
        )}
        
        {/* 底部只保留离线状态提示 */}
        {isOffline && (
          <div className="fixed bottom-4 right-4 z-10 flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full shadow-sm border border-yellow-200">
            <Database className="h-3 w-3" /> 离线模式
          </div>
        )}
      </EditorContainer>
    </Plate>
  );
}
