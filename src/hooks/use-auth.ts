'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { Session, User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  updateProfile: (data: { email?: string; password?: string; avatar_url?: string }) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 初始化时获取当前用户会话
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

  const updateProfile = async (data: { email?: string; password?: string; avatar_url?: string }) => {
    try {
      if (!user) throw new Error('用户未登录');

      // 更新邮箱
      if (data.email && data.email !== user.email) {
        await supabase.auth.updateUser({ email: data.email });
      }

      // 更新密码
      if (data.password) {
        await supabase.auth.updateUser({ password: data.password });
      }

      // 更新头像（如果Supabase Storage已配置）
      if (data.avatar_url) {
        await supabase.from('users').upsert(
          { id: user.id, avatar_url: data.avatar_url },
          { onConflict: 'id' }
        );
        // 更新本地用户信息
        setUser(prev => prev ? { ...prev, user_metadata: { ...prev.user_metadata, avatar_url: data.avatar_url } } : null);
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