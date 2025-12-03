'use client';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import Header from '@/components/layout/Header';
import { AppSidebar } from '@/components/layout/home/AppSidebar';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);

  // 加载中显示加载状态
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4 text-foreground">加载中...</h2>
          <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }

  // 未登录用户不显示内容
  if (!user) {
    return null;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen max-w-screen">
        <Header />
        <div className="pt-10 flex flex-1">
          <AppSidebar />
          <div className="flex-1 overflow-hidden">
            {children}
          </div>
        </div>
        <SidebarTrigger className="fixed bottom-20 left-4 z-500 md:bottom-20 bg-background shadow-lg hover:shadow-xl transition-shadow" />
      </div>
    </SidebarProvider>
  );
}