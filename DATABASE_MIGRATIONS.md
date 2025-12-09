# 数据库迁移指南

## 1. 创建权限表

在Supabase控制台的SQL编辑器中执行以下语句，创建`note_permissions`表：

```sql
-- 创建笔记权限表
CREATE TABLE note_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID REFERENCES notes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  permission TEXT NOT NULL CHECK (permission IN ('viewer', 'commenter', 'editor')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(note_id, user_id)
);

-- 创建索引以提高查询性能
CREATE INDEX idx_note_permissions_note_id ON note_permissions(note_id);
CREATE INDEX idx_note_permissions_user_id ON note_permissions(user_id);

-- 添加RLS策略
ALTER TABLE note_permissions ENABLE ROW LEVEL SECURITY;

-- 允许用户查看自己的权限
CREATE POLICY "Users can view their own permissions" ON note_permissions
  FOR SELECT
  USING (auth.uid() = user_id);

-- 允许笔记所有者管理权限
CREATE POLICY "Note owners can manage permissions" ON note_permissions
  USING (
    EXISTS (
      SELECT 1 FROM notes
      WHERE notes.id = note_permissions.note_id
      AND notes.user_id = auth.uid()
    )
  );

-- 启用Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE note_permissions;
```

## 2. 更新笔记表的RLS策略

确保笔记表的RLS策略允许共享访问：

```sql
-- 更新笔记表的SELECT策略，允许所有者和有访问权限的用户查看
CREATE OR REPLACE POLICY "Notes are viewable by owner and authorized users" ON notes
  FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM note_permissions
      WHERE note_permissions.note_id = notes.id
      AND note_permissions.user_id = auth.uid()
      AND note_permissions.permission IN ('viewer', 'commenter', 'editor')
    )
  );

-- 更新笔记表的UPDATE策略，允许所有者和有编辑权限的用户更新
CREATE OR REPLACE POLICY "Notes are editable by owner and editors" ON notes
  FOR UPDATE
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM note_permissions
      WHERE note_permissions.note_id = notes.id
      AND note_permissions.user_id = auth.uid()
      AND note_permissions.permission = 'editor'
    )
  );

-- 更新笔记表的DELETE策略，仅允许所有者删除
CREATE OR REPLACE POLICY "Notes are deletable by owner only" ON notes
  FOR DELETE
  USING (user_id = auth.uid());
```