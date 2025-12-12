import { NextRequest, NextResponse } from 'next/server';

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

export async function POST(req: NextRequest) {
  try {
    const { mode, content, context }: AIRequest = await req.json();

    // Validate environment variables
    const apiKey = process.env.VOLC_API_KEY;
    const modelEndpoint = process.env.VOLC_MODEL_ENDPOINT;

    if (!apiKey || !modelEndpoint) {
      return NextResponse.json(
        { error: 'Missing VOLC_API_KEY or VOLC_MODEL_ENDPOINT environment variables' },
        { status: 500 }
      );
    }

    // Validate request
    if (!mode || !content) {
      return NextResponse.json(
        { error: 'Missing required fields: mode and content' },
        { status: 400 }
      );
    }

    // Build prompt based on mode
    let prompt = '';
    switch (mode) {
      case 'summary':
        prompt = `请对以下内容生成一个简洁的摘要：\n\n${content}`;
        break;
      case 'completion':
        prompt = `请根据以下内容进行智能续写：\n\n${content}`;
        break;
      case 'search':
        prompt = context 
          ? `基于以下上下文：\n${context}\n\n请回答问题：${content}`
          : `请回答以下问题：${content}`;
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid mode. Must be one of: summary, completion, search' },
          { status: 400 }
        );
    }

    // Call Volcano Engine API
    const response = await fetch(
      `https://ark.cn-beijing.volces.com/api/v3/chat/completions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: modelEndpoint,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Volcano Engine API error:', errorData);
      return NextResponse.json(
        { error: 'Failed to call Volcano Engine API', details: errorData },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Extract result from Volcano Engine response
    const result = data.choices?.[0]?.message?.content || '';
    const usage = data.usage;

    const aiResponse: AIResponse = {
      result,
      usage: usage ? {
        input_tokens: usage.prompt_tokens || 0,
        output_tokens: usage.completion_tokens || 0,
        total_tokens: usage.total_tokens || 0,
      } : undefined,
    };

    return NextResponse.json(aiResponse);
  } catch (error) {
    console.error('AI API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
