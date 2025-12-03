'use client';
import React from 'react'
import NoteCard from './NoteCard'
import { useNotes } from '@/hooks/use-notes'
import { cn } from '@/lib/utils'

type Props = {}

const Dashboard = (props: Props) => {
  const { notes, loading, error } = useNotes()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-48px)]">
        <div className="text-xl text-muted-foreground">加载中...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-48px)]">
        <div className="text-xl text-destructive">{error}</div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">我的笔记</h1>
        <p className="text-muted-foreground mt-1">查看和管理您的所有笔记</p>
      </div>
      
      {notes.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {notes.map(note => (
            <NoteCard key={note.id} note={note} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-12 bg-muted rounded-lg border border-dashed border-border">
          <div className="text-xl text-muted-foreground mb-4">暂无笔记</div>
          <a href="/editor" className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
            创建第一个笔记
          </a>
        </div>
      )}
    </div>
  )
}

export default Dashboard