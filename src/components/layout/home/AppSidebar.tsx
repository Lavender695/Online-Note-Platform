'use client';

import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';
import { Home, FilePlus, Search, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNotes } from '@/hooks/use-notes';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function AppSidebar() {
  const { createNote } = useNotes();
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);

  const handleNewNote = async (e: React.MouseEvent) => {
    e.preventDefault();
    
    try {
      setIsCreating(true);
      // 清空本地存储的new_note记录，避免显示历史内容
      localStorage.removeItem('new_note');
      // 创建空笔记
      const newNote = await createNote('未命名笔记', JSON.stringify([]));
      if (newNote?.id) {
        // 使用页面刷新代替客户端导航，确保获取最新的笔记数据
        window.location.href = `/editor?id=${newNote.id}`;
      }
    } catch (error) {
      console.error('创建笔记失败:', error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Sidebar className="z-100">
      <SidebarContent className="bg-sidebar border-r border-sidebar-border">
        <SidebarGroup className="space-y-1 p-2">
          <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-2">Main</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton 
                asChild
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                  'data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground'
                )}
              >
                <a href="/dashboard">
                  <Home className="h-4 w-4 text-muted-foreground" />
                  <span>主页</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton 
                onClick={handleNewNote}
                disabled={isCreating}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground cursor-pointer',
                  'data-[state=open]:bg-gray-100 data-[state=open]:text-gray-900',
                  isCreating && 'opacity-50 cursor-not-allowed'
                )}
              >
                <FilePlus className="h-4 w-4 text-muted-foreground" />
                <span>{isCreating ? '创建中...' : '新建笔记'}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton 
                asChild
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                  'data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground'
                )}
              >
                <a href="/search">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <span>搜索</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton 
                asChild
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                  'data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground'
                )}
              >
                <a href="/settings">
                  <Settings className="h-4 w-4 text-muted-foreground" />
                  <span>设置</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}