'use client';

import * as React from 'react';
import { Sparkles, FileText, Loader2, X } from 'lucide-react';
import { useAI } from '@/hooks/use-ai';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export interface AIToolbarProps {
  /**
   * 当前编辑器中的内容
   */
  content: string;
  
  /**
   * 当 AI 生成结果时的回调
   * @param result - AI 生成的结果
   * @param mode - 使用的 AI 模式
   */
  onResult?: (result: string, mode: 'summary' | 'completion') => void;
  
  /**
   * 工具栏的位置样式
   */
  className?: string;
}

/**
 * AI 工具栏组件
 * 
 * 提供 AI 辅助功能的工具栏，包括智能续写和生成摘要功能
 * 
 * @example
 * ```tsx
 * <AIToolbar
 *   content={editorContent}
 *   onResult={(result, mode) => {
 *     if (mode === 'completion') {
 *       // 将续写内容插入到编辑器
 *       insertText(result);
 *     } else if (mode === 'summary') {
 *       // 显示摘要
 *       showSummary(result);
 *     }
 *   }}
 * />
 * ```
 */
export function AIToolbar({ content, onResult, className = '' }: AIToolbarProps) {
  const { generateSummary, complete, isLoading, error, cancel } = useAI();
  const [result, setResult] = React.useState<string | null>(null);
  const [currentMode, setCurrentMode] = React.useState<'summary' | 'completion' | null>(null);

  // 处理 AI 续写
  const handleCompletion = React.useCallback(async () => {
    if (!content || content.trim() === '') {
      toast.error('请先输入一些内容');
      return;
    }

    setCurrentMode('completion');
    setResult(null);

    const aiResult = await complete(content);
    
    if (aiResult) {
      setResult(aiResult);
      onResult?.(aiResult, 'completion');
      toast.success('AI 续写完成');
    } else if (error) {
      toast.error(`AI 续写失败: ${error}`);
    }
  }, [content, complete, error, onResult]);

  // 处理生成摘要
  const handleSummary = React.useCallback(async () => {
    if (!content || content.trim() === '') {
      toast.error('请先输入一些内容');
      return;
    }

    setCurrentMode('summary');
    setResult(null);

    const aiResult = await generateSummary(content);
    
    if (aiResult) {
      setResult(aiResult);
      onResult?.(aiResult, 'summary');
      toast.success('摘要生成完成');
    } else if (error) {
      toast.error(`生成摘要失败: ${error}`);
    }
  }, [content, generateSummary, error, onResult]);

  // 清除结果
  const handleClearResult = React.useCallback(() => {
    setResult(null);
    setCurrentMode(null);
  }, []);

  // 取消当前请求
  const handleCancel = React.useCallback(() => {
    cancel();
    setCurrentMode(null);
    toast.info('已取消 AI 操作');
  }, [cancel]);

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      {/* 工具栏按钮 */}
      <div className="flex items-center gap-2">
        <Button
          onClick={handleCompletion}
          disabled={isLoading || !content}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          {isLoading && currentMode === 'completion' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          AI 续写
        </Button>

        <Button
          onClick={handleSummary}
          disabled={isLoading || !content}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          {isLoading && currentMode === 'summary' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileText className="h-4 w-4" />
          )}
          生成摘要
        </Button>

        {isLoading && (
          <Button
            onClick={handleCancel}
            variant="ghost"
            size="sm"
            className="flex items-center gap-2"
          >
            <X className="h-4 w-4" />
            取消
          </Button>
        )}
      </div>

      {/* 加载状态 */}
      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>
            {currentMode === 'completion' ? '正在智能续写...' : '正在生成摘要...'}
          </span>
        </div>
      )}

      {/* 错误信息 */}
      {error && !isLoading && (
        <div className="text-sm text-destructive">
          错误: {error}
        </div>
      )}

      {/* AI 生成结果 */}
      {result && !isLoading && (
        <Card className="w-full">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="text-sm font-medium">
                {currentMode === 'completion' ? 'AI 续写结果' : '内容摘要'}
              </CardTitle>
              <CardDescription className="text-xs">
                {currentMode === 'completion' 
                  ? '以下是 AI 生成的续写内容' 
                  : '以下是 AI 生成的内容摘要'}
              </CardDescription>
            </div>
            <Button
              onClick={handleClearResult}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="rounded-md bg-muted p-4 text-sm whitespace-pre-wrap">
              {result}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
