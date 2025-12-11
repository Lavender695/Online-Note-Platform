// server.js
const WebSocket = require('ws')

// 使用环境变量中的 PORT，如果没有则使用 4444
const port = process.env.PORT || 4444 
const wss = new WebSocket.Server({ port })

console.log(`WebSocket Signaling Server running on port ${port}`)

// 监听客户端连接
wss.on('connection', ws => {
  console.log('Client connected')

  // 监听收到的消息
  ws.on('message', message => {
    // 将消息广播给所有连接到这个服务器的其他客户端
    wss.clients.forEach(client => {
      // 确保不是发送者自己，并且客户端状态是 OPEN (已连接)
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(message)
      }
    })
  })

  ws.on('close', () => {
    console.log('Client disconnected')
  })
})