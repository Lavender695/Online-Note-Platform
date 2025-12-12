'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

export default function SettingsPage() {
  const { user, loading, updateProfile, signOut } = useAuth();
  const [email, setEmail] = useState(user?.email || '');
  const [name, setName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState(user?.user_metadata?.avatar_url || '');
  const [isUpdating, setIsUpdating] = useState(false);

  // 获取用户昵称
  useEffect(() => {
    const fetchUserName = async () => {
      if (user) {
        const { data } = await supabase.from('users').select('name').eq('id', user.id).single();
        if (data?.name) {
          setName(data.name);
        }
      }
    };
    fetchUserName();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">加载中...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">请先登录</div>
      </div>
    );
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatar(file);
      // 生成预览URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);

    try {
      // 验证密码
      if (newPassword && newPassword !== confirmPassword) {
        toast.error('两次输入的密码不一致');
        return;
      }

      // 上传头像到Supabase Storage（如果有新头像）
      let avatarUrl = user.user_metadata?.avatar_url;
      if (avatar) {
        const fileExt = avatar.name.split('.').pop();
        const fileName = `${user.id}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, avatar, { upsert: true });

        if (uploadError) {
          throw uploadError;
        }

        // 获取公共URL
        const { data: urlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(fileName);

        avatarUrl = urlData.publicUrl;
      }

      // 更新用户信息
      await updateProfile({
        name: name,
        email: email !== user.email ? email : undefined,
        password: newPassword || undefined,
        avatar_url: avatarUrl
      });

      toast.success('设置更新成功');
      
      // 重置表单
      setNewPassword('');
      setConfirmPassword('');
      setAvatar(null);
    } catch (error: any) {
      console.error('更新失败:', error);
      toast.error(error.message || '更新失败，请重试');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="container mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold mb-8">账户设置</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* 用户信息卡片 */}
        <Card className="lg:col-span-2">
          <CardHeader className="text-center">
            <div className="relative mx-auto w-24 h-24 mb-4">
              <Avatar className="w-full h-full">
                <AvatarImage src={avatarPreview} alt={user.email || 'User'} />
                <AvatarFallback>{user.email?.charAt(0)?.toUpperCase() || 'U'}</AvatarFallback>
              </Avatar>
              <label className="absolute bottom-0 right-0 bg-primary text-white p-2 rounded-full cursor-pointer hover:bg-primary/90 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleAvatarChange}
                />
              </label>
            </div>
            <CardTitle className="text-xl">{user.email}</CardTitle>
            <CardDescription>用户ID: {user.id}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">注册时间:</span>
                <span className="text-sm">{new Date(user.created_at).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">最后登录:</span>
                <span className="text-sm">{new Date(user.last_sign_in_at || user.created_at).toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
          <CardFooter className='justify-center'>
            <Button variant="destructive" className="w-full" onClick={signOut}>
              退出登录
            </Button>
          </CardFooter>
        </Card>

        {/* 设置表单 */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>个人信息</CardTitle>
            <CardDescription>更新您的账户信息</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-6">
              {/* 昵称设置 */}
              <div className="space-y-2">
                <label htmlFor="name" className="block text-sm font-medium">昵称</label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="输入您的昵称"
                />
              </div>

              {/* 邮箱设置 */}
              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-medium">邮箱</label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="输入您的邮箱"
                  required
                />
              </div>

              <Separator />

              {/* 密码设置 */}
              <div className="space-y-2">
                <h3 className="text-lg font-medium">密码设置</h3>
                <p className="text-sm text-muted-foreground">留空则保持当前密码不变</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="newPassword" className="block text-sm font-medium">新密码</label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="输入新密码"
                    minLength={6}
                  />
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="confirmPassword" className="block text-sm font-medium">确认密码</label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="再次输入新密码"
                    minLength={6}
                  />
                </div>
              </div>

              <Separator />

              {/* 头像设置 */}
              <div className="space-y-2">
                <h3 className="text-lg font-medium">头像设置</h3>
                <p className="text-sm text-muted-foreground">点击头像即可更换</p>
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full my-5" disabled={isUpdating}>
                {isUpdating ? '更新中...' : '保存设置'}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}