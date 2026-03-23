'use client';

import React from 'react';
import { useAuth, UserButton } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function UserAvatar() {
  const { isLoaded, userId } = useAuth();

  // 如果还没加载完，或者没有登录，显示登录按钮
  if (!isLoaded || !userId) {
    return (
      <Button asChild variant="default" className="h-8">
        <Link href="/sign-in">登录</Link>
      </Button>
    );
  }

  // 如果已经登录，直接使用 Clerk 提供的开箱即用的用户头像组件
  return (
    <UserButton 
      appearance={{
        elements: {
          avatarBox: "h-8 w-8", // 保持你原来的尺寸
        }
      }}
    />
  );
}