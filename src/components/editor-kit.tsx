'use client';

import { type Value, TrailingBlockPlugin } from 'platejs';
import { type TPlateEditor, useEditorRef } from 'platejs/react';

import { AIKit } from '@/components/plate-kits/ai-kit';
import { AlignKit } from '@/components/plate-kits/align-kit';
import { AutoformatKit } from '@/components/plate-kits/autoformat-kit';
import { BasicBlocksKit } from '@/components/plate-kits/basic-blocks-kit';
import { BasicMarksKit } from '@/components/plate-kits/basic-marks-kit';
import { BlockMenuKit } from '@/components/plate-kits/block-menu-kit';
import { BlockPlaceholderKit } from '@/components/plate-kits/block-placeholder-kit';
import { CalloutKit } from '@/components/plate-kits/callout-kit';
import { CodeBlockKit } from '@/components/plate-kits/code-block-kit';
import { ColumnKit } from '@/components/plate-kits/column-kit';

import { CopilotKit } from '@/components/plate-kits/copilot-kit';
import { CursorOverlayKit } from '@/components/plate-kits/cursor-overlay-kit';
import { DateKit } from '@/components/plate-kits/date-kit';
import { DndKit } from '@/components/plate-kits/dnd-kit';
import { DocxKit } from '@/components/plate-kits/docx-kit';
import { EmojiKit } from '@/components/plate-kits/emoji-kit';
import { ExitBreakKit } from '@/components/plate-kits/exit-break-kit';
import { FixedToolbarKit } from '@/components/plate-kits/fixed-toolbar-kit';
import { FloatingToolbarKit } from '@/components/plate-kits/floating-toolbar-kit';
import { FontKit } from '@/components/plate-kits/font-kit';
import { LineHeightKit } from '@/components/plate-kits/line-height-kit';
import { LinkKit } from '@/components/plate-kits/link-kit';
import { ListKit } from '@/components/plate-kits/list-kit';
import { MarkdownKit } from '@/components/plate-kits/markdown-kit';
import { MathKit } from '@/components/plate-kits/math-kit';
import { MediaKit } from '@/components/plate-kits/media-kit';
import { MentionKit } from '@/components/plate-kits/mention-kit';
import { SlashKit } from '@/components/plate-kits/slash-kit';
import { TableKit } from '@/components/plate-kits/table-kit';
import { TocKit } from '@/components/plate-kits/toc-kit';
import { ToggleKit } from '@/components/plate-kits/toggle-kit';

export const EditorKit = [
  ...CopilotKit,

  // Elements
  ...BasicBlocksKit,
  ...CodeBlockKit,
  ...TableKit,
  ...ToggleKit,
  ...TocKit,
  ...MediaKit,
  ...CalloutKit,
  ...ColumnKit,
  ...MathKit,
  ...DateKit,
  ...LinkKit,
  ...MentionKit,

  // Marks
  ...BasicMarksKit,
  ...FontKit,

  // Block Style
  ...ListKit,
  ...AlignKit,
  ...LineHeightKit,

  // Collaboration

  // Editing
  ...SlashKit,
  ...AutoformatKit,
  ...CursorOverlayKit,
  ...BlockMenuKit,
  ...DndKit,
  ...EmojiKit,
  ...ExitBreakKit,
  TrailingBlockPlugin,

  // Parsers
  ...DocxKit,
  ...MarkdownKit,

  // UI
  // ...BlockPlaceholderKit,
  ...FixedToolbarKit,
  ...FloatingToolbarKit,
];

export type MyEditor = TPlateEditor<Value, (typeof EditorKit)[number]>;

export const useEditor = () => useEditorRef<MyEditor>();
