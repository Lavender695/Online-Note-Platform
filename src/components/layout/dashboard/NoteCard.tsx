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

type Props = {
  note: Note
}

const NoteCard = ({ note }: Props) => {
  // Format date for display
  const formattedDate = new Date(note.created_at).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })

  // Extract text from content (remove any HTML tags)
  const plainText = note.content.replace(/<[^>]*>/g, '')

  return (
    <Card className={cn(
      'h-full flex flex-col hover:shadow-xl transition-all duration-300 cursor-pointer',
      'border border-gray-200 hover:border-gray-300 hover:-translate-y-1'
    )}>
      <Link href={`/editor?id=${note.id}`} passHref className="h-full flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold text-gray-900 line-clamp-2">
            {note.title || '无标题笔记'}
          </CardTitle>
          <CardDescription className="text-xs text-gray-500 mt-1">
            {formattedDate}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 py-2">
          <div className="text-sm text-gray-600 line-clamp-4">
            {plainText.substring(0, 120)}{plainText.length > 120 ? '...' : ''}
          </div>
        </CardContent>
        <CardFooter className="pt-2 border-t border-gray-100">
          <span className="text-xs text-blue-500 font-medium hover:underline">
            查看详情 →
          </span>
        </CardFooter>
      </Link>
    </Card>
  )
}

export default NoteCard