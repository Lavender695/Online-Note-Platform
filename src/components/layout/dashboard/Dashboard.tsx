'use client';
import React, { useState, useEffect } from 'react'
import NoteCard from './NoteCard'
import { useNotes } from '@/hooks/use-notes'
import { useAuth } from '@/hooks/use-auth'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Trash2, Edit, X } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'

type Props = {}

const Dashboard = (props: Props) => {
  const { notes, loading: notesLoading, error, deleteNotes, getAllTags } = useNotes()
  const { user } = useAuth()
  const [isEditMode, setIsEditMode] = useState(false)
  const [selectedNotes, setSelectedNotes] = useState<string[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [allTags, setAllTags] = useState<string[]>([])
  const [greeting, setGreeting] = useState('')
  const [userName, setUserName] = useState('')
  const [loading, setLoading] = useState(true)

  // 获取所有标签
  React.useEffect(() => {
    const tags = getAllTags()
    setAllTags(tags)
    console.log('Dashboard获取的所有标签:', tags)
  }, [notes, getAllTags])

  // 获取用户昵称和设置问候语
  useEffect(() => {
    const fetchUserName = async () => {
      if (user) {
        const { data } = await supabase.from('users').select('name').eq('id', user.id).single();
        if (data?.name) {
          setUserName(data.name);
        }
      }
      setLoading(false);
    };

    // 设置问候语
    const setGreetingBasedOnTime = () => {
      const hour = new Date().getHours();
      if (hour >= 5 && hour < 12) {
        setGreeting('早上好');
      } else if (hour >= 12 && hour < 18) {
        setGreeting('下午好');
      } else {
        setGreeting('晚上好');
      }
    };

    fetchUserName();
    setGreetingBasedOnTime();
  }, [user]);

  // 筛选后的笔记
  const filteredNotes = selectedTags.length === 0
    ? notes
    : notes.filter(note => 
        note.tags && selectedTags.every(tag => note.tags.includes(tag))
      )

  // 切换标签选择
  const toggleTagSelection = (tag: string) => {
    setSelectedTags(prev => {
      if (prev.includes(tag)) {
        return prev.filter(t => t !== tag)
      } else {
        return [...prev, tag]
      }
    })
  }

  // 清除所有选中标签
  const clearSelectedTags = () => {
    setSelectedTags([])
  }

  // 获取用户昵称和设置问候语
  useEffect(() => {
    const fetchUserName = async () => {
      if (user) {
        const { data } = await supabase.from('users').select('name').eq('id', user.id).single();
        if (data?.name) {
          setUserName(data.name);
        }
      }
      setLoading(false);
    };

    // 设置问候语
    const setGreetingBasedOnTime = () => {
      const hour = new Date().getHours();
      if (hour >= 5 && hour < 12) {
        setGreeting('早上好');
      } else if (hour >= 12 && hour < 18) {
        setGreeting('下午好');
      } else {
        setGreeting('晚上好');
      }
    };

    fetchUserName();
    setGreetingBasedOnTime();
  }, [user]);

  if (loading || notesLoading) {
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
          <h1 className="text-3xl font-bold text-foreground">
            {greeting}{userName && `，${userName}`}
          </h1>
          <p className="text-muted-foreground mt-1">这是您的所有笔记</p>
        </div>
        
        {/* 标签筛选 */}
        <div className="mt-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium">标签筛选:</span>
            {selectedTags.length > 0 && (
              <Button 
                variant="ghost"
                size="sm"
                onClick={clearSelectedTags}
                className="h-7 px-2"
              >
                清除筛选
              </Button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {allTags.length > 0 ? (
              allTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => toggleTagSelection(tag)}
                  className={cn(
                    'px-3 py-1 text-sm rounded-full transition-all duration-200',
                    selectedTags.includes(tag)
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  )}
                >
                  {tag}
                </button>
              ))
            ) : (
              <span className="text-sm text-muted-foreground">暂无标签</span>
            )}
          </div>
        </div>

        {/* 编辑模式按钮 */}
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
      
      {filteredNotes.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredNotes.map(note => (
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
          <div className="text-xl text-muted-foreground mb-4">
            {selectedTags.length > 0 ? '没有匹配筛选条件的笔记' : '暂无笔记'}
          </div>
          {selectedTags.length > 0 ? (
            <Button 
              variant="outline"
              onClick={clearSelectedTags}
              className="mt-2"
            >
              清除筛选
            </Button>
          ) : (
            <a href="/editor" className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
              创建第一个笔记
            </a>
          )}
        </div>
      )}
    </div>
  )
}

export default Dashboard