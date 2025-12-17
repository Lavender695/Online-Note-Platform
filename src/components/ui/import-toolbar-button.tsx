'use client';

import * as React from 'react';

import type { DropdownMenuSubProps } from '@radix-ui/react-dropdown-menu';

import { MarkdownPlugin } from '@platejs/markdown';
import { ArrowUpToLineIcon } from 'lucide-react';
import { useEditorRef } from 'platejs/react';
import { getEditorDOMFromHtmlString } from 'platejs/static';
import { useFilePicker } from 'use-file-picker';

import {
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu';

import { ToolbarButton } from './toolbar';

type ImportType = 'html' | 'markdown';

export function ImportToolbarButton() {
  const editor = useEditorRef();

  const getFileNodes = (text: string, type: ImportType) => {
    if (type === 'html') {
      const editorNode = getEditorDOMFromHtmlString(text);
      const nodes = editor.api.html.deserialize({
        element: editorNode,
      });

      return nodes;
    }

    if (type === 'markdown') {
      return editor.getApi(MarkdownPlugin).markdown.deserialize(text);
    }

    return [];
  };

  const { openFilePicker: openMdFilePicker } = useFilePicker({
    accept: ['.md', '.mdx'],
    multiple: false,
    onFilesSelected: async ({ plainFiles }) => {
      const text = await plainFiles[0].text();

      const nodes = getFileNodes(text, 'markdown');

      editor.tf.insertNodes(nodes);
    },
  });

  const { openFilePicker: openHtmlFilePicker } = useFilePicker({
    accept: ['text/html'],
    multiple: false,
    onFilesSelected: async ({ plainFiles }) => {
      const text = await plainFiles[0].text();

      const nodes = getFileNodes(text, 'html');

      editor.tf.insertNodes(nodes);
    },
  });

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger className="flex items-center gap-2">
        <ArrowUpToLineIcon className="size-4" />
        <span>Import</span>
      </DropdownMenuSubTrigger>

      <DropdownMenuSubContent>
        <DropdownMenuGroup>
          <DropdownMenuItem
            onSelect={() => {
              openHtmlFilePicker();
            }}
          >
            Import from HTML
          </DropdownMenuItem>

          <DropdownMenuItem
            onSelect={() => {
              openMdFilePicker();
            }}
          >
            Import from Markdown
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}
