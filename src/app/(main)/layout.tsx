'use client';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import Header from '@/components/layout/Header';
import { AppSidebar } from '@/components/layout/home/AppSidebar';

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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