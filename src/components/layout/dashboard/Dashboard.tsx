'use client';
import React, { useState } from 'react'
import NoteCard from './NoteCard'
import { useNotes } from '@/hooks/use-notes'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Trash2, Edit, X } from 'lucide-react'
import { toast } from 'sonner'

type Props = {}

const Dashboard = (props: Props) => {
  const { notes, loading, error, deleteNotes } = useNotes()
  const [isEditMode, setIsEditMode] = useState(false)
  const [selectedNotes, setSelectedNotes] = useState<string[]>([])

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

  const toggleNoteSelection = (noteId: string) => {
    setSelectedNotes(prev => {
      if (prev.includes(noteId)) {
        return prev.filter(id => id !== noteId)
      } else {
        return [...prev, noteId]
      }
    })
  }

  const handleDeleteSelected = async () => {
    if (selectedNotes.length === 0) return

    try {
      await deleteNotes(selectedNotes)
      toast.success(`成功删除 ${selectedNotes.length} 个笔记`)
      setSelectedNotes([])
      setIsEditMode(false)
    } catch (error: any) {
      toast.error('删除失败: ' + error.message)
    }
  }

  const exitEditMode = () => {
    setIsEditMode(false)
    setSelectedNotes([])
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex-col justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">我的笔记</h1>
          <p className="text-muted-foreground mt-1">查看和管理您的所有笔记</p>
        </div>
        
        {isEditMode ? (
          <div className="flex gap-2">
            <Button 
              variant="outline"
              onClick={exitEditMode}
              className="flex items-center gap-2 mt-5"
            >
              <X className="h-4 w-4" />
              取消
            </Button>
            <Button 
              variant="destructive"
              onClick={handleDeleteSelected}
              disabled={selectedNotes.length === 0}
              className="flex items-center gap-2 mt-5"
            >
              <Trash2 className="h-4 w-4" />
              删除 ({selectedNotes.length})
            </Button>
          </div>
        ) : (
          <Button 
            variant="outline"
            onClick={() => setIsEditMode(true)}
            className="flex items-center gap-2 mt-5"
          >
            <Edit className="h-4 w-4" />
            编辑笔记
          </Button>
        )}
      </div>
      
      {notes.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {notes.map(note => (
            <NoteCard 
              key={note.id} 
              note={note} 
              isSelected={isEditMode && selectedNotes.includes(note.id)}
              onSelect={toggleNoteSelection}
              isEditMode={isEditMode}
            />
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