'use client';

import React from 'react';
import { useOthers, useSelf } from '@/lib/liveblocks.config';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export function Collaborators() {
  const others = useOthers();
  const self = useSelf();

  const getInitials = (name: string) => {
    const names = name.split(' ');
    return names.length > 1
      ? `${names[0][0]}${names[1][0]}`.toUpperCase()
      : name.substring(0, 2).toUpperCase();
  };

  const allUsers = React.useMemo(() => {
    const users = others.map((other) => ({
      id: other.connectionId,
      name: other.info?.name || 'Anonymous',
      avatar: other.info?.avatar || '',
    }));

    if (self) {
      users.unshift({
        id: self.connectionId,
        name: self.info?.name || 'You',
        avatar: self.info?.avatar || '',
      });
    }

    return users;
  }, [others, self]);

  if (allUsers.length <= 1) {
    return null;
  }

  return (
    <div className="flex items-center gap-1 px-2">
      <TooltipProvider>
        {allUsers.slice(0, 3).map((user) => (
          <Tooltip key={user.id}>
            <TooltipTrigger asChild>
              <Avatar className="h-8 w-8 border-2 border-white">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="text-xs">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent>
              <p>{user.name}</p>
            </TooltipContent>
          </Tooltip>
        ))}
        {allUsers.length > 3 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-gray-200 text-xs font-medium">
                +{allUsers.length - 3}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div className="space-y-1">
                {allUsers.slice(3).map((user) => (
                  <p key={user.id}>{user.name}</p>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        )}
      </TooltipProvider>
    </div>
  );
}
