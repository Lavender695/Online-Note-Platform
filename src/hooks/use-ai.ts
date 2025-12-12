import { useState, useCallback, useRef } from 'react';

/**
 * AI 模式类型
 * - summary: 生成内容摘要
 * - completion: 智能续写
 * - search: 基于上下文的问答/检索
 */
export type AIMode = 'summary' | 'completion' | 'search';

/**
 * AI 请求参数
 */
export interface AIRequest {
  mode: AIMode;
  content?: string;  // summary 和 completion 模式使用
  context?: string;  // search 模式的上下文（可选）
  query?: string;    // search 模式的问题
}

/**
 * AI 响应数据
 */
export interface AIResponse {
  success: boolean;
  result?: string;
  error?: string;
  details?: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * useAI Hook
 * 
 * 封装 AI API 调用逻辑，提供简单的接口供组件使用
 * 
 * @example
 * ```tsx
 * const { callAI, isLoading, error } = useAI();
 * 
 * // 生成摘要
 * const summary = await callAI({
 *   mode: 'summary',
 *   content: '要总结的内容...'
 * });
 * 
 * // 智能续写
 * const continuation = await callAI({
 *   mode: 'completion',
 *   content: '需要续写的内容...'
 * });
 * 
 * // 问答
 * const answer = await callAI({
 *   mode: 'search',
 *   query: '什么是人工智能？',
 *   context: '可选的上下文信息...'
 * });
 * ```
 */
export function useAI() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * 调用 AI API
   */
  const callAI = useCallback(async (request: AIRequest): Promise<string | null> => {
    // 取消之前的请求（如果存在）
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // 清除之前的错误
    setError(null);
    setIsLoading(true);

    // 创建新的 AbortController 用于取消请求
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      // 验证请求参数
      if (request.mode === 'summary' || request.mode === 'completion') {
        if (!request.content || request.content.trim() === '') {
          throw new Error(`${request.mode} 模式需要提供 content 参数`);
        }
      } else if (request.mode === 'search') {
        if (!request.query || request.query.trim() === '') {
          throw new Error('search 模式需要提供 query 参数');
        }
      }

      // 调用 API
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      const data: AIResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `API 错误: ${response.status}`);
      }

      if (!data.success || !data.result) {
        throw new Error(data.error || '未获取到 AI 结果');
      }

      return data.result;

    } catch (err) {
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          setError('请求已取消');
        } else {
          setError(err.message);
        }
      } else {
        setError('未知错误');
      }
      return null;

    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, []);

  /**
   * 取消当前请求
   */
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  /**
   * 生成摘要的便捷方法
   */
  const generateSummary = useCallback(async (content: string): Promise<string | null> => {
    return callAI({
      mode: 'summary',
      content,
    });
  }, [callAI]);

  /**
   * 智能续写的便捷方法
   */
  const complete = useCallback(async (content: string): Promise<string | null> => {
    return callAI({
      mode: 'completion',
      content,
    });
  }, [callAI]);

  /**
   * 问答的便捷方法
   */
  const search = useCallback(async (query: string, context?: string): Promise<string | null> => {
    return callAI({
      mode: 'search',
      query,
      context,
    });
  }, [callAI]);

  return {
    callAI,
    generateSummary,
    complete,
    search,
    cancel,
    isLoading,
    error,
  };
}
