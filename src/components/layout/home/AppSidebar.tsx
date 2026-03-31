'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Home, 
  Search, 
  Settings, 
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
import { useUser } from '@clerk/nextjs';
import { clearEditorDraft, extractTitleFromDraftContent, readEditorDraft } from '@/lib/editor-draft';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

import UserAvatar from '@/components/layout/home/header/avatar/Avatar';
import { ThemeToggle } from '@/components/ui/theme-toggle';

const items = [
  { title: "主页", url: "/dashboard", icon: Home },
  { title: "搜索", url: "/search", icon: Search },
  { title: "设置", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useUser();
  const [showDraftDialog, setShowDraftDialog] = React.useState(false);

  const toUserStorageKey = (userId: string) => `notes_${userId}`;

  const saveDraftToUserNotes = () => {
    const draft = readEditorDraft();
    if (!draft || !Array.isArray(draft.content) || !user?.id) {
      clearEditorDraft();
      return;
    }

    if (draft.userId !== user.id) {
      clearEditorDraft();
      return;
    }

    const now = new Date().toISOString();
    const storageKey = toUserStorageKey(user.id);
    const raw = localStorage.getItem(storageKey);
    let existingNotes: Array<Record<string, unknown>> = [];

    if (raw) {
      try {
        existingNotes = JSON.parse(raw) as Array<Record<string, unknown>>;
      } catch {
        existingNotes = [];
      }
    }

    const targetId = draft.noteId ?? crypto.randomUUID();
    const title = extractTitleFromDraftContent(draft.content);
    const noteIndex = existingNotes.findIndex((item) => item.id === targetId);

    if (noteIndex >= 0) {
      const prev = existingNotes[noteIndex];
      existingNotes[noteIndex] = {
        ...prev,
        id: targetId,
        user_id: user.id,
        title,
        content: JSON.stringify(draft.content),
        tags: Array.isArray(draft.tags) ? draft.tags : [],
        updated_at: now,
      };
    } else {
      existingNotes.unshift({
        id: targetId,
        user_id: user.id,
        title,
        content: JSON.stringify(draft.content),
        tags: Array.isArray(draft.tags) ? draft.tags : [],
        created_at: now,
        updated_at: now,
      });
    }

    existingNotes.sort((a, b) => {
      const aTime = new Date(String(a.updated_at ?? a.created_at ?? 0)).getTime();
      const bTime = new Date(String(b.updated_at ?? b.created_at ?? 0)).getTime();
      return bTime - aTime;
    });

    localStorage.setItem(storageKey, JSON.stringify(existingNotes));
    clearEditorDraft();
  };

  const handleNewNoteClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    window.dispatchEvent(new Event('editor:flush-draft'));

    const draft = readEditorDraft();
    const hasDraft =
      !!draft &&
      Array.isArray(draft.content) &&
      draft.content.length > 0 &&
      draft.userId === (user?.id ?? null);

    if (!hasDraft) {
      clearEditorDraft();
      router.push('/editor');
      return;
    }

    setShowDraftDialog(true);
  };

  const handleSaveAndCreate = () => {
    saveDraftToUserNotes();
    setShowDraftDialog(false);
    router.push('/editor');
  };

  const handleDiscardAndCreate = () => {
    clearEditorDraft();
    setShowDraftDialog(false);
    router.push('/editor');
  };

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
                  <Link href="/editor" onClick={handleNewNoteClick}>
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

      <Dialog open={showDraftDialog} onOpenChange={setShowDraftDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>检测到正在编辑的草稿</DialogTitle>
            <DialogDescription>
              你正在编辑的内容尚未处理。新建笔记前，选择保存当前编辑或直接丢弃。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowDraftDialog(false)}>
              取消
            </Button>
            <Button variant="outline" onClick={handleDiscardAndCreate}>
              丢弃并新建
            </Button>
            <Button onClick={handleSaveAndCreate}>
              保存并新建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Sidebar>
  );
}