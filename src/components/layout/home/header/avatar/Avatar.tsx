'use client';

import React from 'react';
import { useAuth } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ClerkProvider, Show, SignInButton, SignUpButton, UserButton } from '@clerk/nextjs'


export default function UserAvatar() {
  const { isLoaded, userId } = useAuth();

      return (

        <header className="flex justify-end items-center p-4 gap-4 h-16">
            <Show when="signed-out">
              <SignUpButton>
                <button className="bg-primary text-primary-foreground rounded-lg font-medium text-sm sm:text-base h-10 sm:h-10 px-4 sm:px-4 cursor-pointer">
                  登录
                </button>
              </SignUpButton>
            </Show>
            <Show when="signed-in">
              <UserButton />
            </Show>
          </header>
          )
}