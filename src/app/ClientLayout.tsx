'use client';

import { ReactNode, useEffect } from 'react';
import { AuthProvider } from '@/hooks/useAuth';
import { Toaster } from 'sonner';

interface ClientLayoutProps {
  children: ReactNode;
}

export function ClientLayout({ children }: ClientLayoutProps) {
  // 在根级别初始化主题，确保加载页面也能应用主题
  useEffect(() => {
    // 从localStorage获取保存的主题
    const savedTheme = localStorage.getItem('theme');
    // 如果没有保存的主题，使用系统主题偏好
    const preferredTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const initialTheme = savedTheme || preferredTheme;
    document.documentElement.classList.toggle('dark', initialTheme === 'dark');
  }, []);

  return (
    <AuthProvider>
      {children}
      <Toaster position="top-right" />
    </AuthProvider>
  );
}
