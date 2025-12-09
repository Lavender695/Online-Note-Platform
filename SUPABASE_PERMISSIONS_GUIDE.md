# Supabase 权限配置指南

本指南将详细介绍如何在在线笔记平台中正确配置Supabase的访问权限，包括Row-Level Security (RLS) 设置、表级权限控制和API权限管理。

## 1. 基本概念

### Row-Level Security (RLS)
RLS是Supabase中控制数据访问的核心机制，它允许您基于用户属性和数据属性定义精细的访问策略。

### 权限类型
在我们的项目中，权限分为三种类型（在`src/types/permissions.ts`中定义）：
- `viewer`: 只能查看笔记
- `commenter`: 可以查看和评论笔记
- `editor`: 可以查看、编辑和评论笔记

## 2. 配置步骤

### 2.1 启用RLS

首先，需要为相关表启用RLS：

```sql
-- 为notes表启用RLS
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- 为note_permissions表启用RLS
ALTER TABLE public.note_permissions ENABLE ROW LEVEL SECURITY;

-- 为profiles表启用RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
```

### 2.2 配置notes表的RLS策略

根据`DATABASE_MIGRATIONS.md`中的内容，为notes表添加以下RLS策略：

```sql
-- 允许所有者完全访问自己的笔记
CREATE POLICY "Notes owner can do anything" ON public.notes
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 允许授权用户访问共享笔记
CREATE POLICY "Shared notes can be accessed by authorized users" ON public.notes
  USING (
    EXISTS (
      SELECT 1 FROM public.note_permissions
      WHERE note_id = notes.id AND user_id = auth.uid()
    )
  );
```

### 2.3 配置note_permissions表的RLS策略

为note_permissions表添加以下RLS策略：

```sql
-- 允许所有者管理笔记的权限
CREATE POLICY "Note owner can manage permissions" ON public.note_permissions
  USING (
    EXISTS (
      SELECT 1 FROM public.notes
      WHERE id = note_permissions.note_id AND user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.notes
      WHERE id = note_permissions.note_id AND user_id = auth.uid()
    )
  );

-- 允许用户查看自己的权限
CREATE POLICY "Users can view their own permissions" ON public.note_permissions
  USING (user_id = auth.uid());
```

### 2.4 配置profiles表的RLS策略

为profiles表添加以下RLS策略：

```sql
-- 允许用户查看其他用户的基本信息（用于搜索功能）
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
  FOR SELECT
  USING (true);

-- 允许用户更新自己的个人资料
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
```

### 2.5 创建索引

为了提高性能，为相关表创建索引：

```sql
-- 为note_permissions表创建复合索引
CREATE INDEX idx_note_permissions_note_id ON public.note_permissions(note_id);
CREATE INDEX idx_note_permissions_user_id ON public.note_permissions(user_id);
CREATE INDEX idx_note_permissions_note_user ON public.note_permissions(note_id, user_id);

-- 为notes表创建user_id索引
CREATE INDEX idx_notes_user_id ON public.notes(user_id);

-- 为profiles表创建email和full_name索引（用于搜索）
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_profiles_full_name ON public.profiles(full_name);
```

## 3. API权限控制

### 3.1 服务器端API权限

在API路由中，需要添加权限检查逻辑：

```typescript
// src/app/api/notes/route.ts
import { supabase } from '@/lib/supabase';
import { getServerSession } from 'next-auth';

export async function GET(request: Request) {
  const session = await getServerSession();
  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }

  // 获取请求参数
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (id) {
    // 检查用户是否有权限访问该笔记
    const { data: note, error } = await supabase
      .from('notes')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !note) {
      return new Response('Note not found', { status: 404 });
    }

    // 检查是否是笔记所有者或已被授权
    if (note.user_id !== session.user.id) {
      const { data: permission } = await supabase
        .from('note_permissions')
        .select('*')
        .eq('note_id', id)
        .eq('user_id', session.user.id)
        .single();

      if (!permission) {
        return new Response('Unauthorized', { status: 401 });
      }
    }

    return Response.json(note);
  }

  // 获取用户自己的笔记和共享笔记
  const { data: userNotes } = await supabase
    .from('notes')
    .select('*')
    .eq('user_id', session.user.id);

  const { data: sharedNotes } = await supabase
    .from('notes')
    .select('*')
    .innerJoin('note_permissions', 'notes.id', 'note_permissions.note_id')
    .eq('note_permissions.user_id', session.user.id);

  // 合并结果并去重
  const allNotes = [...(userNotes || []), ...(sharedNotes || [])];
  const uniqueNotes = Array.from(new Map(allNotes.map(note => [note.id, note])).values());

  return Response.json(uniqueNotes);
}
```

### 3.2 前端权限检查

在前端，我们使用`use-permission.ts` hook来检查用户权限：

```typescript
// 使用示例
import { usePermission } from '@/hooks/use-permission';
import { Note } from '@/types/note';

const NoteEditor = ({ note }: { note: Note }) => {
  const { canEdit, loading } = usePermission(note);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!canEdit()) {
    return <div>You don't have permission to edit this note.</div>;
  }

  // 编辑笔记的组件
  return <Editor note={note} />;
};
```

## 4. 用户搜索权限

在`src/app/api/users/search/route.ts`中，我们实现了用户搜索功能，需要确保只有授权用户才能访问：

```typescript
import { supabase } from '@/lib/supabase';

// 用户数据类型定义
interface UserData {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
}

export async function GET(request: Request) {
  try {
    // 获取搜索参数
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.toLowerCase() || '';

    // 先从profiles表查询
    let { data: profileUsers, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, full_name, avatar_url')
      .or(`id.ilike.%${query}%, email.ilike.%${query}%, full_name.ilike.%${query}%`)
      .limit(20);

    if (profileUsers && profileUsers.length > 0) {
      return Response.json({ users: profileUsers });
    }

    // 如果profiles表没有结果，尝试从users表查询
    const { data: directUsers, error: directError } = await supabase
      .from('users')
      .select('id, email')
      .or(`id.ilike.%${query}%, email.ilike.%${query}%`)
      .limit(20);

    if (directError) {
      throw directError;
    }

    // 转换格式，添加默认的full_name和avatar_url
    const users: UserData[] = directUsers.map(user => ({
      id: user.id,
      email: user.email,
      full_name: user.email?.split('@')[0] || '',
      avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(user.email?.split('@')[0] || '')}&background=random`
    }));

    return Response.json({ users });
  } catch (error) {
    console.error('Error searching users:', error);
    return new Response(JSON.stringify({ error: 'Failed to search users' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
```

## 5. 权限最佳实践

1. **最小权限原则**：只授予用户完成任务所需的最小权限
2. **定期审查**：定期审查RLS策略和API权限，确保符合安全需求
3. **错误处理**：在API和前端中添加适当的错误处理，不要暴露敏感信息
4. **日志记录**：记录权限相关的操作，以便审计和调试
5. **使用事务**：在修改权限时使用事务，确保数据一致性

## 6. 常见问题

### 6.1 权限不生效

如果权限不生效，可能是以下原因：

1. 未启用RLS
2. RLS策略定义错误
3. 用户认证信息不正确
4. 策略条件不匹配

### 6.2 性能问题

如果RLS策略导致性能问题，可以：
1. 为频繁查询的字段创建索引
2. 优化策略条件，避免复杂的子查询
3. 考虑使用缓存机制

### 6.3 共享笔记权限

确保在`note_permissions`表中正确记录了共享权限，并且RLS策略正确引用了该表。

## 7. 测试权限

可以使用以下方法测试权限：

1. **Supabase控制台**：使用SQL编辑器测试不同用户的访问权限
2. **API测试工具**：使用Postman或Insomnia测试API权限
3. **前端测试**：在应用中使用不同用户角色测试权限

## 8. 参考文件

- `src/types/permissions.ts`: 权限类型定义
- `src/hooks/use-permission.ts`: 权限检查hook
- `src/app/api/notes/route.ts`: API权限控制
- `DATABASE_MIGRATIONS.md`: 数据库迁移脚本
- `SUPABASE_REALTIME_GUIDE.md`: 实时功能配置指南

通过以上配置，您可以在在线笔记平台中实现安全、灵活的权限管理系统。