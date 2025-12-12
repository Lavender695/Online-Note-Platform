'use client';

import { useState } from 'react';
import { AIToolbar } from '@/components/ai-toolbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * AI Features Demo Page
 * 
 * This page demonstrates how to use the AI toolbar component
 * and integrate AI features into your application.
 */
export default function AIDemo() {
  const [content, setContent] = useState(
    '人工智能（AI）正在改变我们的生活方式。从智能手机到自动驾驶汽车，AI技术无处不在。'
  );
  const [summary, setSummary] = useState('');

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">AI 功能演示</h1>
          <p className="text-muted-foreground">
            体验基于火山引擎的 AI 功能，包括智能续写和内容摘要
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>AI 工具栏</CardTitle>
            <CardDescription>
              使用下方的 AI 工具栏对文本进行智能续写或生成摘要
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* AI Toolbar */}
            <AIToolbar
              content={content}
              onContentGenerated={(newContent) => {
                setContent(content + '\n\n' + newContent);
              }}
              onSummaryGenerated={(generatedSummary) => {
                setSummary(generatedSummary);
              }}
              className="mb-4"
            />

            {/* Content Editor */}
            <div>
              <label className="block text-sm font-medium mb-2">
                编辑器内容：
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full h-40 p-3 border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="在这里输入内容..."
              />
              <div className="flex justify-end gap-2 mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setContent('')}
                >
                  清空
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setContent(
                      '人工智能（AI）正在改变我们的生活方式。从智能手机到自动驾驶汽车，AI技术无处不在。'
                    );
                  }}
                >
                  恢复示例
                </Button>
              </div>
            </div>

            {/* Summary Display */}
            {summary && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  生成的摘要：
                </label>
                <div className="p-4 bg-muted rounded-md">
                  <p className="text-sm">{summary}</p>
                </div>
                <div className="flex justify-end mt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSummary('')}
                  >
                    清除摘要
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>使用说明</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <h3 className="font-semibold mb-1">🔑 配置要求</h3>
              <p className="text-muted-foreground">
                需要在 <code className="px-1 py-0.5 bg-muted rounded">.env.local</code> 文件中配置：
              </p>
              <pre className="mt-2 p-3 bg-muted rounded-md text-xs overflow-x-auto">
                {`VOLC_API_KEY=your_api_key
VOLC_MODEL_ENDPOINT=your_endpoint_id`}
              </pre>
            </div>

            <div>
              <h3 className="font-semibold mb-1">✨ AI 续写</h3>
              <p className="text-muted-foreground">
                点击 &quot;AI 续写&quot; 按钮，AI 会根据当前内容智能生成后续文本，生成的内容会自动追加到编辑器中。
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-1">📝 生成摘要</h3>
              <p className="text-muted-foreground">
                点击 &quot;生成摘要&quot; 按钮，AI 会分析内容并生成简洁的摘要，摘要会显示在编辑器下方。
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-1">💡 提示</h3>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>内容越丰富，AI 生成的结果越准确</li>
                <li>确保网络连接正常，API 调用需要时间</li>
                <li>如遇错误，请检查环境变量配置</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
