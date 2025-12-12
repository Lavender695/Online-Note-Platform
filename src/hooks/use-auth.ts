'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { Session, User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  updateProfile: (data: { email?: string; password?: string; avatar_url?: string; name?: string }) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 初始化时获取当前用户会话和用户信息
    const getSession = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      setUser(data.session?.user || null);
      setLoading(false);
    };

    getSession();

    // 监听认证状态变化
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user || null);
      setLoading(false);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const updateProfile = async (data: { email?: string; password?: string; avatar_url?: string; name?: string }) => {
    try {
      if (!user) throw new Error('用户未登录');

      // 更新邮箱（如果提供）
      if (data.email) {
        await supabase.auth.updateUser({ email: data.email });
      }

      // 更新密码（如果提供）
      if (data.password) {
        await supabase.auth.updateUser({ password: data.password });
      }

      // 更新用户信息到数据库users表
      const updateData: any = {};
      if (data.name !== undefined) {
        updateData.name = data.name;
      }

      // 如果有数据需要更新到数据库
      if (Object.keys(updateData).length > 0) {
        await supabase.from('users').update(updateData).eq('id', user.id);
      }

      // 更新头像（如果Supabase Storage已配置）
      if (data.avatar_url) {
        // 将头像URL存储在user_metadata中，无需额外profiles表
        await supabase.auth.updateUser({
          data: { avatar_url: data.avatar_url }
        });
      }
    } catch (error) {
      console.error('更新用户信息失败:', error);
      throw error;
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return React.createElement(
    AuthContext.Provider,
    { value: { user, session, loading, updateProfile, signOut } },
    children
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth必须在AuthProvider内部使用');
  }
  return context;
}