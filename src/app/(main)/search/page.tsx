'use client';
import React, { useState, useEffect } from 'react';
import { useDebounce } from '@/hooks/use-debounce';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import NoteCard from '@/components/layout/dashboard/NoteCard';
import { useNotes } from '@/hooks/use-notes';

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const { notes, loading, error, searchNotes, searchResults } = useNotes();
  
  // 使用防抖钩子，延迟300ms执行搜索
  const debouncedQuery = useDebounce(searchQuery, 300);

  // 当防抖后的搜索关键词变化时自动触发搜索
  useEffect(() => {
    if (debouncedQuery.trim()) {
      setSearching(true);
      // 使用从useNotes返回的searchNotes函数来更新搜索结果
      searchNotes(debouncedQuery);
      setTimeout(() => setSearching(false), 300);
    } else {
      // 如果搜索关键词为空，清除搜索结果
      searchNotes('');
    }
  }, [debouncedQuery, notes, searchNotes]);

  const handleSearch = () => {
    // 手动搜索时，直接使用当前输入的关键词，不经过防抖
    if (searchQuery.trim()) {
      setSearching(true);
      searchNotes(searchQuery);
      setTimeout(() => setSearching(false), 300); // 添加短暂延迟以显示搜索动画
    }
  };

  const handleClear = () => {
    setSearchQuery('');
    searchNotes('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-48px)]">
        <div className="text-xl text-muted-foreground">加载中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-48px)]">
        <div className="text-xl text-destructive">{error}</div>
      </div>
    );
  }

  return (
    <div className="p-6 min-h-[calc(100vh-48px)] min-w-[calc(100vw-16rem)]">
      <div className="mb-8 max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-foreground">搜索笔记</h1>
        <p className="text-muted-foreground mt-1">搜索您的所有笔记内容</p>
      </div>
      
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex gap-2 max-w-3xl mx-auto">
          <Input
            type="text"
            placeholder="输入搜索关键词..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1 text-lg py-6"
          />
          {searchQuery && (
            <Button
              variant="outline"
              onClick={handleClear}
              className="flex items-center justify-center w-[50px] h-[50px]"
            >
              <X className="h-5 w-5" />
            </Button>
          )}
          <Button
            onClick={handleSearch}
            disabled={searching}
            className="flex items-center gap-2 h-[50px]"
          >
            {searching ? (
              <div className="h-5 w-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
            ) : (
              <Search className="h-5 w-5" />
            )}
            搜索
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        {searchQuery ? (
          searching ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-lg text-muted-foreground">正在搜索...</div>
            </div>
          ) : (
            searchResults.length > 0 ? (
              <div>
                <div className="mb-4">
                  <p className="text-muted-foreground">找到 {searchResults.length} 个相关笔记</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {searchResults.map(note => (
                    <NoteCard key={note.id} note={note} />
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-12">
                <div className="text-xl text-muted-foreground mb-4">未找到匹配的笔记</div>
                <p className="text-muted-foreground text-center mb-4">
                  尝试使用不同的关键词或检查您的拼写
                </p>
                <Button variant="outline" onClick={handleClear}>
                  清除搜索
                </Button>
              </div>
            )
          )
        ) : (
          <div className="flex flex-col items-center justify-center p-12">
            <div className="text-xl text-muted-foreground mb-4">开始搜索</div>
            <p className="text-muted-foreground text-center mb-4">
              输入关键词来搜索您的笔记标题和内容
            </p>
          </div>
        )}
      </div>
    </div>
  );
}