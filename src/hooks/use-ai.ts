'use client';

import { useState } from 'react';

type AIMode = 'summary' | 'completion' | 'search';

interface AIRequest {
  mode: AIMode;
  content: string;
  context?: string;
}

interface AIResponse {
  result: string;
  usage?: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
  };
}

interface UseAIResult {
  callAI: (request: AIRequest) => Promise<string>;
  isLoading: boolean;
  error: string | null;
}

export function useAI(): UseAIResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const callAI = async (request: AIRequest): Promise<string> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data: AIResponse = await response.json();
      return data.result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to call AI API';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    callAI,
    isLoading,
    error,
  };
}
