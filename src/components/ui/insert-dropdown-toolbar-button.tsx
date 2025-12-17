'use client';

import * as React from 'react';

import type { DropdownMenuProps } from '@radix-ui/react-dropdown-menu';

import {
  ArrowUpToLineIcon,
  ImageIcon,
  FileIcon,
  MusicIcon,
  LinkIcon,
  TableIcon,

  ListPlusIcon,
  IndentIcon,
  OutdentIcon,
  ChevronDownIcon,
  ToggleLeftIcon,
} from 'lucide-react';
import { KEYS } from 'platejs';
import { useEditorRef } from 'platejs/react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { ToolbarButton } from './toolbar';
import { ExportToolbarButton } from './export-toolbar-button';
import { ImportToolbarButton } from './import-toolbar-button';
import { InsertToolbarButton } from './insert-toolbar-button';
import { LineHeightToolbarButton } from './line-height-toolbar-button';
import { LinkToolbarButton } from './link-toolbar-button';
import { MediaToolbarButton } from './media-toolbar-button';
import { TableToolbarButton } from './table-toolbar-button';
import { ToggleToolbarButton } from './toggle-toolbar-button';

import { IndentToolbarButton, OutdentToolbarButton } from './indent-toolbar-button';

export function InsertDropdownToolbarButton(props: DropdownMenuProps) {
  const editor = useEditorRef();
  const [open, setOpen] = React.useState(false);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false} {...props}>
      <DropdownMenuTrigger asChild>
        <ToolbarButton pressed={open} tooltip="More tools">
          <ChevronDownIcon />
        </ToolbarButton>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className="ignore-click-outside/toolbar flex max-h-[500px] min-w-[180px] flex-col overflow-y-auto"
        align="start"
      >
        <DropdownMenuLabel>File Operations</DropdownMenuLabel>
        <DropdownMenuGroup>
          <ImportToolbarButton />
          <ExportToolbarButton />
        </DropdownMenuGroup>

        <DropdownMenuSeparator />
        <DropdownMenuLabel>Insert</DropdownMenuLabel>
        <DropdownMenuGroup>
          <MediaToolbarButton nodeType={KEYS.file} />
        </DropdownMenuGroup>

        <DropdownMenuSeparator />
        <DropdownMenuLabel>Format</DropdownMenuLabel>
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <div className="flex items-center gap-2">
              <ToggleToolbarButton />
              <span>Toggle</span>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <div className="flex items-center gap-2">
              <LinkToolbarButton />
              <span>Link</span>
            </div>
          </DropdownMenuItem>
          <TableToolbarButton />

        </DropdownMenuGroup>

        <DropdownMenuSeparator />
        <DropdownMenuLabel>Layout</DropdownMenuLabel>
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <div className="flex items-center gap-2">
              <OutdentToolbarButton />
              <span>Outdent</span>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <div className="flex items-center gap-2">
              <IndentToolbarButton />
              <span>Indent</span>
            </div>
          </DropdownMenuItem>
          <LineHeightToolbarButton />
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}