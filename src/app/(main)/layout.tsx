'use client';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/home/AppSidebar';

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        
        <div className="flex flex-1 flex-col overflow-hidden relative">
          <SidebarTrigger className="fixed bottom-5 right-5 z-100 bg-background/80 backdrop-blur-sm shadow-sm border border-border hover:shadow-md transition-shadow" />
          
          <main className="flex-1 w-full h-full overflow-hidden">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}