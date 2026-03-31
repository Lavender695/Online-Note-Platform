'use client';

import * as React from 'react';

import { type UseChatHelpers, useChat as useBaseChat } from '@ai-sdk/react';
import { AIChatPlugin, aiCommentToRange } from '@platejs/ai/react';
import { getCommentKey, getTransientCommentKey } from '@platejs/comment';
import { deserializeMd } from '@platejs/markdown';
import { BlockSelectionPlugin } from '@platejs/selection/react';
import { type UIMessage, DefaultChatTransport } from 'ai';
import { type TNode, KEYS, nanoid, NodeApi, TextApi } from 'platejs';
import { useEditorRef, usePluginOption } from 'platejs/react';

import { aiChatPlugin } from '@/components/plate-kits/ai-kit';

export type ToolName = 'comment' | 'edit' | 'generate';

export type TComment = {
  comment: {
    blockId: string;
    comment: string;
    content: string;
  } | null;
  status: 'finished' | 'streaming';
};

export type MessageDataPart = {
  toolName: ToolName;
  comment?: TComment;
};

export type Chat = UseChatHelpers<ChatMessage>;

export type ChatMessage = UIMessage<Record<string, never>, MessageDataPart>;

export const useChat = () => {
  const editor = useEditorRef();
  const options = usePluginOption(aiChatPlugin, 'chatOptions');

  // Keep this method for compatibility with existing consumers.
  const _abortFakeStream = () => {};

  const baseChat = useBaseChat<ChatMessage>({
    id: 'editor',
    transport: new DefaultChatTransport({
      api: options.api || '/api/ai/command',
      fetch: async (input, init) => {
        const bodyOptions = editor.getOptions(aiChatPlugin).chatOptions?.body;
        const initBody = JSON.parse(init?.body as string);

        return fetch(input, {
          ...init,
          body: JSON.stringify({
            ...initBody,
            ...bodyOptions,
          }),
        });
      },
    }),
    onData(data) {
      if (data.type === 'data-toolName') {
        editor.setOption(AIChatPlugin, 'toolName', data.data);
      }

      if (data.type === 'data-comment' && data.data) {
        if (data.data.status === 'finished') {
          editor.getApi(BlockSelectionPlugin).blockSelection.deselect();
          return;
        }

        const aiComment = data.data.comment!;
        const range = aiCommentToRange(editor, aiComment);

        if (!range) {
          console.warn('No range found for AI comment');
          return;
        }

        const discussionId = nanoid();

        const newComment = {
          id: nanoid(),
          contentRich: [{ children: [{ text: aiComment.comment }], type: 'p' }],
          createdAt: new Date(),
          discussionId,
          isEdited: false,
          userId: 'default',
        };

        const newDiscussion = {
          id: discussionId,
          comments: [newComment],
          createdAt: new Date(),
          documentContent: deserializeMd(editor, aiComment.content)
            .map((node: TNode) => NodeApi.string(node))
            .join('\n'),
          isResolved: false,
          userId: 'default',
        };

        editor.tf.withMerging(() => {
          editor.tf.setNodes(
            {
              [getCommentKey(newDiscussion.id)]: true,
              [getTransientCommentKey()]: true,
              [KEYS.comment]: true,
            },
            {
              at: range,
              match: TextApi.isText,
              split: true,
            }
          );
        });
      }
    },
    ...options,
  });

  const chat = {
    ...baseChat,
    _abortFakeStream,
  };

  React.useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    editor.setOption(AIChatPlugin, 'chat', chat as any);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chat.status, chat.messages, chat.error]);

  return chat;
};
