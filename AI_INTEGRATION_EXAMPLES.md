# AI 功能集成示例

本文档展示如何在编辑器中集成 AI 工具栏组件。

## 示例 1：在 Plate Editor 中集成 AI 工具栏

```tsx
'use client';

import * as React from 'react';
import { Plate, usePlateEditor } from 'platejs/react';
import { EditorKit } from '@/components/editor-kit';
import { Editor, EditorContainer } from '@/components/ui/editor';
import { AIToolbar } from '@/components/ai-toolbar';
import { NodeApi } from 'platejs';

export function PlateEditorWithAI() {
  const editor = usePlateEditor({
    plugins: EditorKit,
    value: [
      {
        children: [{ text: '' }],
        type: 'p',
      },
    ],
  });

  // 提取编辑器内容为纯文本
  const getEditorText = React.useCallback(() => {
    if (!editor) return '';
    return editor.children
      .map((node: any) => NodeApi.string(node))
      .join('\n');
  }, [editor]);

  // 处理 AI 结果
  const handleAIResult = React.useCallback((result: string, mode: 'summary' | 'completion') => {
    if (!editor) return;

    if (mode === 'completion') {
      // 续写模式：在当前位置插入 AI 生成的内容
      editor.insertText(result);
    } else if (mode === 'summary') {
      // 摘要模式：在编辑器开头插入摘要（或显示在弹窗中）
      // 这里我们演示插入到编辑器顶部
      editor.insertNodes(
        [
          {
            type: 'callout',
            children: [
              {
                type: 'p',
                children: [{ text: `📋 内容摘要：${result}` }],
              },
            ],
          },
        ],
        { at: [0] }
      );
    }
  }, [editor]);

  return (
    <Plate editor={editor}>
      <EditorContainer>
        {/* AI 工具栏 */}
        <div className="mb-4 p-4 border rounded-lg bg-background">
          <AIToolbar
            content={getEditorText()}
            onResult={handleAIResult}
          />
        </div>

        {/* 编辑器 */}
        <Editor className="min-h-[500px]" />
      </EditorContainer>
    </Plate>
  );
}
```

## 示例 2：使用 useAI Hook

```tsx
'use client';

import * as React from 'react';
import { useAI } from '@/hooks/use-ai';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

export function AIFeatureDemo() {
  const { generateSummary, complete, search, isLoading, error } = useAI();
  const [content, setContent] = React.useState('');
  const [result, setResult] = React.useState('');

  const handleSummary = async () => {
    const summary = await generateSummary(content);
    if (summary) {
      setResult(summary);
    }
  };

  const handleCompletion = async () => {
    const continuation = await complete(content);
    if (continuation) {
      setResult(continuation);
    }
  };

  const handleSearch = async () => {
    const answer = await search('这段内容的主要观点是什么？', content);
    if (answer) {
      setResult(answer);
    }
  };

  return (
    <div className="space-y-4">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="输入内容..."
        className="w-full min-h-[200px] p-4 border rounded-lg"
      />

      <div className="flex gap-2">
        <Button onClick={handleSummary} disabled={isLoading}>
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : '生成摘要'}
        </Button>
        <Button onClick={handleCompletion} disabled={isLoading}>
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'AI 续写'}
        </Button>
        <Button onClick={handleSearch} disabled={isLoading}>
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : '智能问答'}
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 text-destructive rounded-lg">
          错误: {error}
        </div>
      )}

      {result && (
        <div className="p-4 bg-muted rounded-lg">
          <h3 className="font-semibold mb-2">AI 结果：</h3>
          <p className="whitespace-pre-wrap">{result}</p>
        </div>
      )}
    </div>
  );
}
```

## 示例 3：直接调用 API

```typescript
// 生成摘要
const summaryResponse = await fetch('/api/ai', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    mode: 'summary',
    content: '要总结的内容...',
  }),
});

const summaryData = await summaryResponse.json();
console.log(summaryData.result);

// 智能续写
const completionResponse = await fetch('/api/ai', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    mode: 'completion',
    content: '需要续写的内容...',
  }),
});

const completionData = await completionResponse.json();
console.log(completionData.result);

// 智能问答
const searchResponse = await fetch('/api/ai', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    mode: 'search',
    query: '问题内容',
    context: '可选的上下文信息',
  }),
});

const searchData = await searchResponse.json();
console.log(searchData.result);
```

## 环境配置

确保在 `.env.local` 文件中配置了以下环境变量：

```bash
VOLC_API_KEY=your-volcano-engine-api-key
VOLC_MODEL_ENDPOINT=your-volcano-engine-model-endpoint
```

## 注意事项

1. **API 密钥安全**：`VOLC_API_KEY` 是服务端环境变量，不会暴露给客户端
2. **错误处理**：始终处理可能的错误情况
3. **加载状态**：使用 `isLoading` 状态提供用户反馈
4. **内容验证**：确保传递给 AI 的内容不为空
5. **取消请求**：长时间运行的请求可以使用 `cancel()` 方法取消
