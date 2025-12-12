# 在线笔记平台

一个功能丰富的在线笔记应用，提供富文本编辑、笔记管理、用户认证等功能，基于现代Web技术栈构建。

## 功能特性

### 核心功能
- ✅ **富文本编辑**：使用Plate.js构建的强大编辑器，支持多种格式和功能
- ✅ **笔记管理**：创建、编辑、删除和搜索笔记
- ✅ **用户认证**：安全的登录和注册系统
- ✅ **本地自动保存**：实时保存编辑内容到本地存储，防止数据丢失
- ✅ **云端同步**：自动将笔记同步到Supabase数据库
- ✅ **响应式设计**：适配各种设备和屏幕尺寸

### 高级功能
- 📝 **Markdown支持**：支持Markdown格式的内容
- 🎨 **多种编辑工具**：表格、列表、代码块、链接等
- 🔍 **搜索功能**：快速查找笔记
- ⚙️ **设置面板**：个性化应用设置
- 📱 **移动友好**：支持移动设备编辑

### AI 功能（基于火山引擎）
- ✨ **智能续写**：AI 自动续写内容，保持风格一致
- 📋 **内容摘要**：一键生成内容摘要，快速了解重点
- 💡 **智能问答**：基于上下文的智能问答功能

## 技术栈

### 前端
- **框架**: Next.js 16
- **UI库**: React 18
- **编辑器**: Plate.js (富文本编辑器)
- **UI组件**: @shadcn/ui, Radix UI
- **样式**: Tailwind CSS
- **状态管理**: React Hooks
- **工具库**: clsx, lodash, date-fns

### 后端
- **API**: Next.js API Routes
- **数据库**: Supabase
- **认证**: Supabase Auth
- **文件上传**: UploadThing
- **服务器**: Express.js (可选)

### AI集成
- **AI 引擎**: 火山引擎 (Volcano Engine/Doubao)
- **AI SDK**: @ai-sdk/react
- **AI 功能**: 
  - 智能续写 (AI Completion)
  - 内容摘要 (Summary Generation)
  - 智能问答 (Context-based Search)
- **AI助手**: 集成AI命令和 copilots

## 项目结构

```
online-note-platform/
├── src/
│   ├── app/
│   │   ├── (main)/           # 主要应用页面
│   │   │   ├── dashboard/    # 笔记仪表板
│   │   │   ├── editor/       # 富文本编辑器
│   │   │   ├── search/       # 笔记搜索
│   │   │   └── settings/     # 设置页面
│   │   ├── api/              # API路由
│   │   ├── auth/             # 认证页面
│   │   └── layout.tsx        # 应用布局
│   ├── components/           # React组件
│   │   ├── ui/               # UI组件
│   │   ├── editor-kit.tsx    # 编辑器工具集
│   │   └── plate-editor.tsx  # 主编辑器组件
│   ├── hooks/                # 自定义Hooks
│   │   ├── use-notes.ts      # 笔记管理
│   │   └── use-auth.ts       # 认证管理
│   ├── lib/                  # 工具库
│   │   ├── supabase.ts       # Supabase客户端
│   │   └── utils.ts          # 通用工具
│   └── types/                # TypeScript类型定义
├── public/                   # 静态资源
├── server/                   # 可选的Express服务器
└── package.json              # 项目配置
```

## 快速开始

### 前置条件
- Node.js 18+ 或 pnpm 安装
- Supabase 账户和项目
- UploadThing 账户 (可选)

### 安装

1. 克隆仓库
```bash
git clone <repository-url>
cd online-note-platform
```

2. 安装依赖
```bash
# 使用 npm
npm install

# 或使用 pnpm
pnpm install
```

### 配置

1. 创建 `.env.local` 文件并添加以下环境变量：
```
# Supabase 配置
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# 火山引擎 AI 配置
VOLC_API_KEY=your-volcano-engine-api-key
VOLC_MODEL_ENDPOINT=your-volcano-engine-model-endpoint

# 可选：自定义 API 地址（默认为中国北京区域）
# VOLC_API_URL=https://ark.cn-beijing.volces.com/api/v3/chat/completions
```

**火山引擎 API 配置说明：**
- `VOLC_API_KEY`: 你的火山引擎 API 密钥
- `VOLC_MODEL_ENDPOINT`: 你的火山引擎推理接入点 ID（例如: ep-2024...）
- `VOLC_API_URL` (可选): 自定义 API 地址，默认为中国北京区域
- 获取方式: 登录[火山引擎控制台](https://console.volcengine.com/)，在"机器学习平台"中创建推理接入点

2. 配置 Supabase 数据库：
   - 创建 `notes` 表，包含以下字段：
     - `id` (UUID, 主键)
     - `title` (文本)
     - `content` (文本或JSON)
     - `user_id` (UUID, 外键关联用户)
     - `created_at` (时间戳)
     - `updated_at` (时间戳)
   - 配置行级安全策略，确保用户只能访问自己的笔记

### 运行

1. 启动开发服务器
```bash
npm run dev
# 或
pnpm dev
```

2. 打开浏览器访问 `http://localhost:3000`

### 构建生产版本

```bash
npm run build
# 或
pnpm build
```

### 启动生产服务器

```bash
npm run start
# 或
pnpm start
```

## 主要功能说明

### 笔记编辑器

使用 Plate.js 构建的富文本编辑器，支持：
- 标题和段落
- 列表 (有序和无序)
- 代码块
- 表格
- 链接和图片
- 注释功能
- Markdown 支持

### 笔记管理

- **创建笔记**：点击"创建笔记"按钮开始新笔记
- **编辑笔记**：在编辑器中修改笔记内容
- **删除笔记**：在仪表板中选择笔记进行删除
- **搜索笔记**：使用搜索功能快速查找特定笔记

### 用户认证

- **注册**：创建新账户
- **登录**：使用现有账户登录
- **安全**：使用 Supabase Auth 确保用户数据安全

### AI 功能使用

**使用 AI 工具栏组件**：

```tsx
import { AIToolbar } from '@/components/ai-toolbar';

// 在你的编辑器组件中
<AIToolbar
  content={editorContent}
  onResult={(result, mode) => {
    if (mode === 'completion') {
      // 将 AI 续写的内容插入到编辑器
      insertTextToEditor(result);
    } else if (mode === 'summary') {
      // 显示摘要结果
      showSummaryDialog(result);
    }
  }}
/>
```

**使用 useAI Hook**：

```tsx
import { useAI } from '@/hooks/use-ai';

function MyComponent() {
  const { generateSummary, complete, search, isLoading, error } = useAI();

  // 生成摘要
  const handleSummary = async () => {
    const summary = await generateSummary(content);
    console.log(summary);
  };

  // 智能续写
  const handleCompletion = async () => {
    const continuation = await complete(content);
    console.log(continuation);
  };

  // 智能问答
  const handleSearch = async () => {
    const answer = await search('什么是人工智能？', contextText);
    console.log(answer);
  };
}
```


## API 端点

### 笔记相关
- `GET /api/notes` - 获取用户笔记
- `POST /api/notes` - 创建新笔记
- `PUT /api/notes/:id` - 更新笔记
- `DELETE /api/notes/:id` - 删除笔记

### AI 相关（基于火山引擎）
- `POST /api/ai` - AI 功能接口，支持多种模式：
  - **summary**: 生成内容摘要
    ```json
    {
      "mode": "summary",
      "content": "要总结的内容..."
    }
    ```
  - **completion**: 智能续写
    ```json
    {
      "mode": "completion",
      "content": "需要续写的内容..."
    }
    ```
  - **search**: 基于上下文的问答
    ```json
    {
      "mode": "search",
      "query": "问题内容",
      "context": "可选的上下文信息"
    }
    ```

### AI 相关（Plate.js 集成）
- `POST /api/ai/command` - 执行AI命令
- `POST /api/ai/copilot` - AI助手功能

## 开发指南

### 代码规范

- 使用 TypeScript 编写类型安全的代码
- 遵循 Next.js 最佳实践
- 使用 Tailwind CSS 进行样式设计
- 组件使用 PascalCase 命名
- 函数和变量使用 camelCase 命名

### 测试

```bash
# 运行测试
npm test
# 或
pnpm test
```

###  linting

```bash
# 运行 ESLint
npm run lint
# 或
pnpm lint
```


## 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 致谢

- [Next.js](https://nextjs.org/) - React 框架
- [Supabase](https://supabase.com/) - 开源 Firebase 替代品
- [Plate.js](https://platejs.org/) - 富文本编辑器框架
- [@shadcn/ui](https://ui.shadcn.com/) - UI 组件库
- [Tailwind CSS](https://tailwindcss.com/) - 实用优先的 CSS 框架

## 联系方式

该项目仍在开发中，如有问题或建议，请通过以下方式联系：

- Email: [2513690786@qq.com]
- GitHub: [Lavender695](https://github.com/Lavender695)

---
