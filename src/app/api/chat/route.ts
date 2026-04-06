import { createOpenAI } from '@ai-sdk/openai';
import {
  convertToModelMessages,
  type LanguageModel,
  streamText,
  type UIMessage,
} from 'ai';
import { NextResponse } from 'next/server';

export const runtime = 'edge';

const volcengine = createOpenAI({
  baseURL: process.env.VOLC_API_URL || 'https://ark.cn-beijing.volces.com/api/v3',
  apiKey: process.env.VOLC_API_KEY,
});

type StreamTextCompatResult = {
  toDataStreamResponse?: () => Response;
  toTextStreamResponse: () => Response;
  toUIMessageStreamResponse?: () => Response;
};

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    const modelId =
      process.env.VOLC_MODEL_ID ||
      process.env.VOLC_MODEL_ENDPOINT;

    if (!Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Invalid request body: messages must be an array.' },
        { status: 400 }
      );
    }

    if (!modelId) {
      return NextResponse.json(
        {
          error:
            'Missing Volc model id. Set VOLC_MODEL_ID or VOLC_MODEL_ENDPOINT.',
        },
        { status: 500 }
      );
    }

    const modelMessages = convertToModelMessages(messages as UIMessage[]);
    const rawMessageText = JSON.stringify(messages);
    const hasChineseContext = /[\u4e00-\u9fff]/.test(rawMessageText);

    const languageSystemPrompt = hasChineseContext
      ? 'You are writing assistant for a Chinese note editor. Always respond in Simplified Chinese, unless the user explicitly requests another language.'
      : 'Respond in the same language as the user input and document context. Do not change language unless explicitly requested.';

    const result = streamText({
      model: volcengine(modelId) as unknown as LanguageModel,
      system: languageSystemPrompt,
      messages: modelMessages,
    });
    const compatResult = result as unknown as StreamTextCompatResult;

    return (
      compatResult.toDataStreamResponse?.() ??
      compatResult.toUIMessageStreamResponse?.() ??
      compatResult.toTextStreamResponse()
    );
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }
}
