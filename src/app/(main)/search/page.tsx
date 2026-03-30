'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { Search, X } from 'lucide-react'

import LazyNoteGrid from '@/components/layout/dashboard/LazyNoteGrid'
import NoteCardSkeleton from '@/components/layout/dashboard/NoteCardSkeleton'
import TagFilterPanel from '@/components/layout/dashboard/TagFilterPanel'
import {
  DASHBOARD_NOTE_CARD_CLASSNAME,
  DASHBOARD_NOTE_GRID_CLASSNAME,
} from '@/components/layout/dashboard/noteCardStyles'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useDebounce } from '@/hooks/use-debounce'
import { useNotes } from '@/hooks/use-notes'

const SEARCH_SKELETON_COUNT = 8

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const { loading, error, searchNotes, searchResults, getAllTags } = useNotes()

  const debouncedQuery = useDebounce(searchQuery, 300)
  const allTags = useMemo(() => getAllTags(), [getAllTags])
  const normalizedQuery = debouncedQuery.trim()
  const hasActiveSearch = normalizedQuery.length > 0 || selectedTags.length > 0
  const isTyping = searchQuery.trim() !== normalizedQuery
  const searchGridKey = useMemo(
    () => searchResults.map((note) => note.id).join('|'),
    [searchResults]
  )

  useEffect(() => {
    if (hasActiveSearch) {
      searchNotes(normalizedQuery, selectedTags)
      return
    }

    searchNotes('')
  }, [hasActiveSearch, normalizedQuery, searchNotes, selectedTags])

  const toggleTagSelection = (tag: string) => {
    setSelectedTags((prev) => {
      if (prev.includes(tag)) {
        return prev.filter((item) => item !== tag)
      }

      return [...prev, tag]
    })
  }

  const clearSelectedTags = () => {
    setSelectedTags([])
  }

  const handleSearch = () => {
    searchNotes(searchQuery.trim(), selectedTags)
  }

  const handleClear = () => {
    setSearchQuery('')
    searchNotes('', selectedTags)
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleSearch()
    }
  }

  if (error) {
    return (
      <div className="flex min-h-[calc(100vh-48px)] items-center justify-center">
        <div className="text-xl text-destructive">{error}</div>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-48px)] bg-background p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">搜索笔记</h1>
          <p className="mt-1 text-muted-foreground">按标题、内容和标签快速找到你要的笔记</p>
        </div>

        <div className="mx-auto mb-8 flex max-w-5xl flex-col gap-6">
          <section className="w-full rounded-2xl border border-border/70 bg-card/80 p-4 shadow-sm backdrop-blur-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="输入关键词搜索标题或内容"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  onKeyDown={handleKeyDown}
                  className="h-12 rounded-xl border-border/70 bg-background pl-12 pr-12 text-base"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <Button onClick={handleSearch} className="h-12 rounded-xl px-5">
                <Search className="mr-2 h-4 w-4" />
                搜索
              </Button>
            </div>

            <div className="mt-3 flex min-h-6 items-center justify-between gap-3 text-sm text-muted-foreground">
              <span>{isTyping ? '正在输入，结果会自动更新…' : '支持关键词与标签组合筛选'}</span>
              {hasActiveSearch && !isTyping && (
                <span>
                  找到 <span className="font-semibold text-foreground">{searchResults.length}</span> 条结果
                </span>
              )}
            </div>
          </section>

          <TagFilterPanel
            className="w-full"
            tags={allTags}
            selectedTags={selectedTags}
            onToggleTag={toggleTagSelection}
            onClear={clearSelectedTags}
          />
        </div>

        {loading ? (
          <div className={DASHBOARD_NOTE_GRID_CLASSNAME}>
            {Array.from({ length: SEARCH_SKELETON_COUNT }).map((_, index) => (
              <NoteCardSkeleton
                key={`search-note-skeleton-${index}`}
                className={DASHBOARD_NOTE_CARD_CLASSNAME}
              />
            ))}
          </div>
        ) : hasActiveSearch ? (
          searchResults.length > 0 ? (
            <LazyNoteGrid key={searchGridKey} notes={searchResults} />
          ) : (
            <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/40 p-12 text-center">
              <div className="mb-4 text-xl text-muted-foreground">没有找到匹配的笔记</div>
              <p className="mb-4 text-muted-foreground">
                {selectedTags.length > 0
                  ? '试试更换关键词，或者减少已选择的标签。'
                  : '试试更换关键词，或者检查一下输入是否完整。'}
              </p>
              <div className="flex gap-2">
                {searchQuery && (
                  <Button variant="outline" onClick={handleClear}>
                    清除搜索
                  </Button>
                )}
                {selectedTags.length > 0 && (
                  <Button variant="outline" onClick={clearSelectedTags}>
                    清除标签
                  </Button>
                )}
              </div>
            </div>
          )
        ) : (
          <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/40 p-12 text-center">
            <div className="mb-4 text-xl text-muted-foreground">开始搜索</div>
            <p className="text-muted-foreground">输入关键词，或者直接点击标签来筛选你的笔记。</p>
          </div>
        )}
      </div>
    </div>
  )
}
