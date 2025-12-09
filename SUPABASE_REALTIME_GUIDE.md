# Supabase Realtime 使用指南

## 一、在 Supabase 控制台启用 Realtime

### 1. 登录 Supabase 控制台
访问 [Supabase 控制台](https://supabase.com/dashboard) 并登录到您的项目。

### 2. 启用 Realtime 功能
最新版本的 Supabase 控制台已经简化了 Realtime 的配置流程：

1. 选择您的项目
2. 导航到 **Database** → **Tables**
3. 找到并点击 `notes` 表
4. 在表详情页面，点击 **Edit Table** 按钮
5. 在 **Realtime** 选项下，切换开关以启用 Realtime

**关于事件类型选择：**
- 在最新版本的 Supabase 控制台中，启用 Realtime 后会默认监听所有事件类型（INSERT、UPDATE、DELETE）
- 如果需要更精细的控制，您可以通过 SQL 语句或后端 API 配置特定的事件类型
- 您的前端代码（`src/hooks/use-notes.ts`）已经使用 `event: '*'` 配置为接收所有事件类型的更新

**前端代码中配置特定事件类型：**
如果您想在前端代码中只监听特定的事件类型，可以修改 `event` 参数：

```javascript
// 只监听 INSERT 事件
const channel = supabase
  .channel('notes-channel')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',  // 只监听插入事件
      schema: 'public',
      table: 'notes',
      filter: `user_id=eq.${user.id}`
    },
    (payload) => {
      // 处理事件
    }
  );

// 或者监听多个特定事件
const channel = supabase
  .channel('notes-channel')
  .on(
    'postgres_changes',
    {
      event: 'INSERT,UPDATE',  // 监听插入和更新事件
      schema: 'public',
      table: 'notes',
      filter: `user_id=eq.${user.id}`
    },
    (payload) => {
      // 处理事件
    }
  );
```

6. 点击 **Save** 保存配置

### 3. 配置 RLS (Row Level Security)
确保为 `notes` 表设置了适当的 RLS 策略，以保证只有授权用户能访问数据：

1. 导航到 **Database** → **Tables** → **notes** → **Policies**
2. 确保已创建以下策略：
   - 允许用户读取自己的笔记
   - 允许用户创建自己的笔记
   - 允许用户更新自己的笔记
   - 允许用户删除自己的笔记

## 二、在前端集成 Supabase Realtime

### 1. 更新 `use-notes.ts` Hook 集成 Realtime

修改现有的 `use-notes.ts` 文件，添加 Realtime 订阅功能：

```typescript
'use client';
import { useState, useEffect, useCallback } from 'react';
import { Note } from '@/types/note';
import { supabase } from '@/lib/supabase';
import { useAuth } from './use-auth';

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<Note[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setNotes([]);
      setLoading(false);
      return;
    }

    // Fetch initial notes
    const fetchNotes = async () => {
      try {
        const { data, error } = await supabase
          .from('notes')
          .select('*')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false });

        if (error) {
          throw error;
        }

        setNotes(data || []);
        setLoading(false);
      } catch (err: any) {
        setError('Failed to fetch notes: ' + err.message);
        setLoading(false);
      }
    };

    fetchNotes();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('notes-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notes',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          // Handle realtime changes
          switch (payload.eventType) {
            case 'INSERT':
              // Add new note to the list
              setNotes(prev => [payload.new as Note, ...prev]);
              break;
            case 'UPDATE':
              // Update existing note
              setNotes(prev => 
                prev.map(note => 
                  note.id === payload.new.id 
                    ? payload.new as Note 
                    : note
                )
              );
              break;
            case 'DELETE':
              // Remove deleted note
              setNotes(prev => 
                prev.filter(note => note.id !== payload.old.id)
              );
              // Also update search results if any are deleted
              setSearchResults(prev => 
                prev.filter(note => note.id !== payload.old.id)
              );
              break;
          }
        }
      )
      .subscribe();

    // Cleanup channel on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // 其他现有方法保持不变...

  return {
    notes,
    loading,
    error,
    searchResults,
    getNoteById,
    createNote,
    updateNote,
    deleteNotes,
    searchNotes,
  };
}
```

### 2. 实时订阅关键代码解析

#### 创建订阅频道
```typescript
const channel = supabase
  .channel('notes-channel')
  .on(
    'postgres_changes',
    {
      event: '*', // 监听所有事件 (INSERT, UPDATE, DELETE)
      schema: 'public',
      table: 'notes',
      filter: `user_id=eq.${user.id}` // 只监听当前用户的笔记
    },
    (payload) => {
      // 处理变更事件
    }
  )
  .subscribe();
```

#### 事件类型处理
- **INSERT**: 当创建新笔记时，将新笔记添加到列表顶部
- **UPDATE**: 当更新笔记时，替换列表中对应的旧笔记
- **DELETE**: 当删除笔记时，从列表中移除该笔记

#### 清理订阅
```typescript
return () => {
  supabase.removeChannel(channel);
};
```

## 三、使用示例：实时协同编辑

### 1. 监听特定笔记的更新

如果需要在编辑页面实时显示其他用户的修改，可以创建一个专门的 hook：

```typescript
// src/hooks/use-realtime-note.ts
'use client';
import { useEffect, useState } from 'react';
import { Note } from '@/types/note';
import { supabase } from '@/lib/supabase';

export function useRealtimeNote(noteId: string) {
  const [note, setNote] = useState<Note | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (!noteId) return;

    // Subscribe to specific note changes
    const channel = supabase
      .channel(`note-${noteId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notes',
          filter: `id=eq.${noteId}`
        },
        (payload) => {
          setIsUpdating(true);
          setNote(payload.new as Note);
          
          // Reset updating state after a short delay
          setTimeout(() => setIsUpdating(false), 1000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [noteId]);

  return { note, isUpdating };
}
```

### 2. 在组件中使用实时笔记

```typescript
'use client';
import { useRealtimeNote } from '@/hooks/use-realtime-note';

function NoteEditor({ noteId }: { noteId: string }) {
  const { note, isUpdating } = useRealtimeNote(noteId);

  return (
    <div>
      {isUpdating && (
        <div className="bg-yellow-100 text-yellow-800 p-2 mb-2 rounded">
          笔记已更新！
        </div>
      )}
      {note && (
        <div>
          <h1>{note.title}</h1>
          <div>{note.content}</div>
        </div>
      )}
    </div>
  );
}
```

## 四、高级功能

### 1. 监听特定列的变化

如果只关心笔记内容的变化，可以修改过滤器：

```typescript
.on(
  'postgres_changes',
  {
    event: 'UPDATE',
    schema: 'public',
    table: 'notes',
    filter: `id=eq.${noteId}`,
    eventOptions: { includeTypes: ['UPDATE'], updatedColumns: ['content'] }
  },
  (payload) => {
    // 只处理内容变化
  }
)
```

### 2. 批量更新优化

对于频繁更新的场景，可以使用防抖来减少更新频率：

```typescript
'use client';
import { useEffect, useState, useCallback } from 'react';
import { Note } from '@/types/note';
import { supabase } from '@/lib/supabase';
import { useDebounce } from './use-debounce';

export function useRealtimeNote(noteId: string) {
  const [rawNote, setRawNote] = useState<Note | null>(null);
  const debouncedNote = useDebounce(rawNote, 300);

  useEffect(() => {
    if (!noteId) return;

    const channel = supabase
      .channel(`note-${noteId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notes',
          filter: `id=eq.${noteId}`
        },
        (payload) => {
          setRawNote(payload.new as Note);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [noteId]);

  return { note: debouncedNote };
}
```

## 五、常见问题排查

### 1. 订阅不生效
- 检查 Supabase 控制台是否已启用 Realtime
- 确认 RLS 策略是否允许当前用户访问数据
- 验证过滤器条件是否正确
- 检查浏览器控制台是否有错误信息

### 2. 性能问题
- 避免订阅过多的表或行
- 使用合适的过滤器减少不必要的更新
- 考虑使用防抖来减少频繁更新的影响

### 3. 权限问题
- 确保已正确配置 RLS 策略
- 验证用户是否已正确认证
- 检查 Supabase 密钥是否有 Realtime 权限

## 六、总结

通过 Supabase Realtime，您可以轻松实现：
- 实时笔记列表更新
- 多人协同编辑
- 实时通知
- 数据变更同步

Supabase Realtime 是一个强大的功能，它基于 PostgreSQL 的内置复制功能，提供了简单而高效的实时数据同步解决方案，非常适合您的在线笔记平台项目。