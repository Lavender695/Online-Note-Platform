import React from 'react'
import Link from 'next/link'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Note } from '@/types/note'
import { cn } from '@/lib/utils'
import { normalizeNodeId } from 'platejs'

type Props = {
  note: Note
  isSelected?: boolean
  onSelect?: (id: string) => void
  isEditMode?: boolean
  className?: string
}

const NoteCard = ({ note, isSelected = false, onSelect, isEditMode = false, className }: Props) => {
  const syncStateConfig = {
    local: { label: '仅本地', className: 'bg-slate-100 text-slate-700' },
    dirty: { label: '待同步', className: 'bg-amber-100 text-amber-700' },
    synced: { label: '已同步', className: 'bg-emerald-100 text-emerald-700' },
  } as const

  const syncState = syncStateConfig[note.syncState]

  // Format date for display
  const formattedDate = new Date(note.created_at).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })

  const plainText = note.content
    ? normalizeNodeId(JSON.parse(note.content))
        .map((node: { children?: Array<{ text?: string }> }) => node.children?.[0]?.text ?? '')
        .join(' ')
    : ''
  return (
    <Card className={cn(
      'relative h-full flex flex-col hover:shadow-xl transition-all duration-300 cursor-pointer',
      'border border-border hover:border-border hover:-translate-y-1',
      isSelected && 'border-primary bg-primary/10',
      className
    )}>
      {isEditMode && (
        <div 
          className={cn(
            'absolute top-2 right-2 h-5 w-5 rounded-full border-2 cursor-pointer flex items-center justify-center',
            isSelected 
              ? 'border-primary bg-primary text-white' 
              : 'border-muted-foreground bg-background'
          )}
          onClick={(e) => {
            e.stopPropagation()
            if (onSelect) onSelect(note.id)
          }}
        >
          {isSelected && <div className="h-2 w-2 rounded-full bg-white" />}
        </div>
      )}
      <Link 
        href={`/editor?id=${note.id}`} 
        passHref 
        className="h-full flex flex-col"
        onClick={(e) => {
          if (isEditMode) {
            e.preventDefault()
            if (onSelect) onSelect(note.id)
          }
        }}
      >
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold text-foreground line-clamp-2">
            {note.title || '无标题笔记'}
          </CardTitle>
          <div className="mt-1 flex items-center justify-between gap-2">
            <CardDescription className="text-xs text-muted-foreground">
              {formattedDate}
            </CardDescription>
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-[11px] font-medium leading-none',
                syncState.className
              )}
            >
              {syncState.label}
            </span>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden py-2">
          <div className="text-sm text-muted-foreground line-clamp-4">
            {plainText.substring(0, 120)}{plainText.length > 120 ? '...' : ''}
          </div>
          {note.tags && note.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {note.tags.map((tag) => (
                <span
                  key={tag}
                  className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </CardContent>
        <CardFooter className="pt-2 border-t border-border">
          <span className="text-xs text-primary font-medium hover:underline">
            查看详情 →
          </span>
        </CardFooter>
      </Link>
    </Card>
  )
}

export default NoteCard
