import React from 'react'
import Logo from './home/header/logo/Logo'
import Avatar from './home/header/avatar/Avatar'

type Props = {
  className?: string
}

const Header = ({ className }: Props) => {
  return (
    <div className={`flex h-10 items-center  bg-gray-200 ${className}`}>
      <Logo />
      <Avatar />
    </div>
  )
}

export default Header