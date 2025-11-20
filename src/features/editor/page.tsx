'use client';

import * as React from 'react';
import type { Value } from 'platejs';

import {
  BlockquotePlugin,
  BoldPlugin,
  H1Plugin,
  H2Plugin,
  H3Plugin,
  ItalicPlugin,
  UnderlinePlugin,
} from '@platejs/basic-nodes/react';
import {
  Plate,
  usePlateEditor,
} from 'platejs/react';

import { BlockquoteElement } from '@/components/ui/blockquote-node';
import { Editor, EditorContainer } from '@/components/ui/editor';
import { FixedToolbar } from '@/components/ui/fixed-toolbar';
import { H1Element, H2Element, H3Element } from '@/components/ui/heading-node';
import { MarkToolbarButton } from '@/components/ui/mark-toolbar-button';
import { ToolbarButton } from '@/components/ui/toolbar';

const initialValue: Value = [
  {
    children: [{ text: '标题' }],
    type: 'h3',
  },
  {
    children: [{ text: '这是一段引用。' }],
    type: 'blockquote',
  },
  {
    children: [
      { text: '包含一些' },
      { bold: true, text: '加粗' },
      { text: '文字用于强调！' },
    ],
    type: 'p',
  },
];

export default function MyEditorPage() {
  const editor = usePlateEditor({
    plugins: [
      BoldPlugin,
      ItalicPlugin,
      UnderlinePlugin,
      H1Plugin.withComponent(H1Element),
      H2Plugin.withComponent(H2Element),
      H3Plugin.withComponent(H3Element),
      BlockquotePlugin.withComponent(BlockquoteElement),
    ],
    value: () => {
      if (typeof window !== 'undefined') {
        const savedValue = localStorage.getItem('installation-next-demo');
        if (savedValue) {
          return JSON.parse(savedValue);
        }
      }
      return initialValue;
    },
  });

  // 防止 SSR 渲染编辑器
  if (typeof window === 'undefined') {
    return null;
  }

  return (
    <Plate
      editor={editor}
      onChange={({ value }) => {
        localStorage.setItem('installation-next-demo', JSON.stringify(value));
      }}
    >
      <FixedToolbar className="flex justify-start gap-1 rounded-t-lg">
        <ToolbarButton onClick={() => editor.tf.h1.toggle()}>H1</ToolbarButton>
        <ToolbarButton onClick={() => editor.tf.h2.toggle()}>H2</ToolbarButton>
        <ToolbarButton onClick={() => editor.tf.h3.toggle()}>H3</ToolbarButton>
        <ToolbarButton onClick={() => editor.tf.blockquote.toggle()}>引用</ToolbarButton>
        <MarkToolbarButton nodeType="bold" tooltip="加粗 (⌘+B)">B</MarkToolbarButton>
        <MarkToolbarButton nodeType="italic" tooltip="斜体 (⌘+I)">I</MarkToolbarButton>
        <MarkToolbarButton nodeType="underline" tooltip="下划线 (⌘+U)">U</MarkToolbarButton>
        <div className="flex-1" />
        <ToolbarButton
          className="px-2"
          onClick={() => editor.tf.setValue(initialValue)}
        >
          重置
        </ToolbarButton>
      </FixedToolbar>
      <EditorContainer>
        <Editor placeholder="输入您精彩的内容..." />
      </EditorContainer>
    </Plate>
  );
}
