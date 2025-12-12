# AI 功能测试指南

本文档提供了手动测试 AI 功能的详细步骤。

## 前置条件

1. 已配置火山引擎 API 密钥：
   - 在 `.env.local` 文件中设置 `VOLC_API_KEY`
   - 在 `.env.local` 文件中设置 `VOLC_MODEL_ENDPOINT`

2. 已启动开发服务器：
   ```bash
   npm run dev
   ```

## 测试 1：API 路由测试

### 测试摘要功能

```bash
curl -X POST http://localhost:3000/api/ai \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "summary",
    "content": "人工智能（Artificial Intelligence，简称AI）是计算机科学的一个分支，它企图了解智能的实质，并生产出一种新的能以人类智能相似的方式做出反应的智能机器。该领域的研究包括机器人、语言识别、图像识别、自然语言处理和专家系统等。AI在现代生活中已经得到广泛应用，如智能手机的语音助手、自动驾驶汽车、推荐系统等。"
  }'
```

**预期结果**：
- HTTP 状态码：200
- 响应包含 `success: true`
- 响应包含 `result` 字段，内容是原文的摘要

### 测试续写功能

```bash
curl -X POST http://localhost:3000/api/ai \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "completion",
    "content": "今天天气很好，我决定去公园散步。公园里"
  }'
```

**预期结果**：
- HTTP 状态码：200
- 响应包含 `success: true`
- 响应包含 `result` 字段，内容是续写的文本

### 测试问答功能

```bash
curl -X POST http://localhost:3000/api/ai \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "search",
    "query": "人工智能有哪些应用？",
    "context": "人工智能在现代生活中已经得到广泛应用，如智能手机的语音助手、自动驾驶汽车、推荐系统等。"
  }'
```

**预期结果**：
- HTTP 状态码：200
- 响应包含 `success: true`
- 响应包含 `result` 字段，内容是基于上下文的回答

### 测试错误处理

**测试缺少必需参数**：

```bash
curl -X POST http://localhost:3000/api/ai \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "summary"
  }'
```

**预期结果**：
- HTTP 状态码：400
- 响应包含错误信息："summary 模式需要 content 参数"

**测试无效模式**：

```bash
curl -X POST http://localhost:3000/api/ai \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "invalid_mode",
    "content": "测试内容"
  }'
```

**预期结果**：
- HTTP 状态码：400
- 响应包含错误信息："无效的模式..."

## 测试 2：前端组件测试

### 在浏览器中测试 AIToolbar 组件

1. 打开浏览器开发者工具（F12）

2. 在控制台中运行以下代码创建测试环境：

```javascript
// 创建一个简单的测试页面
const testContainer = document.createElement('div');
testContainer.id = 'ai-toolbar-test';
testContainer.style.cssText = 'padding: 20px; margin: 20px; border: 2px solid #ccc;';
document.body.appendChild(testContainer);

// 注意：在实际项目中，你需要在 React 组件中使用 AIToolbar
console.log('AI Toolbar 测试容器已创建');
```

3. 导航到包含 AI 工具栏的页面

4. 测试步骤：
   - 在编辑器中输入一些内容
   - 点击 "AI 续写" 按钮
   - 观察加载状态
   - 验证返回的续写内容
   - 点击 "生成摘要" 按钮
   - 观察加载状态
   - 验证返回的摘要内容

## 测试 3：useAI Hook 测试

创建一个测试组件来验证 hook 功能：

```tsx
// 在你的测试页面中添加此组件
import { useAI } from '@/hooks/use-ai';

function AIHookTest() {
  const { generateSummary, complete, isLoading, error } = useAI();
  
  const testSummary = async () => {
    const result = await generateSummary('测试内容：这是一段很长的文本...');
    console.log('摘要结果:', result);
  };
  
  const testCompletion = async () => {
    const result = await complete('测试内容：今天天气很好');
    console.log('续写结果:', result);
  };
  
  return (
    <div>
      <button onClick={testSummary}>测试摘要</button>
      <button onClick={testCompletion}>测试续写</button>
      {isLoading && <p>加载中...</p>}
      {error && <p>错误: {error}</p>}
    </div>
  );
}
```

## 测试检查清单

- [ ] API 路由正常工作
  - [ ] 摘要模式返回正确结果
  - [ ] 续写模式返回正确结果
  - [ ] 问答模式返回正确结果
  - [ ] 错误处理正确（缺少参数、无效模式等）

- [ ] useAI Hook 正常工作
  - [ ] `generateSummary` 函数正常
  - [ ] `complete` 函数正常
  - [ ] `search` 函数正常
  - [ ] `isLoading` 状态正确
  - [ ] `error` 状态正确
  - [ ] `cancel` 功能正常

- [ ] AIToolbar 组件正常工作
  - [ ] 按钮正确显示
  - [ ] 点击 "AI 续写" 按钮触发正确的操作
  - [ ] 点击 "生成摘要" 按钮触发正确的操作
  - [ ] 加载状态正确显示
  - [ ] 结果正确显示
  - [ ] 错误信息正确显示
  - [ ] 取消按钮正常工作

## 性能测试

### 测试响应时间

使用 `curl` 命令并测量时间：

```bash
time curl -X POST http://localhost:3000/api/ai \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "summary",
    "content": "测试内容..."
  }'
```

**预期**：
- 响应时间应在合理范围内（取决于火山引擎 API 的响应速度）
- 通常应在 1-5 秒之间

### 测试并发请求

在浏览器控制台中：

```javascript
// 发送多个并发请求
Promise.all([
  fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: 'summary', content: '测试1...' })
  }),
  fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: 'summary', content: '测试2...' })
  }),
  fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: 'summary', content: '测试3...' })
  })
]).then(responses => {
  console.log('所有请求完成:', responses.length);
});
```

**预期**：
- 所有请求都应成功完成
- 没有请求被意外取消或失败

## 故障排除

### 问题：API 返回 500 错误

**可能原因**：
- 未配置环境变量
- 火山引擎 API 密钥无效
- 网络连接问题

**解决方案**：
1. 检查 `.env.local` 文件是否存在且配置正确
2. 验证火山引擎 API 密钥是否有效
3. 检查服务器日志获取详细错误信息

### 问题：前端组件无响应

**可能原因**：
- API 路由未正确导入
- 环境变量未加载
- React hook 使用不当

**解决方案**：
1. 检查浏览器控制台的错误信息
2. 验证 API 路由是否可访问
3. 检查组件是否正确导入和使用

### 问题：生成的内容不符合预期

**可能原因**：
- 输入内容质量问题
- Prompt 设计不够清晰
- 模型参数需要调整

**解决方案**：
1. 提供更详细、更清晰的输入内容
2. 调整 API 路由中的 system prompt
3. 调整温度参数和最大 token 数
