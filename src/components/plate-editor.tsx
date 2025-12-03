'use client';

import * as React from 'react';

import { normalizeNodeId } from 'platejs';
import { Plate, usePlateEditor } from 'platejs/react';

import { EditorKit } from '@/components/editor-kit';
import { SettingsDialog } from '@/components/settings-dialog';
import { Editor, EditorContainer } from '@/components/ui/editor';
import { Button } from '@/components/ui/button';
import { Note } from '@/types/note';
import { useNotes } from '@/hooks/use-notes';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Save, Cloud } from 'lucide-react';
import type { MyValue, RichText } from '@/components/plate-types';

type Props = {
  note?: Note;
};

export function PlateEditor({ note }: Props) {
  const { user, loading: authLoading } = useAuth();
  const { createNote, updateNote, notes } = useNotes();
  const [saving, setSaving] = React.useState(false);
  const [lastSaved, setLastSaved] = React.useState<Date | null>(null);
  
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
    
    // For now, we'll use a simple conversion
    // In a real app, you'd need to parse the content into the correct format
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

  // Save note to Supabase
  const saveNote = async () => {
    if (!user) {
      console.error('用户未登录');
      toast.error('请先登录');
      return;
    }

    if (authLoading) {
      console.error('认证状态加载中');
      toast.error('认证状态加载中，请稍候');
      return;
    }

    setSaving(true);
    try {
      const { title, content } = extractNoteData();
      console.log('提取的笔记数据:', { title, content });

      // 确保title和content至少有一个非空
      if (!title.trim() && !content.trim()) {
        toast.error('笔记内容不能为空');
        return;
      }

      if (note) {
        // Update existing note
        console.log('更新现有笔记:', note.id);
        const updatedNote = await updateNote(note.id, title, content);
        console.log('笔记已更新:', updatedNote);
        toast.success('笔记已更新');
      } else {
        // Create new note
        console.log('创建新笔记:', user.id);
        const newNote = await createNote(title, content);
        console.log('新笔记已创建:', newNote);
        toast.success('笔记已保存');
        // Clear local storage for new note
        localStorage.removeItem('new_note');
      }

      setLastSaved(new Date());
    } catch (error: any) {
      console.error('保存失败:', error);
      toast.error('保存失败: ' + (error.message || '未知错误'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Plate editor={editor}>
      <EditorContainer className="relative w-full max-w-full m-0">
        <Editor 
          className="min-h-[500px] min-w-[70vw] w-full max-w-full mx-[20px] overflow-x-hidden overflow-y-auto whitespace-pre-wrap break-words rounded-b-lg bg-background text-sm"
        />
        
        {/* Save Button */}
        <div className="fixed bottom-8 right-8 flex gap-2">
          <Button 
            onClick={saveNote}
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
          {lastSaved && (
            <div className="text-xs text-muted-foreground self-center">
              最后保存: {lastSaved.toLocaleTimeString()}
            </div>
          )}
        </div>
      </EditorContainer>

      <SettingsDialog />
    </Plate>
  );
}

const value = normalizeNodeId([
  {
    children: [{ text: 'Welcome to the Plate Playground!' }],
    type: 'h1',
  },
  {
    children: [
      { text: 'Experience a modern rich-text editor built with ' },
      { children: [{ text: 'Slate' }], type: 'a', url: 'https://slatejs.org' },
      { text: ' and ' },
      { children: [{ text: 'React' }], type: 'a', url: 'https://reactjs.org' },
      {
        text: ". This playground showcases just a part of Plate's capabilities. ",
      },
      {
        children: [{ text: 'Explore the documentation' }],
        type: 'a',
        url: '/docs',
      },
      { text: ' to discover more.' },
    ],
    type: 'p',
  },
  // Suggestions & Comments Section
  {
    children: [{ text: 'Collaborative Editing' }],
    type: 'h2',
  },
  {
    children: [
      { text: 'Review and refine content seamlessly. Use ' },
      {
        children: [
          {
            suggestion: true,
            suggestion_playground1: {
              id: 'playground1',
              createdAt: Date.now(),
              type: 'insert',
              userId: 'alice',
            },
            text: 'suggestions',
          },
        ],
        type: 'a',
        url: '/docs/suggestion',
      },
      {
        suggestion: true,
        suggestion_playground1: {
          id: 'playground1',
          createdAt: Date.now(),
          type: 'insert',
          userId: 'alice',
        },
        text: ' ',
      },
      {
        suggestion: true,
        suggestion_playground1: {
          id: 'playground1',
          createdAt: Date.now(),
          type: 'insert',
          userId: 'alice',
        },
        text: 'like this added text',
      },
      { text: ' or to ' },
      {
        suggestion: true,
        suggestion_playground2: {
          id: 'playground2',
          createdAt: Date.now(),
          type: 'remove',
          userId: 'bob',
        },
        text: 'mark text for removal',
      },
      { text: '. Discuss changes using ' },
      {
        children: [
          { comment: true, comment_discussion1: true, text: 'comments' },
        ],
        type: 'a',
        url: '/docs/comment',
      },
      {
        comment: true,
        comment_discussion1: true,
        text: ' on many text segments',
      },
      { text: '. You can even have ' },
      {
        comment: true,
        comment_discussion2: true,
        suggestion: true,
        suggestion_playground3: {
          id: 'playground3',
          createdAt: Date.now(),
          type: 'insert',
          userId: 'charlie',
        },
        text: 'overlapping',
      },
      { text: ' annotations!' },
    ],
    type: 'p',
  },
  // {
  //   children: [
  //     {
  //       text: 'Block-level suggestions are also supported for broader feedback.',
  //     },
  //   ],
  //   suggestion: {
  //     suggestionId: 'suggestionBlock1',
  //     type: 'block',
  //     userId: 'charlie',
  //   },
  //   type: 'p',
  // },
  // AI Section
  {
    children: [{ text: 'AI-Powered Editing' }],
    type: 'h2',
  },
  {
    children: [
      { text: 'Boost your productivity with integrated ' },
      {
        children: [{ text: 'AI SDK' }],
        type: 'a',
        url: '/docs/ai',
      },
      { text: '. Press ' },
      { kbd: true, text: '⌘+J' },
      { text: ' or ' },
      { kbd: true, text: 'Space' },
      { text: ' in an empty line to:' },
    ],
    type: 'p',
  },
  {
    children: [
      { text: 'Generate content (continue writing, summarize, explain)' },
    ],
    indent: 1,
    listStyleType: 'disc',
    type: 'p',
  },
  {
    children: [
      { text: 'Edit existing text (improve, fix grammar, change tone)' },
    ],
    indent: 1,
    listStyleType: 'disc',
    type: 'p',
  },
  // Core Features Section (Combined)
  {
    children: [{ text: 'Rich Content Editing' }],
    type: 'h2',
  },
  {
    children: [
      { text: 'Structure your content with ' },
      {
        children: [{ text: 'headings' }],
        type: 'a',
        url: '/docs/heading',
      },
      { text: ', ' },
      {
        children: [{ text: 'lists' }],
        type: 'a',
        url: '/docs/list',
      },
      { text: ', and ' },
      {
        children: [{ text: 'quotes' }],
        type: 'a',
        url: '/docs/blockquote',
      },
      { text: '. Apply ' },
      {
        children: [{ text: 'marks' }],
        type: 'a',
        url: '/docs/basic-marks',
      },
      { text: ' like ' },
      { bold: true, text: 'bold' },
      { text: ', ' },
      { italic: true, text: 'italic' },
      { text: ', ' },
      { text: 'underline', underline: true },
      { text: ', ' },
      { strikethrough: true, text: 'strikethrough' },
      { text: ', and ' },
      { code: true, text: 'code' },
      { text: '. Use ' },
      {
        children: [{ text: 'autoformatting' }],
        type: 'a',
        url: '/docs/autoformat',
      },
      { text: ' for ' },
      {
        children: [{ text: 'Markdown' }],
        type: 'a',
        url: '/docs/markdown',
      },
      { text: '-like shortcuts (e.g., ' },
      { kbd: true, text: '* ' },
      { text: ' for lists, ' },
      { kbd: true, text: '# ' },
      { text: ' for H1).' },
    ],
    type: 'p',
  },
  {
    children: [
      {
        children: [
          {
            text: 'Blockquotes are great for highlighting important information.',
          },
        ],
        type: 'p',
      },
    ],
    type: 'blockquote',
  },
  {
    children: [
      { children: [{ text: 'function hello() {' }], type: 'code_line' },
      {
        children: [{ text: "  console.info('Code blocks are supported!');" }],
        type: 'code_line',
      },
      { children: [{ text: '}' }], type: 'code_line' },
    ],
    lang: 'javascript',
    type: 'code_block',
  },
  {
    children: [
      { text: 'Create ' },
      {
        children: [{ text: 'links' }],
        type: 'a',
        url: '/docs/link',
      },
      { text: ', ' },
      {
        children: [{ text: '@mention' }],
        type: 'a',
        url: '/docs/mention',
      },
      { text: ' users like ' },
      { children: [{ text: '' }], type: 'mention', value: 'Alice' },
      { text: ', or insert ' },
      {
        children: [{ text: 'emojis' }],
        type: 'a',
        url: '/docs/emoji',
      },
      { text: ' ✨. Use the ' },
      {
        children: [{ text: 'slash command' }],
        type: 'a',
        url: '/docs/slash-command',
      },
      { text: ' (/) for quick access to elements.' },
    ],
    type: 'p',
  },
  // Table Section
  {
    children: [{ text: 'How Plate Compares' }],
    type: 'h3',
  },
  {
    children: [
      {
        text: 'Plate offers many features out-of-the-box as free, open-source plugins.',
      },
    ],
    type: 'p',
  },
  {
    children: [
      {
        children: [
          {
            children: [
              { children: [{ bold: true, text: 'Feature' }], type: 'p' },
            ],
            type: 'th',
          },
          {
            children: [
              {
                children: [{ bold: true, text: 'Plate (Free & OSS)' }],
                type: 'p',
              },
            ],
            type: 'th',
          },
          {
            children: [
              { children: [{ bold: true, text: 'Tiptap' }], type: 'p' },
            ],
            type: 'th',
          },
        ],
        type: 'tr',
      },
      {
        children: [
          {
            children: [{ children: [{ text: 'AI' }], type: 'p' }],
            type: 'td',
          },
          {
            children: [
              {
                attributes: { align: 'center' },
                children: [{ text: '✅' }],
                type: 'p',
              },
            ],
            type: 'td',
          },
          {
            children: [{ children: [{ text: 'Paid Extension' }], type: 'p' }],
            type: 'td',
          },
        ],
        type: 'tr',
      },
      {
        children: [
          {
            children: [{ children: [{ text: 'Comments' }], type: 'p' }],
            type: 'td',
          },
          {
            children: [
              {
                attributes: { align: 'center' },
                children: [{ text: '✅' }],
                type: 'p',
              },
            ],
            type: 'td',
          },
          {
            children: [{ children: [{ text: 'Paid Extension' }], type: 'p' }],
            type: 'td',
          },
        ],
        type: 'tr',
      },
      {
        children: [
          {
            children: [{ children: [{ text: 'Suggestions' }], type: 'p' }],
            type: 'td',
          },
          {
            children: [
              {
                attributes: { align: 'center' },
                children: [{ text: '✅' }],
                type: 'p',
              },
            ],
            type: 'td',
          },
          {
            children: [
              { children: [{ text: 'Paid (Comments Pro)' }], type: 'p' },
            ],
            type: 'td',
          },
        ],
        type: 'tr',
      },
      {
        children: [
          {
            children: [{ children: [{ text: 'Emoji Picker' }], type: 'p' }],
            type: 'td',
          },
          {
            children: [
              {
                attributes: { align: 'center' },
                children: [{ text: '✅' }],
                type: 'p',
              },
            ],
            type: 'td',
          },
          {
            children: [{ children: [{ text: 'Paid Extension' }], type: 'p' }],
            type: 'td',
          },
        ],
        type: 'tr',
      },
      {
        children: [
          {
            children: [
              { children: [{ text: 'Table of Contents' }], type: 'p' },
            ],
            type: 'td',
          },
          {
            children: [
              {
                attributes: { align: 'center' },
                children: [{ text: '✅' }],
                type: 'p',
              },
            ],
            type: 'td',
          },
          {
            children: [{ children: [{ text: 'Paid Extension' }], type: 'p' }],
            type: 'td',
          },
        ],
        type: 'tr',
      },
      {
        children: [
          {
            children: [{ children: [{ text: 'Drag Handle' }], type: 'p' }],
            type: 'td',
          },
          {
            children: [
              {
                attributes: { align: 'center' },
                children: [{ text: '✅' }],
                type: 'p',
              },
            ],
            type: 'td',
          },
          {
            children: [{ children: [{ text: 'Paid Extension' }], type: 'p' }],
            type: 'td',
          },
        ],
        type: 'tr',
      },
      {
        children: [
          {
            children: [
              { children: [{ text: 'Collaboration (Yjs)' }], type: 'p' },
            ],
            type: 'td',
          },
          {
            children: [
              {
                attributes: { align: 'center' },
                children: [{ text: '✅' }],
                type: 'p',
              },
            ],
            type: 'td',
          },
          {
            children: [
              { children: [{ text: 'Hocuspocus (OSS/Paid)' }], type: 'p' },
            ],
            type: 'td',
          },
        ],
        type: 'tr',
      },
    ],
    type: 'table',
  },
  // Media Section
  {
    children: [{ text: 'Images and Media' }],
    type: 'h3',
  },
  {
    children: [
      {
        text: 'Embed rich media like images directly in your content. Supports ',
      },
      {
        children: [{ text: 'Media uploads' }],
        type: 'a',
        url: '/docs/media',
      },
      {
        text: ' and ',
      },
      {
        children: [{ text: 'drag & drop' }],
        type: 'a',
        url: '/docs/dnd',
      },
      {
        text: ' for a smooth experience.',
      },
    ],
    type: 'p',
  },
  {
    attributes: { align: 'center' },
    caption: [
      {
        children: [{ text: 'Images with captions provide context.' }],
        type: 'p',
      },
    ],
    children: [{ text: '' }],
    type: 'img',
    url: 'https://images.unsplash.com/photo-1712688930249-98e1963af7bd?q=80&w=600&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    width: '75%',
  },
  {
    children: [{ text: '' }],
    isUpload: true,
    name: 'sample.pdf',
    type: 'file',
    url: 'https://s26.q4cdn.com/900411403/files/doc_downloads/test.pdf',
  },
  {
    children: [{ text: '' }],
    type: 'audio',
    url: 'https://samplelib.com/lib/preview/mp3/sample-3s.mp3',
  },
  {
    children: [{ text: 'Table of Contents' }],
    type: 'h3',
  },
  {
    children: [{ text: '' }],
    type: 'toc',
  },
  {
    children: [{ text: '' }],
    type: 'p',
  },
]);
