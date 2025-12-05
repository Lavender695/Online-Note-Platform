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
}

const NoteCard = ({ note, isSelected = false, onSelect, isEditMode = false }: Props) => {
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
        .map((node: any) => {
          if (node.children[0].text) return node.children[0].text
          return ''
        })
        .join(' ')
    : ''
  return (
    <Card className={cn(
      'h-full flex flex-col hover:shadow-xl transition-all duration-300 cursor-pointer',
      'border border-border hover:border-border hover:-translate-y-1',
      isSelected && 'border-primary bg-primary/10'
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
          <CardDescription className="text-xs text-muted-foreground mt-1">
            {formattedDate}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 py-2">
          <div className="text-sm text-muted-foreground line-clamp-4">
            {plainText.substring(0, 120)}{plainText.length > 120 ? '...' : ''}
          </div>
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