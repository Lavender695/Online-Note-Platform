import React from 'react'
import Logo from './home/header/logo/Logo'
import Avatar from './home/header/avatar/Avatar'
import { cn } from '@/lib/utils'

type Props = {
  className?: string
}

const Header = ({ className }: Props) => {
  return (
    <div className={cn(
      'fixed top-0 left-0 right-0 z-100 flex h-[40px] items-center justify-between px-4 bg-white border-b border-gray-200 shadow-sm transition-all duration-200',
      className
    )}>
      <Logo />
      <Avatar />
    </div>
  )
}

export default Header