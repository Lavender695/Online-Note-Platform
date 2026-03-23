'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home, 
  Search, 
  Settings, 
  FileText, 
  PlusCircle, 
  Star 
} from 'lucide-react';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';

import UserAvatar from '@/components/layout/home/header/avatar/Avatar';
import { ThemeToggle } from '@/components/ui/theme-toggle';

const items = [
  { title: "主页", url: "/dashboard", icon: Home },
  { title: "搜索", url: "/search", icon: Search },
  { title: "设置", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar variant="inset">
      {/* 顶部：应用名称和 Logo */}
      <SidebarHeader className="border-b border-sidebar-border h-[60px] flex items-center justify-center px-4">
        <div className="flex items-center gap-2 w-full overflow-hidden">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shrink-0">
            <Star className="h-5 w-5" />
          </div>
          <span className="font-semibold text-lg truncate tracking-tight">
            寻星手札
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* 主要导航菜单 */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={pathname === item.url}
                    tooltip={item.title}
                  >
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* 快捷操作区 */}
        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="新建笔记">
                  <Link href="/editor">
                    <PlusCircle />
                    <span>新建笔记</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* 底部：用户信息和主题切换 */}
      <SidebarFooter className="border-t border-sidebar-border p-4">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2 overflow-hidden">
            <UserAvatar />
          </div>
          <ThemeToggle />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}