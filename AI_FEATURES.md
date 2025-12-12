# AI Features Documentation

## 概述 (Overview)

本项目集成了基于火山引擎（Volcano Engine/Doubao）的 AI 功能支持，提供智能续写、内容摘要和智能问答等功能。

This project integrates AI features powered by Volcano Engine (Doubao), providing intelligent completion, content summarization, and smart Q&A capabilities.

## 功能特性 (Features)

### 1. AI 续写 (AI Completion)
- 根据当前内容智能生成后续文本
- 保持写作风格和上下文连贯性

### 2. 生成摘要 (Generate Summary)
- 自动提取内容要点
- 生成简洁的内容摘要

### 3. 智能问答 (Smart Q&A)
- 基于上下文的问答功能
- 支持知识检索

## 配置说明 (Configuration)

### 环境变量设置

在项目根目录创建 `.env.local` 文件，添加以下配置：

```bash
# 火山引擎 API 密钥
VOLC_API_KEY=your_volcano_engine_api_key_here

# 火山引擎推理接入点 ID
VOLC_MODEL_ENDPOINT=your_model_endpoint_id_here
```

### 获取 API 密钥和接入点

1. 访问 [火山引擎控制台](https://console.volcengine.com/)
2. 开通豆包大模型服务
3. 创建 API 密钥
4. 创建推理接入点并获取接入点 ID

## 使用方法 (Usage)

### 1. 在组件中使用 AI Toolbar

```tsx
import { AIToolbar } from '@/components/ai-toolbar';
import { useState } from 'react';

function MyEditor() {
  const [content, setContent] = useState('');
  const [summary, setSummary] = useState('');

  return (
    <div>
      <AIToolbar
        content={content}
        onContentGenerated={(newContent) => {
          // 将生成的内容追加到编辑器
          setContent(content + '\n\n' + newContent);
        }}
        onSummaryGenerated={(summary) => {
          // 显示生成的摘要
          setSummary(summary);
        }}
      />
      
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="输入内容..."
      />
      
      {summary && (
        <div className="mt-4">
          <h3>摘要：</h3>
          <p>{summary}</p>
        </div>
      )}
    </div>
  );
}
```

### 2. 直接使用 useAI Hook

```tsx
import { useAI } from '@/hooks/use-ai';

function MyComponent() {
  const { callAI, isLoading, error } = useAI();

  const handleSummary = async () => {
    try {
      const result = await callAI({
        mode: 'summary',
        content: '你的内容...',
      });
      console.log('Summary:', result);
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const handleCompletion = async () => {
    try {
      const result = await callAI({
        mode: 'completion',
        content: '你的内容...',
      });
      console.log('Completion:', result);
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const handleSearch = async () => {
    try {
      const result = await callAI({
        mode: 'search',
        content: '你的问题...',
        context: '可选的上下文信息...',
      });
      console.log('Answer:', result);
    } catch (err) {
      console.error('Error:', err);
    }
  };

  return (
    <div>
      <button onClick={handleSummary} disabled={isLoading}>
        生成摘要
      </button>
      <button onClick={handleCompletion} disabled={isLoading}>
        AI 续写
      </button>
      <button onClick={handleSearch} disabled={isLoading}>
        智能问答
      </button>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
```

### 3. 直接调用 API

```typescript
// POST /api/ai
const response = await fetch('/api/ai', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    mode: 'summary', // 'summary' | 'completion' | 'search'
    content: '你的内容...',
    context: '可选的上下文（仅用于 search 模式）',
  }),
});

const data = await response.json();
console.log('Result:', data.result);
console.log('Usage:', data.usage);
```

## API 接口 (API Reference)

### POST /api/ai

#### 请求参数 (Request Body)

```typescript
{
  mode: 'summary' | 'completion' | 'search',  // AI 模式
  content: string,                             // 内容文本
  context?: string                             // 上下文（可选，仅用于 search 模式）
}
```

#### 响应格式 (Response)

```typescript
{
  result: string,                    // AI 生成的结果
  usage?: {                          // 使用统计（可选）
    input_tokens: number,            // 输入 token 数
    output_tokens: number,           // 输出 token 数
    total_tokens: number             // 总 token 数
  }
}
```

#### 错误响应 (Error Response)

```typescript
{
  error: string,        // 错误描述
  details?: any         // 详细错误信息（可选）
}
```

## 组件 API (Component API)

### AIToolbar Props

| 属性名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `content` | `string` | 是 | 编辑器当前内容 |
| `onContentGenerated` | `(content: string) => void` | 否 | 续写内容生成时的回调 |
| `onSummaryGenerated` | `(summary: string) => void` | 否 | 摘要生成时的回调 |
| `className` | `string` | 否 | 额外的 CSS 类名 |

### useAI Hook

返回值：

```typescript
{
  callAI: (request: AIRequest) => Promise<string>,  // 调用 AI 接口
  isLoading: boolean,                                // 加载状态
  error: string | null                               // 错误信息
}
```

## 注意事项 (Notes)

1. **API 密钥安全**: 确保 `.env.local` 文件不被提交到版本控制系统
2. **费用控制**: 火山引擎 API 调用可能产生费用，请注意使用量
3. **错误处理**: 建议在生产环境中添加更完善的错误处理和重试机制
4. **内容验证**: 在调用 AI 前验证内容是否为空，避免不必要的 API 调用

## 开发建议 (Development Tips)

1. 可以根据实际需求扩展更多 AI 模式
2. 可以自定义 prompt 以获得更好的结果
3. 可以添加缓存机制以减少 API 调用次数
4. 可以集成流式响应以提供更好的用户体验

## 故障排查 (Troubleshooting)

### 常见问题

**Q: API 调用失败，返回 401 错误**
A: 检查 `VOLC_API_KEY` 和 `VOLC_MODEL_ENDPOINT` 环境变量是否正确配置

**Q: 响应时间过长**
A: 可能是网络问题或模型负载较高，建议添加超时处理

**Q: 生成的内容质量不佳**
A: 可以调整 prompt 或切换不同的模型端点

## 更新日志 (Changelog)

### v1.0.0 (2025-12-12)
- ✅ 初始版本
- ✅ 支持三种 AI 模式：摘要、续写、问答
- ✅ 提供 React Hook 和组件封装
- ✅ 集成火山引擎 API

## 许可证 (License)

MIT License
