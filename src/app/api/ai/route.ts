import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// 火山引擎 API 类型定义
interface VolcanoEngineMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface VolcanoEngineRequest {
  model?: string;
  messages: VolcanoEngineMessage[];
  temperature?: number;
  max_tokens?: number;
}

interface VolcanoEngineResponse {
  choices: Array<{
    message: {
      content: string;
      role: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * 火山引擎 AI API 路由
 * 支持三种模式：summary（摘要）、completion（续写）、search（搜索/问答）
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { mode, content, context, query } = body;

    // 验证必需的环境变量
    const apiKey = process.env.VOLC_API_KEY;
    const modelEndpoint = process.env.VOLC_MODEL_ENDPOINT;

    if (!apiKey || !modelEndpoint) {
      return NextResponse.json(
        { 
          error: '缺少火山引擎 API 配置。请在环境变量中设置 VOLC_API_KEY 和 VOLC_MODEL_ENDPOINT。' 
        },
        { status: 500 }
      );
    }

    // 验证模式
    if (!mode || !['summary', 'completion', 'search'].includes(mode)) {
      return NextResponse.json(
        { error: '无效的模式。支持的模式: summary, completion, search' },
        { status: 400 }
      );
    }

    // 根据模式构建消息
    const messages: VolcanoEngineMessage[] = [];
    
    switch (mode) {
      case 'summary':
        if (!content) {
          return NextResponse.json(
            { error: 'summary 模式需要 content 参数' },
            { status: 400 }
          );
        }
        messages.push({
          role: 'system',
          content: '你是一个专业的内容摘要助手。请为用户提供简洁、准确的内容摘要。摘要应该抓住核心要点，使用清晰的语言。'
        });
        messages.push({
          role: 'user',
          content: `请为以下内容生成摘要：\n\n${content}`
        });
        break;

      case 'completion':
        if (!content) {
          return NextResponse.json(
            { error: 'completion 模式需要 content 参数' },
            { status: 400 }
          );
        }
        messages.push({
          role: 'system',
          content: '你是一个智能写作助手。请根据用户提供的内容，自然地续写下文。续写应该保持风格一致，内容连贯，并且有实质性的内容。'
        });
        messages.push({
          role: 'user',
          content: `请续写以下内容：\n\n${content}`
        });
        break;

      case 'search':
        if (!query) {
          return NextResponse.json(
            { error: 'search 模式需要 query 参数' },
            { status: 400 }
          );
        }
        messages.push({
          role: 'system',
          content: '你是一个智能问答助手。请根据提供的上下文信息，准确回答用户的问题。如果上下文中没有相关信息，请诚实地告知用户。'
        });
        if (context) {
          messages.push({
            role: 'user',
            content: `上下文信息：\n\n${context}\n\n问题：${query}`
          });
        } else {
          messages.push({
            role: 'user',
            content: query
          });
        }
        break;
    }

    // 构建火山引擎 API 请求
    const volcanoRequest: VolcanoEngineRequest = {
      model: modelEndpoint,
      messages,
      temperature: 0.7,
      max_tokens: 2000,
    };

    // 调用火山引擎 API
    const apiUrl = `https://ark.cn-beijing.volces.com/api/v3/chat/completions`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(volcanoRequest),
      signal: req.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('火山引擎 API 错误:', errorText);
      return NextResponse.json(
        { 
          error: '火山引擎 API 调用失败',
          details: errorText 
        },
        { status: response.status }
      );
    }

    const data: VolcanoEngineResponse = await response.json();

    // 提取生成的内容
    const result = data.choices?.[0]?.message?.content;

    if (!result) {
      return NextResponse.json(
        { error: 'API 返回了空结果' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      result,
      usage: data.usage,
    });

  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return NextResponse.json(
          { error: '请求已取消' },
          { status: 408 }
        );
      }
      
      console.error('AI API 错误:', error);
      return NextResponse.json(
        { 
          error: '处理 AI 请求时发生错误',
          details: error.message 
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: '未知错误' },
      { status: 500 }
    );
  }
}
