# MiniMax Relay Platform - 规格文档

## 1. 项目概述

- **项目名称**: minimax-relay
- **项目类型**: API 中转服务 / 模型网关
- **核心功能**: 将 OpenAI 格式的 API 请求转换为 MiniMax 格式并中转到 MiniMax 官方 API
- **目标用户**: 开发者需要通过 OpenAI 兼容接口调用 MiniMax 模型

## 2. 技术栈

- **Runtime**: Node.js 18+
- **Language**: TypeScript
- **Framework**: Express
- **HTTP Client**: Axios (或 node-fetch)
- **Config**: YAML 配置文件
- **Process Management**: PM2 (生产环境)

## 3. 支持的 API 端点

### 3.1 文本补全 (Chat Completions)
- [x] `POST /v1/chat/completions` → MiniMax `/v1/chat_pro` 或 `/v1/chat声声` 

### 3.2 图片生成 (Image Generation)
- [x] `POST /v1/images/generations` → MiniMax `/v1/image_generation`

### 3.3 模型列表
- [x] `GET /v1/models` → 返回支持的模型列表

### 3.4 其他
- [x] `GET /v1/models/:model` → 获取特定模型信息
- [x] `POST /v1/completions` → 兼容旧版格式

## 4. 请求转换规则

### 4.1 Chat Completions

**请求转换 (OpenAI → MiniMax)**:
```typescript
// 输入 (OpenAI 格式)
{
  "model": "MiniMax-M2.7-highspeed",
  "messages": [
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": "Hello!"}
  ],
  "temperature": 0.7,
  "max_tokens": 1000
}

// 输出 (MiniMax 格式)
// POST https://api.minimaxi.com/v1/chat_pro
{
  "model": "MiniMax-M2.7-highspeed", 
  "messages": [...],
  "temperature": 0.7,
  "tokens_to_generate": 1000
}
```

**响应转换 (MiniMax → OpenAI)**:
```typescript
// 输入 (MiniMax 格式)
{
  "id": "gen-xxx",
  "choices": [{
    "messages": [{"role": "assistant", "content": "Hello! How can I help?"}]
  }]
}

// 输出 (OpenAI 格式)
{
  "id": "gen-xxx",
  "object": "chat.completion",
  "choices": [{
    "message": {"role": "assistant", "content": "Hello! How can I help?"},
    "finish_reason": "stop"
  }]
}
```

### 4.2 Image Generation

**请求转换 (OpenAI → MiniMax)**:
```typescript
// 输入 (OpenAI 格式 DALL-E)
{
  "model": "dall-e-3",
  "prompt": "A cute cat",
  "n": 1,
  "size": "1024x1024"
}

// 输出 (MiniMax 格式)
{
  "model": "image-01",
  "prompt": "A cute cat",
  "aspect_ratio": "1:1",
  "response_format": "base64"
}
```

**响应转换 (MiniMax → OpenAI)**:
```typescript
// 输入 (MiniMax 格式)
{
  "id": "img-xxx",
  "base64_image": "...",
  "created": 1234567890
}

// 输出 (OpenAI 格式)
{
  "id": "img-xxx", 
  "object": "image.generation",
  "data": [{
    "url": "data:image/png;base64,...",
    "revised_prompt": "A cute cat"
  }]
}
```

## 5. 配置管理

### 5.1 config.yaml 结构
```yaml
server:
  host: "0.0.0.0"
  port: 3000
  base_path: "/v1"

minimax:
  api_key: "${MINIMAX_API_KEY}"
  base_url: "https://api.minimaxi.com"
  timeout: 120000

models:
  enabled:
    - "MiniMax-M2.7-highspeed"
    - "MiniMax-M2.5-highspeed"
    - "image-01"
  default: "MiniMax-M2.7-highspeed"

logging:
  level: "info"
  format: "json"

rate_limit:
  enabled: true
  requests_per_minute: 60
```

### 5.2 环境变量
- `MINIMAX_API_KEY` - MiniMax API 密钥 (必需)
- `PORT` - 服务端口 (默认 3000)
- `LOG_LEVEL` - 日志级别

## 6. 项目结构

```
minimax-relay/
├── src/
│   ├── index.ts              # 入口文件
│   ├── config.ts             # 配置加载
│   ├── server.ts             # Express 服务器
│   ├── routes/
│   │   ├── chat.ts           # 聊天补全路由
│   │   ├── images.ts         # 图片生成路由
│   │   └── models.ts         # 模型列表路由
│   ├── services/
│   │   ├── minimax.ts        # MiniMax API 调用
│   │   └── transformer.ts    # 请求/响应格式转换
│   ├── middleware/
│   │   ├── auth.ts           # 认证中间件
│   │   ├── ratelimit.ts      # 限流中间件
│   │   └── logger.ts         # 日志中间件
│   └── types/
│       └── index.ts          # TypeScript 类型定义
├── tests/
│   ├── chat.test.ts
│   ├── images.test.ts
│   └── transformer.test.ts
├── config.yaml               # 配置文件
├── package.json
├── tsconfig.json
├── .env.example             # 环境变量示例
├── .gitignore
├── SPEC.md
└── README.md
```

## 7. 错误处理

### 7.1 错误代码映射
| MiniMax Code | Description | OpenAI Error |
|--------------|-------------|--------------|
| 0 | 成功 | - |
| 1002 | 限流 | 429 Rate limit |
| 1004 | 认证失败 | 401 Invalid API key |
| 1008 | 余额不足 | 402 Insufficient credits |
| 1026 | 内容安全拦截 | 400 Content filter |
| 2013 | 参数错误 | 400 Invalid parameter |

### 7.2 错误响应格式
```json
{
  "error": {
    "message": "Rate limit exceeded",
    "type": "rate_limit_error",
    "code": 429
  }
}
```

## 8. 部署

### 8.1 Docker 支持
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

### 8.2 PM2 配置 (ecosystem.config.js)
```javascript
module.exports = {
  apps: [{
    name: 'minimax-relay',
    script: 'dist/index.js',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
}
```

## 9. 待完成功能

- [ ] 余额/用量统计
- [ ] API Key 管理界面
- [ ] 请求日志存储 (MySQL/PostgreSQL)
- [ ] 多租户支持
- [ ] WebSocket 流式输出
- [ ] 健康检查端点 `/health`

## 10. 参考

- MiniMax 官方文档: https://www.minimaxi.com/document
- MiniMax API 格式: /v1/image_generation, /v1/chat_pro
- OpenAI API 兼容格式
