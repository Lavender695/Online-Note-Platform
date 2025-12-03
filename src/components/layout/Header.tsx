import React from 'react'
import Logo from './home/header/logo/Logo'
import UserAvatar from './home/header/avatar/Avatar'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { cn } from '@/lib/utils'

type Props = {
  className?: string
}

const Header = ({ className }: Props) => {
  return (
    <div className={cn(
      'fixed top-0 left-0 right-0 z-100 flex h-[40px] items-center justify-between px-4 bg-background border-b border-border shadow-sm transition-all duration-200',
      className
    )}>
      <Logo />
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <UserAvatar />
      </div>
    </div>
  )
}

export default Header