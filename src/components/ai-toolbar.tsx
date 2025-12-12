'use client';

import * as React from 'react';
import { Sparkles, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAI } from '@/hooks/use-ai';
import { toast } from 'sonner';

interface AIToolbarProps {
  /**
   * Current editor content to use for AI operations
   */
  content: string;
  /**
   * Callback when AI generates new content (for completion mode)
   */
  onContentGenerated?: (newContent: string) => void;
  /**
   * Callback when AI generates a summary
   */
  onSummaryGenerated?: (summary: string) => void;
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * AI Toolbar Component
 * 
 * Provides AI-powered features for the editor:
 * - AI 续写 (AI Completion): Intelligently continues the current content
 * - 生成摘要 (Generate Summary): Creates a concise summary of the content
 * 
 * @example
 * ```tsx
 * <AIToolbar
 *   content={editorContent}
 *   onContentGenerated={(newContent) => {
 *     // Insert or append newContent to editor
 *   }}
 *   onSummaryGenerated={(summary) => {
 *     // Display summary to user
 *   }}
 * />
 * ```
 */
export function AIToolbar({
  content,
  onContentGenerated,
  onSummaryGenerated,
  className,
}: AIToolbarProps) {
  const { callAI, isLoading, error } = useAI();

  // Show error toast when error occurs
  React.useEffect(() => {
    if (error) {
      toast.error('AI 操作失败', {
        description: error,
      });
    }
  }, [error]);

  const handleCompletion = async () => {
    if (!content.trim()) {
      toast.error('无法续写', {
        description: '请先输入一些内容',
      });
      return;
    }

    try {
      const result = await callAI({
        mode: 'completion',
        content,
      });

      if (onContentGenerated) {
        onContentGenerated(result);
      }

      toast.success('AI 续写完成', {
        description: '内容已生成',
      });
    } catch (err) {
      // Error already handled by useAI hook
      console.error('AI completion error:', err);
    }
  };

  const handleSummary = async () => {
    if (!content.trim()) {
      toast.error('无法生成摘要', {
        description: '请先输入一些内容',
      });
      return;
    }

    try {
      const result = await callAI({
        mode: 'summary',
        content,
      });

      if (onSummaryGenerated) {
        onSummaryGenerated(result);
      }

      toast.success('摘要生成完成', {
        description: '摘要已生成',
      });
    } catch (err) {
      // Error already handled by useAI hook
      console.error('AI summary error:', err);
    }
  };

  return (
    <div className={className}>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleCompletion}
          disabled={isLoading || !content.trim()}
          className="gap-1.5"
        >
          <Sparkles className="size-4" />
          AI 续写
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleSummary}
          disabled={isLoading || !content.trim()}
          className="gap-1.5"
        >
          <FileText className="size-4" />
          生成摘要
        </Button>

        {isLoading && (
          <span className="text-muted-foreground text-sm">处理中...</span>
        )}
      </div>
    </div>
  );
}
