'use client';

import React from 'react';
import { UserProfile } from '@clerk/nextjs';
import { useTheme, type Theme } from '@/hooks/use-theme';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="container mx-auto py-10 px-4 max-w-6xl">
      <h1 className="text-3xl font-bold mb-8">账户设置</h1>
      
      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* 左侧：Clerk 的个人中心面板 */}
        <div className="flex-1 w-full flex justify-center lg:justify-start">
          <UserProfile 
            routing="hash"
            appearance={{
              elements: {
                rootBox: "w-full max-w-full shadow-none",
                card: "w-full shadow-md border rounded-xl m-0",
                navbar: "hidden md:flex", // 响应式优化 Clerk 的内置侧边栏
              }
            }}
          />
        </div>

        {/* 右侧：系统自定义设置（比如主题颜色） */}
        <div className="w-full lg:w-96 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>外观设置</CardTitle>
              <CardDescription>选择您喜欢的主题风格</CardDescription>
            </CardHeader>
            <CardContent>
              <DropdownMenu>
                <DropdownMenuTrigger className="w-full border rounded-md px-3 py-2 text-left hover:bg-accent transition-colors">
                  {theme === 'light' && '浅色主题'}
                  {theme === 'dark' && '深色主题'}
                  {theme === 'blue' && '蓝色主题'}
                  {theme === 'green' && '绿色主题'}
                  {theme === 'purple' && '紫色主题'}
                  {!theme && '选择主题...'}
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-full min-w-[200px]">
                  <DropdownMenuRadioGroup value={theme} onValueChange={(value) => setTheme(value as Theme)}>
                    <DropdownMenuRadioItem value="light">浅色主题</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="dark">深色主题</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="blue">蓝色主题</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="green">绿色主题</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="purple">紫色主题</DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardContent>
          </Card>

        </div>
        
      </div>
    </div>
  );
}