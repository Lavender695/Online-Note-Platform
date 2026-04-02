'use client';

import * as React from 'react';
import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';
import { withYjs, YjsEditor } from '@slate-yjs/core';
import { useRouter } from 'next/navigation';

import { normalizeNodeId } from 'platejs';
import { Plate, usePlateEditor } from 'platejs/react';

import { EditorKit } from '@/components/editor-kit';
import { Editor, EditorContainer } from '@/components/ui/editor';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Note } from '@/types/note';
import { useNotes } from '@/hooks/use-notes';
import { toast } from 'sonner';
import { Save, Cloud, Trash2, Eraser, Sparkles, X, Database, Upload, Download } from 'lucide-react';

// AI imports
import { AIToolbar } from '@/components/ai-toolbar';

type Props = {
  note?: Note;
  tempNoteId?: string;
};

export function PlateEditor({ note, tempNoteId }: Props) {
  const { deleteNotes, notes, getAllTags, createNote, updateNote, pushToCloud, pullNoteFromCloud } = useNotes();
  const router = useRouter();
  
  const [saving, setSaving] = React.useState(false);
  const [pushingCloud, setPushingCloud] = React.useState(false);
  const [pullingCloud, setPullingCloud] = React.useState(false);
  const [lastSaved, setLastSaved] = React.useState<Date | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
  const [showClearDialog, setShowClearDialog] = React.useState(false);
  
  // 原生离线状态检测
  const [isOffline, setIsOffline] = React.useState(typeof navigator !== 'undefined' ? !navigator.onLine : false);

  const [yDoc] = React.useState(() => new Y.Doc());
  
  const [tagInput, setTagInput] = React.useState('');
  const [tags, setTags] = React.useState<string[]>([]);
  const [showAIToolbar, setShowAIToolbar] = React.useState(false);
  const [showTagDropdown, setShowTagDropdown] = React.useState(false);
  const [allTags, setAllTags] = React.useState<string[]>([]);
  const [yjsReady, setYjsReady] = React.useState(false);
  const tagDropdownRef = React.useRef<HTMLDivElement>(null);
  const currentNote = React.useMemo(
    () => (note?.id ? notes.find((item) => item.id === note.id) ?? note : note),
    [note, notes]
  );

  // 获取所有可用标签
  React.useEffect(() => {
    setAllTags(getAllTags());
  }, [getAllTags, notes]);

  // 从 note 对象初始化标签
  React.useEffect(() => {
    const noteTags = currentNote?.tags;

    if (noteTags) {
      setTags(noteTags);
      return;
    }

    setTags([]);
  }, [currentNote?.id, currentNote?.tags]);

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

    // 如果没有 note（新建），返回默认值
    if (!note) {
      return normalizeNodeId([
        { children: [{ text: '新笔记' }], type: 'h1' },
        { children: [{ text: '' }], type: 'p' },
      ]);
    }
    
    // 如果有 note，解析 note 的内容
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

  const sharedType = React.useMemo(() => yDoc.get('content', Y.XmlText), [yDoc]);

  const editor = usePlateEditor({
    plugins: EditorKit,
    value: getEditorValue(),
    enabled: yjsReady,
    // Plate v51 typing and slate-yjs typing are not fully aligned; keep runtime binding.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    extendEditor: (({ editor }: any) => withYjs(editor as any, sharedType as any) as any) as any,
  }, [sharedType, note?.id, yjsReady]);

  React.useEffect(() => {
    setYjsReady(false);
    
    // Clean up yDoc content when note.id changes to avoid stale data
    // This ensures a fresh start for new notes or different notes
    if (yDoc) {
      const sharedContent = yDoc.get('content', Y.XmlText);
      if (sharedContent && sharedContent.length > 0) {
        // Use a transaction to batch the delete operation
        yDoc.transact(() => {
          sharedContent.delete(0, sharedContent.length);
        });
      }
    }
    
    // Use tempNoteId if available (for new note sessions), otherwise use note.id
    const noteKey = note?.id ? `note:${note.id}` : (tempNoteId ? `${tempNoteId}` : 'note:new');
    const persistence = new IndexeddbPersistence(noteKey, yDoc);

    const handleSynced = () => {
      setYjsReady(true);
      setLastSaved(new Date());
    };
    persistence.once('synced', handleSynced);

    return () => {
      persistence.off('synced', handleSynced);
      persistence.destroy();
    };
  }, [note?.id, tempNoteId, yDoc]);

  React.useEffect(() => {
    if (!editor || !yjsReady) return;

    // withYjs defaults to autoConnect=false, so we connect manually.
    if (YjsEditor.isYjsEditor(editor) && !YjsEditor.connected(editor)) {
      YjsEditor.connect(editor);
    }

    return () => {
      if (YjsEditor.isYjsEditor(editor) && YjsEditor.connected(editor)) {
        YjsEditor.disconnect(editor);
      }
    };
  }, [editor, yjsReady]);

  const handleUserActivity = () => {
    setLastSaved(new Date());
  };

  // 添加/删除标签
  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
      handleUserActivity();
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
    handleUserActivity();
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    }
  };

  // 辅助函数：递归提取文本内容
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getTextContent = React.useCallback((element: any): string => {
    if (!element) return '';
    if (Array.isArray(element)) return element.map(getTextContent).join('');
    if (typeof element === 'object' && 'text' in element) return String(element.text ?? '');
    if (typeof element === 'object' && 'children' in element && Array.isArray(element.children)) {
      return element.children.map(getTextContent).join('');
    }
    return '';
  }, []);

  // 获取当前编辑器文本内容的回调函数 (供AI使用)
  const getCurrentTextContent = React.useCallback((): string => {
    if (editor && editor.children) {
      return getTextContent(editor.children);
    }
    return '';
  }, [editor, getTextContent]);

  const persistLocalMetadata = React.useCallback(async (): Promise<Note | undefined> => {
    if (!editor) return undefined;

    if (YjsEditor.isYjsEditor(editor)) {
      YjsEditor.flushLocalChanges(editor);
    }

    const children = Array.isArray(editor.children) ? editor.children : [];
    const content = JSON.stringify(children);
    const firstBlockText = children
      .map((node) => getTextContent(node).trim())
      .find((text) => text.length > 0);
    const title = firstBlockText || currentNote?.title || '无标题笔记';

    if (currentNote?.id) {
      const updated = await updateNote(currentNote.id, title, content, tags);
      setLastSaved(new Date());
      return updated;
    }

    const created = await createNote(title, content, tags);
    // New note gets an ID immediately so dashboard can show it and cloud push can target it.
    router.replace(`/editor?id=${created.id}`);

    // Clear temporary data after creating note
    setTags([]);
    setTagInput('');

    setLastSaved(new Date());
    return created;
  }, [createNote, currentNote, editor, getTextContent, router, tags, updateNote]);

  const handleLocalSaveClick = () => {
    void (async () => {
      setSaving(true);
      try {
        await persistLocalMetadata();
        toast.success('已保存到本地 IndexedDB');
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : '未知错误';
        toast.error('本地保存失败: ' + message);
      } finally {
        setSaving(false);
      }
    })();
  };

  const handlePushToCloud = () => {
    void (async () => {
      if (!currentNote?.id) {
        toast.info('请先创建笔记后再同步到云端');
        return;
      }

      setPushingCloud(true);
      try {
        const persistedNote = await persistLocalMetadata();
        const noteIdToPush = persistedNote?.id ?? currentNote?.id;

        if (!noteIdToPush) {
          throw new Error('保存后仍未获得可同步的笔记 ID');
        }

        await pushToCloud(noteIdToPush);
        toast.success('已推送到云端');
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : '未知错误';
        toast.error('云端推送失败: ' + message);
      } finally {
        setPushingCloud(false);
      }
    })();
  };

  const handlePullFromCloud = () => {
    void (async () => {
      if (!currentNote?.id) {
        toast.info('请先创建笔记后再从云端拉取');
        return;
      }

      setPullingCloud(true);
      try {
        await pullNoteFromCloud(currentNote.id);
        toast.success('已从云端拉取当前笔记');
        window.location.reload();
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : '未知错误';
        toast.error('云端拉取失败: ' + message);
      } finally {
        setPullingCloud(false);
      }
    })();
  };

  const syncStateLabel = React.useMemo(() => {
    if (!currentNote) return '本地新建';
    if (currentNote.syncState === 'synced') return '云端已同步';
    return '待同步';
  }, [currentNote]);

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

      toast.success('笔记已删除');
      window.location.href = '/dashboard';
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '未知错误';
      toast.error('删除失败: ' + message);
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

  if (!editor) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-sm text-muted-foreground">
        正在加载本地笔记...
      </div>
    );
  }

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
              onClick={handleLocalSaveClick}
              disabled={saving}
              variant="default"
              size="sm"
              className="shrink-0 flex items-center gap-2 bg-primary hover:bg-primary/90 cursor-pointer"
            >
              {saving ? (
                <><Cloud className="h-3 w-3 animate-spin" />保存中...</>
              ) : (
                <><Save className="h-3 w-3" />保存到本地</>
              )}
            </Button>

            <Button
              onClick={handlePushToCloud}
              disabled={pushingCloud || !currentNote?.id}
              variant="secondary"
              size="sm"
              className="shrink-0 flex items-center gap-2 cursor-pointer"
            >
              {pushingCloud ? (
                <><Cloud className="h-3 w-3 animate-spin" />同步中...</>
              ) : (
                <><Upload className="h-3 w-3" />推送云端</>
              )}
            </Button>

            <Button
              onClick={handlePullFromCloud}
              disabled={pullingCloud}
              variant="outline"
              size="sm"
              className="shrink-0 flex items-center gap-2 cursor-pointer"
            >
              {pullingCloud ? (
                <><Cloud className="h-3 w-3 animate-spin" />拉取中...</>
              ) : (
                <><Download className="h-3 w-3" />拉取云端</>
              )}
            </Button>

            <span className="shrink-0 rounded-full border border-border bg-muted px-3 py-1 text-xs text-muted-foreground">
              {syncStateLabel}
            </span>
        </div>
      </div>

      <EditorContainer className="relative w-full max-w-full mt-10">
        <Editor className="min-h-[500px] min-w-[70vw] w-full max-w-full overflow-x-hidden overflow-y-auto whitespace-pre-wrap wrap-break-word rounded-b-lg bg-background text-sm" />
        
        {lastSaved && (
          <div className="fixed right-3 top-24 z-10 text-xs text-muted-foreground whitespace-nowrap pointer-events-none sm:right-4 md:top-24">
            本地保存于: {lastSaved.toLocaleTimeString()}
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
