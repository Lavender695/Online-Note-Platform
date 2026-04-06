# 寻星手札-笔记平台

一个基于 Next.js 的现代笔记平台，主打富文本编辑、AI 辅助写作、云端同步和多人协作能力。

## 功能概览

- 富文本编辑：基于 Plate.js，支持标题、列表、代码块、表格、媒体、数学公式、Markdown 等。
- AI 辅助：支持摘要、续写、问答，以及流式输出。
- 登录与权限：使用 Clerk 进行身份认证，结合 Supabase 做数据存储与访问。
- 本地优先：编辑内容可落地到 IndexedDB，网络波动下也能保持可用。
- 云端同步：笔记元数据同步到 Supabase，支持跨设备访问。
- 文件上传：通过 UploadThing 上传图片/视频/音频/PDF 等。
- 协作能力：集成 Liveblocks + Yjs（需配置公钥）。

## 技术栈

- 框架：Next.js 16、React 18、TypeScript
- 编辑器：Plate.js 51
- 样式：Tailwind CSS 4 + Radix UI + shadcn/ui
- 认证：Clerk
- 数据库：Supabase
- AI：Vercel AI SDK + Volcano Engine 
- 上传：UploadThing
- 协作：Liveblocks + Yjs

## 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置环境变量

在项目根目录创建 `.env.local`：

```bash
# Supabase（必填）
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Clerk（必填）
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# 火山引擎 AI（至少需要 API_KEY + 模型）
VOLC_API_KEY=
VOLC_MODEL_ENDPOINT=
# 可选：优先用于 /api/chat
VOLC_MODEL_ID=
# 可选：默认值见下方
VOLC_API_URL=

# UploadThing（上传功能需要）
UPLOADTHING_SECRET=
UPLOADTHING_APP_ID=

# Liveblocks（协作功能需要）
NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY=

# 可选：AI Gateway（用于 /api/ai/copilot 与 /api/ai/command）
AI_GATEWAY_API_KEY=
```

说明：
- `VOLC_API_URL` 默认是 `https://ark.cn-beijing.volces.com/api/v3`（聊天）或 `https://ark.cn-beijing.volces.com/api/v3/chat/completions`（摘要/续写/问答）。
- 如果未配置 `NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY`，应用仍可运行，只是不能开启协作。

### 3. 初始化 Supabase 表

执行以下 SQL（可按需扩展）：

```sql
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  title text not null default 'Untitled note',
  content jsonb not null default '[]'::jsonb,
  tags text[] not null default '{}',
  sync_state text not null default 'synced',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists notes_user_id_idx on public.notes(user_id);
create index if not exists notes_updated_at_idx on public.notes(updated_at desc);
```

### 4. 启动开发环境

```bash
pnpm dev
```

打开 `http://localhost:3000`。

## 常用命令

```bash
pnpm dev     # 本地开发
pnpm build   # 构建生产包
pnpm start   # 运行生产包
pnpm lint    # 代码检查
```

可选：如果你需要单独启动信令服务（`server/server.js`）：

```bash
node server/server.js
```

默认端口为 `4444`，可通过 `PORT` 覆盖。

## API 概览

- `POST /api/ai`
  - 模式：`summary`、`completion`、`search`
  - 依赖：`VOLC_API_KEY` + `VOLC_MODEL_ENDPOINT`
- `POST /api/chat`
  - 流式聊天接口
  - 依赖：`VOLC_API_KEY` + (`VOLC_MODEL_ID` 或 `VOLC_MODEL_ENDPOINT`)
- `GET|POST /api/uploadthing`
  - UploadThing 路由处理

## 目录结构（精简）

```text
src/
  app/
    (main)/                 # 主业务页面（dashboard/editor/search/settings）
    auth/                   # 登录/注册
    api/                    # AI、Chat、Upload 路由
  components/               # UI 与编辑器组件
  hooks/                    # use-notes/use-ai 等业务 hooks
  lib/                      # Supabase/UploadThing 等客户端封装
  db/                       # 数据访问适配层
  types/                    # 类型定义
server/
  server.js                 # 可选的 WebSocket 信令服务
```

## 已知注意事项

- 当前项目使用 App Router；`src/app/api/notes/notes.ts` 是旧式 API 文件，不会被 App Router 自动当作 `route.ts` 暴露。
- Supabase 客户端已做延迟初始化，避免在构建/预渲染阶段因缺失环境变量导致导入时报错。

## License

MIT
