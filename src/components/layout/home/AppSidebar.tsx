'use client';

import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';
import { Home, FilePlus, Search, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

export function AppSidebar() {
  return (
    <Sidebar className="z-100">
      <SidebarContent className="bg-white border-r border-gray-200">
        <SidebarGroup className="space-y-1 p-2">
          <SidebarGroupLabel className="text-xs font-semibold text-gray-500 uppercase tracking-wider pl-2">Main</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton 
                asChild
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:bg-gray-100 hover:text-gray-900',
                  'data-[state=open]:bg-gray-100 data-[state=open]:text-gray-900'
                )}
              >
                <a href="/dashboard">
                  <Home className="h-4 w-4 text-gray-500" />
                  <span>主页</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton 
                asChild
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:bg-gray-100 hover:text-gray-900',
                  'data-[state=open]:bg-gray-100 data-[state=open]:text-gray-900'
                )}
              >
                <a href="/editor">
                  <FilePlus className="h-4 w-4 text-gray-500" />
                  <span>新建笔记</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton 
                asChild
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:bg-gray-100 hover:text-gray-900',
                  'data-[state=open]:bg-gray-100 data-[state=open]:text-gray-900'
                )}
              >
                <a href="/search">
                  <Search className="h-4 w-4 text-gray-500" />
                  <span>搜索</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton 
                asChild
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:bg-gray-100 hover:text-gray-900',
                  'data-[state=open]:bg-gray-100 data-[state=open]:text-gray-900'
                )}
              >
                <a href="/settings">
                  <Settings className="h-4 w-4 text-gray-500" />
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