'use client'

import React, { useMemo, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { Edit, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { useNotes } from '@/hooks/use-notes'
import { cn } from '@/lib/utils'

import LazyNoteGrid from './LazyNoteGrid'
import NoteCardSkeleton from './NoteCardSkeleton'
import TagFilterPanel from './TagFilterPanel'
import {
  DASHBOARD_NOTE_CARD_CLASSNAME,
  DASHBOARD_NOTE_GRID_CLASSNAME,
} from './noteCardStyles'

const SKELETON_COUNT = 8

const Dashboard = () => {
  const { notes, loading: notesLoading, error, deleteNotes, getAllTags } = useNotes()
  const { user, isLoaded } = useUser()
  const [isEditMode, setIsEditMode] = useState(false)
  const [selectedNotes, setSelectedNotes] = useState<string[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])

  const allTags = useMemo(() => getAllTags(), [getAllTags])
  const greeting = useMemo(() => {
    const hour = new Date().getHours()

    if (hour >= 5 && hour < 12) {
      return '早上好'
    }

    if (hour >= 12 && hour < 18) {
      return '下午好'
    }

    return '晚上好'
  }, [])

  const filteredNotes = useMemo(() => {
    if (selectedTags.length === 0) {
      return notes
    }

    return notes.filter(
      (note) => note.tags && selectedTags.every((tag) => note.tags.includes(tag))
    )
  }, [notes, selectedTags])

  const notesGridKey = useMemo(
    () => filteredNotes.map((note) => note.id).join('|'),
    [filteredNotes]
  )

  const getDisplayName = () => {
    if (!user) return ''

    return (
      user.fullName ||
      user.username ||
      user.primaryEmailAddress?.emailAddress.split('@')[0] ||
      '探索者'
    )
  }

  const toggleTagSelection = (tag: string) => {
    setSelectedTags((prev) => {
      if (prev.includes(tag)) {
        return prev.filter((item) => item !== tag)
      }

      return [...prev, tag]
    })
  }

  const clearSelectedTags = () => setSelectedTags([])

  const toggleNoteSelection = (noteId: string) => {
    setSelectedNotes((prev) => {
      if (prev.includes(noteId)) {
        return prev.filter((id) => id !== noteId)
      }

      return [...prev, noteId]
    })
  }

  const handleDeleteSelected = async () => {
    if (selectedNotes.length === 0) return

    try {
      await deleteNotes(selectedNotes)
      toast.success(`成功删除 ${selectedNotes.length} 条笔记`)
      setSelectedNotes([])
      setIsEditMode(false)
    } catch (deleteError: unknown) {
      const message = deleteError instanceof Error ? deleteError.message : '未知错误'
      toast.error('删除失败: ' + message)
    }
  }

  const exitEditMode = () => {
    setIsEditMode(false)
    setSelectedNotes([])
  }

  if (error) {
    return (
      <div className="flex min-h-[calc(100vh-48px)] items-center justify-center">
        <div className="text-xl text-destructive">{error}</div>
      </div>
    )
  }

  const showLoadingState = !isLoaded || notesLoading

  return (
    <div className="h-full bg-background p-6">
      <div className="mx-auto mb-6 flex max-w-5xl flex-col items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {greeting ? `${greeting}，${getDisplayName()}` : getDisplayName()}
          </h1>
          <p className="mt-1 text-muted-foreground">这是您的所有笔记</p>
        </div>

        <TagFilterPanel
          className="mt-4"
          tags={allTags}
          selectedTags={selectedTags}
          onToggleTag={toggleTagSelection}
          onClear={clearSelectedTags}
        />

        {isEditMode ? (
          <div className="mt-5 flex gap-2">
            <Button variant="outline" onClick={exitEditMode} className="flex items-center gap-2">
              <X className="h-4 w-4" />
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteSelected}
              disabled={selectedNotes.length === 0}
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              删除 ({selectedNotes.length})
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            onClick={() => setIsEditMode(true)}
            className="mt-5 flex items-center gap-2"
          >
            <Edit className="h-4 w-4" />
            编辑笔记
          </Button>
        )}
      </div>

      {showLoadingState ? (
        <div className={cn('mx-auto max-w-7xl', DASHBOARD_NOTE_GRID_CLASSNAME)}>
          {Array.from({ length: SKELETON_COUNT }).map((_, index) => (
            <NoteCardSkeleton
              key={`dashboard-note-skeleton-${index}`}
              className={DASHBOARD_NOTE_CARD_CLASSNAME}
            />
          ))}
        </div>
      ) : filteredNotes.length > 0 ? (
        <div className="mx-auto max-w-7xl">
          <LazyNoteGrid
            key={notesGridKey}
            notes={filteredNotes}
            isEditMode={isEditMode}
            selectedNotes={selectedNotes}
            onSelect={toggleNoteSelection}
          />
        </div>
      ) : (
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted p-12">
          <div className="mb-4 text-xl text-muted-foreground">
            {selectedTags.length > 0 ? '没有匹配筛选条件的笔记' : '暂无笔记'}
          </div>
          {selectedTags.length > 0 ? (
            <Button variant="outline" onClick={clearSelectedTags} className="mt-2">
              清除筛选
            </Button>
          ) : (
            <a
              href="/editor"
              className="rounded-lg bg-primary px-4 py-2 text-primary-foreground transition-colors hover:bg-primary/90"
            >
              创建第一条笔记
            </a>
          )}
        </div>
      )}
    </div>
  )
}

export default Dashboard
