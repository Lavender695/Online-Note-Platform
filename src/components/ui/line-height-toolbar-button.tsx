'use client';

import * as React from 'react';

import type { DropdownMenuSubProps } from '@radix-ui/react-dropdown-menu';

import { LineHeightPlugin } from '@platejs/basic-styles/react';
import { DropdownMenuItemIndicator } from '@radix-ui/react-dropdown-menu';
import { CheckIcon, WrapText } from 'lucide-react';
import { useEditorRef, useSelectionFragmentProp } from 'platejs/react';

import {
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu';

import { ToolbarButton } from './toolbar';

export function LineHeightToolbarButton(props: DropdownMenuSubProps) {
  const editor = useEditorRef();
  const { defaultNodeValue, validNodeValues: values = [] } =
    editor.getInjectProps(LineHeightPlugin);

  const value = useSelectionFragmentProp({
    defaultValue: defaultNodeValue,
    getProp: (node) => node.lineHeight,
  });

  return (
    <DropdownMenuSub {...props}>
      <DropdownMenuSubTrigger className="flex items-center gap-2">
        <WrapText className="size-4" />
        <span>Line Height</span>
      </DropdownMenuSubTrigger>

      <DropdownMenuSubContent className="min-w-0">
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(newValue) => {
            editor
              .getTransforms(LineHeightPlugin)
              .lineHeight.setNodes(Number(newValue));
            editor.tf.focus();
          }}
        >
          {values.map((value) => (
            <DropdownMenuRadioItem
              key={value}
              className="min-w-[180px] pl-2 *:first:[span]:hidden"
              value={value}
            >
              <span className="pointer-events-none absolute right-2 flex size-3.5 items-center justify-center">
                <DropdownMenuItemIndicator>
                  <CheckIcon />
                </DropdownMenuItemIndicator>
              </span>
              {value}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}
