'use client';

import type { TComment } from '@/components/ui/comment';
import { useEffect } from 'react';
import { createPlatePlugin } from 'platejs/react';
import { useAuth } from '@/hooks/use-auth';

import { BlockDiscussion } from '@/components/ui/block-discussion';

export type TDiscussion = {
  id: string;
  comments: TComment[];
  createdAt: Date;
  isResolved: boolean;
  userId: string;
  documentContent?: string;
};

const discussionsData: TDiscussion[] = [
  {
    id: 'discussion1',
    comments: [
      {
        id: 'comment1',
        contentRich: [
          {
            children: [
              {
                text: 'Comments are a great way to provide feedback and discuss changes.',
              },
            ],
            type: 'p',
          },
        ],
        createdAt: new Date(Date.now() - 600_000),
        discussionId: 'discussion1',
        isEdited: false,
        userId: 'charlie',
      },
      {
        id: 'comment2',
        contentRich: [
          {
            children: [
              {
                text: 'Agreed! The link to the docs makes it easy to learn more.',
              },
            ],
            type: 'p',
          },
        ],
        createdAt: new Date(Date.now() - 500_000),
        discussionId: 'discussion1',
        isEdited: false,
        userId: 'bob',
      },
    ],
    createdAt: new Date(),
    documentContent: 'comments',
    isResolved: false,
    userId: 'charlie',
  },
  {
    id: 'discussion2',
    comments: [
      {
        id: 'comment1',
        contentRich: [
          {
            children: [
              {
                text: 'Nice demonstration of overlapping annotations with both comments and suggestions!',
              },
            ],
            type: 'p',
          },
        ],
        createdAt: new Date(Date.now() - 300_000),
        discussionId: 'discussion2',
        isEdited: false,
        userId: 'bob',
      },
      {
        id: 'comment2',
        contentRich: [
          {
            children: [
              {
                text: 'This helps users understand how powerful the editor can be.',
              },
            ],
            type: 'p',
          },
        ],
        createdAt: new Date(Date.now() - 200_000),
        discussionId: 'discussion2',
        isEdited: false,
        userId: 'charlie',
      },
    ],
    createdAt: new Date(),
    documentContent: 'overlapping',
    isResolved: false,
    userId: 'bob',
  },
];

const avatarUrl = (seed: string) =>
  `https://api.dicebear.com/9.x/glass/svg?seed=${seed}`;

const usersData: Record<
  string,
  { id: string; avatarUrl: string; name: string; hue?: number }
> = {
  alice: {
    id: 'alice',
    avatarUrl: avatarUrl('alice6'),
    name: 'Alice',
  },
  bob: {
    id: 'bob',
    avatarUrl: avatarUrl('bob4'),
    name: 'Bob',
  },
  charlie: {
    id: 'charlie',
    avatarUrl: avatarUrl('charlie2'),
    name: 'Charlie',
  },
};

// This plugin is purely UI. It's only used to store the discussions and users data
export const discussionPlugin = createPlatePlugin({
  key: 'discussion',
  options: {
    currentUserId: 'alice', // 默认值，会被实际登录用户替换
    discussions: discussionsData,
    users: usersData,
  },
})
  .configure({
    render: { aboveNodes: BlockDiscussion },
  })
  .extendSelectors(({ getOption }) => ({
    currentUser: () => getOption('users')[getOption('currentUserId')],
    user: (id: string) => getOption('users')[id],
  }))
  .extend({
    useHooks: ({ editor }) => {
      const { user, loading } = useAuth();

      useEffect(() => {
        if (!loading && user) {
          // 更新当前用户ID为实际登录用户的ID
          editor.setOption(discussionPlugin, 'currentUserId', user.id);
          
          // 如果用户不在用户列表中，添加他们
          const users = editor.getOption(discussionPlugin, 'users') || {};
          if (!users[user.id]) {
            // 使用用户的邮箱前缀作为默认用户名
            const defaultName = user.email ? user.email.split('@')[0] : 'User';
            // 为新用户生成头像
            const avatarUrl = `https://api.dicebear.com/9.x/glass/svg?seed=${user.id}`;
            
            editor.setOption(discussionPlugin, 'users', {
              ...users,
              [user.id]: {
                id: user.id,
                avatarUrl,
                name: defaultName,
              },
            });
          }
        }
      }, [user, loading, editor]);
    },
  });

export const DiscussionKit = [discussionPlugin];
