'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, UserPlus, X } from 'lucide-react';
import { useUserSearch } from '@/hooks/use-user-search';
import { PermissionType, NotePermission } from '@/types/permissions';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Note } from '@/types/note';
import { useAuth } from '@/hooks/use-auth';

interface PermissionSettingsProps {
  note: Note;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PermissionSettings({ note, open, onOpenChange }: PermissionSettingsProps) {
  const { user } = useAuth();
  const [currentPermissions, setCurrentPermissions] = useState<NotePermission[]>([]);
  const [permissionsLoading, setPermissionsLoading] = useState(true);
  
  // 检查是否为所有者
  const isOwner = user?.id === note?.user_id;
  
  // 获取当前笔记的权限列表
  const fetchPermissions = async () => {
    if (!note?.id) return;
    
    setPermissionsLoading(true);
    try {
      const { data, error } = await supabase
        .from('note_permissions')
        .select('*')
        .eq('note_id', note.id);
      
      if (error) {
        console.error('获取权限列表失败:', error);
        return;
      }
      
      setCurrentPermissions(data || []);
    } catch (error) {
      console.error('获取权限列表失败:', error);
    } finally {
      setPermissionsLoading(false);
    }
  };
  
  // 组件挂载或笔记变化时获取权限
  useEffect(() => {
    if (open && note?.id) {
      fetchPermissions();
    }
  }, [open, note?.id]);
  const { searchQuery, searchResults, loading, searchUsers } = useUserSearch();
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedPermission, setSelectedPermission] = useState<PermissionType>('viewer');
  const [updating, setUpdating] = useState(false);

  // 处理用户选择
  const handleUserSelect = (user: any) => {
    setSelectedUser(user);
  };

  // 处理权限设置
  const handleSetPermission = async () => {
    if (!selectedUser || !note.id) return;

    setUpdating(true);
    try {
      const { error } = await supabase
        .from('note_permissions')
        .upsert(
          {
            note_id: note.id,
            user_id: selectedUser.id,
            permission: selectedPermission,
          },
          { onConflict: 'note_id,user_id' }
        );

      if (error) {
        console.error('设置权限失败:', error);
        toast.error('设置权限失败');
        return;
      }

      toast.success('权限设置成功');
      setSelectedUser(null);
      setSelectedPermission('viewer');
      searchUsers('');
      // 更新权限列表
      fetchPermissions();
    } catch (error) {
      console.error('设置权限失败:', error);
      toast.error('设置权限失败');
    } finally {
      setUpdating(false);
    }
  };

  // 处理权限删除
  const handleRemovePermission = async (permissionId: string) => {
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('note_permissions')
        .delete()
        .eq('id', permissionId);

      if (error) {
        console.error('删除权限失败:', error);
        toast.error('删除权限失败');
        return;
      }

      toast.success('权限已删除');
      // 更新权限列表
      fetchPermissions();
    } catch (error) {
      console.error('删除权限失败:', error);
      toast.error('删除权限失败');
    } finally {
      setUpdating(false);
    }
  };

  if (!isOwner || !note) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="secondary" className="flex items-center gap-2">
          <UserPlus className="h-4 w-4" />
          协作编辑
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>协作编辑设置</DialogTitle>
          <DialogDescription>
            为笔记 {note.title} 设置协作权限
          </DialogDescription>
        </DialogHeader>
        
        {/* 搜索用户部分 */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>添加协作者</CardTitle>
              <CardDescription>
                搜索用户并设置其对该笔记的权限
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="搜索用户ID或邮箱"
                    value={searchQuery}
                    onChange={(e) => searchUsers(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && searchUsers(searchQuery)}
                    className="flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => searchUsers(searchQuery)}
                    className="shrink-0"
                  >
                    <Search className="h-5 w-5 text-muted-foreground" />
                  </Button>
                </div>
                
                {/* 搜索结果 */}
                {loading && (
                  <div className="text-center py-2">搜索中...</div>
                )}
                
                {searchResults.length > 0 && (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {searchResults.map((user) => (
                      <Card key={user.id} className="cursor-pointer hover:shadow-md transition-shadow">
                        <CardContent className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage src={user.avatar_url || ''} />
                              <AvatarFallback>{user.email.charAt(0).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{user.email}</div>
                              <div className="text-sm text-muted-foreground">{user.id}</div>
                            </div>
                          </div>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleUserSelect(user)}
                          >
                            选择
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
            
            {/* 已选择用户和权限设置 */}
            {selectedUser && (
              <CardFooter className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={selectedUser.avatar_url || ''} />
                    <AvatarFallback>{selectedUser.email.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{selectedUser.email}</div>
                    <div className="text-sm text-muted-foreground">{selectedUser.id}</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Select value={selectedPermission} onValueChange={(value) => setSelectedPermission(value as PermissionType)}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="选择权限" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="viewer">仅查看</SelectItem>
                      <SelectItem value="commenter">查看和建议</SelectItem>
                      <SelectItem value="editor">编辑</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Button
                    onClick={handleSetPermission}
                    disabled={updating}
                  >
                    {updating ? '设置中...' : '设置权限'}
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedUser(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardFooter>
            )}
          </Card>
          
          {/* 当前权限列表 */}
          <Card>
            <CardHeader>
              <CardTitle>当前协作者</CardTitle>
              <CardDescription>
                当前拥有该笔记权限的用户列表
              </CardDescription>
            </CardHeader>
            <CardContent>
              {currentPermissions.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  暂无协作者
                </div>
              ) : (
                <div className="space-y-2">
                  {currentPermissions.map((permission) => (
                    <div key={permission.id} className="flex items-center justify-between p-2 rounded border">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback>{permission.user_id.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">用户 ID: {permission.user_id}</div>
                          <div className="text-sm text-muted-foreground">
                            权限: {permission.permission === 'viewer' ? '仅查看' : permission.permission === 'commenter' ? '查看和建议' : '编辑'}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemovePermission(permission.id)}
                        disabled={updating}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>关闭</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
