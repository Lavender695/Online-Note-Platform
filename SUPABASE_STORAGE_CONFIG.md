# Supabase Storage 权限配置指南

## 问题描述
在使用头像上传功能时遇到以下错误：
```
StorageApiError: new row violates row-level security policy
```

这是因为 Supabase Storage 的行级安全策略（RLS）不允许执行上传操作。

## 解决方案

### 1. 创建 avatars 存储桶
1. 登录 Supabase 控制台
2. 导航到 **Storage** → **Buckets**
3. 点击 **New Bucket**
4. 填写以下信息：
   - **Name**: `avatars`
   - **Access Control**: `Public`
   - 勾选 **Enable file browser access**
5. 点击 **Create Bucket**

### 2. 配置权限策略
1. 导航到 **SQL Editor** → **New Query**
2. 复制以下 SQL 语句并执行：

```sql
-- 1. 允许公开访问 avatars 存储桶中的文件
CREATE POLICY "Avatar images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'avatars');

-- 2. 允许已认证用户上传自己的头像（文件名必须是用户 ID）
CREATE POLICY "Users can upload their own avatar" 
ON storage.objects 
FOR INSERT 
TO authenticated 
WITH CHECK (
  bucket_id = 'avatars' AND 
  auth.uid() = split_part(name, '.', 1)::uuid
);

-- 3. 允许已认证用户更新自己的头像
CREATE POLICY "Users can update their own avatar" 
ON storage.objects 
FOR UPDATE 
TO authenticated 
USING (
  bucket_id = 'avatars' AND 
  auth.uid() = split_part(name, '.', 1)::uuid
);

-- 4. 允许已认证用户删除自己的头像
CREATE POLICY "Users can delete their own avatar" 
ON storage.objects 
FOR DELETE 
TO authenticated 
USING (
  bucket_id = 'avatars' AND 
  auth.uid() = split_part(name, '.', 1)::uuid
);
```

### 3. 测试上传功能
配置完成后，您可以：
1. 访问 `/test-avatar` 页面测试头像上传
2. 访问 `/settings` 页面上传您的头像

## 关键说明

### 权限策略详解
- **公开访问策略**：允许任何人查看 avatars 存储桶中的文件
- **上传策略**：允许已认证用户上传文件，且文件名必须是用户 ID
- **更新策略**：允许已认证用户更新自己的头像
- **删除策略**：允许已认证用户删除自己的头像

### 文件名格式
头像文件名必须遵循以下格式：
```
{user_id}.{extension}
```
例如：`550e8400-e29b-41d4-a716-446655440000.png`

### 安全注意事项
- 使用 **Public** 存储桶（非 Private）
- 确保您已登录（需要认证用户才能上传）
- 文件名限制确保用户只能操作自己的头像

## 故障排除

### 检查项
1. ✅ 存储桶名称是否为 `avatars`
2. ✅ 存储桶是否为 **Public** 访问权限
3. ✅ 是否已执行所有权限策略 SQL
4. ✅ 是否已登录用户
5. ✅ 文件名是否为用户 ID + 扩展名

### 常见错误
- **403 Forbidden**：权限策略配置错误
- **File not found**：存储桶名称错误或文件路径错误
- **Invalid token**：用户未登录或认证过期

## 代码位置

### 头像上传逻辑
- `src/app/(main)/settings/page.tsx` - 设置页面的头像上传功能
- `src/app/test-avatar/page.tsx` - 测试页面的头像上传功能
- `src/hooks/use-auth.ts` - 头像 URL 存储逻辑（存储在 user_metadata 中）

### 存储桶配置
- 存储桶名称：`avatars`
- 文件路径：`avatars/{user_id}.{extension}`
- 访问权限：Public

## 联系信息
如果您在配置过程中遇到问题，请：
1. 检查 Supabase 控制台的错误日志
2. 查看浏览器开发者工具的网络请求
3. 确保所有配置步骤都已正确执行