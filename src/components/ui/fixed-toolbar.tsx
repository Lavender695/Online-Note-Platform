'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Toolbar } from './toolbar';

export function FixedToolbar({ className, ...props }: React.ComponentProps<typeof Toolbar>) {
  const [isSidebarExpanded, setIsSidebarExpanded] = React.useState(false);

  React.useEffect(() => {
    const checkSidebarState = () => {
      const isExpanded = document.body.classList.contains('sidebar-expanded');
      setIsSidebarExpanded(isExpanded);
    };

    // 初始检查
    checkSidebarState();

    // 监听body类的变化
    const observer = new MutationObserver(checkSidebarState);
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <Toolbar
      {...props}
      className={cn(
        'fixed top-[95px] z-10 justify-between overflow-x-auto rounded-t-lg border-b border-b-border bg-background/95 p-1 backdrop-blur-sm supports-backdrop-blur:bg-background/60',
        'scrollbar-thin scrollbar-hide',
        '[&::-webkit-scrollbar]:hidden',
        isSidebarExpanded 
          ? 'left-[16rem] right-0 w-[calc(100%-16rem)]' 
          : 'left-[0rem] right-0 w-[calc(100%-0rem)]',
        className
      )}
    />
  );
}
