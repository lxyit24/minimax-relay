# MiniMax Relay Platform

一个 MiniMax API 中转平台，提供 OpenAI 兼容格式的接口，将请求转换为 MiniMax 官方格式并中转。

## 功能特性

- 🔄 **格式转换**: 自动将 OpenAI 格式请求转换为 MiniMax 格式
- 🌐 **OpenAI 兼容**: 支持 OpenAI SDK 和 API 调试工具直接调用
- 🖼️ **图片生成**: 支持 DALL-E 格式的图片生成请求
- 📝 **聊天补全**: 支持 ChatGPT 格式的聊天补全
- 🔒 **认证 & 限流**: 内置 API Key 验证和请求限流
- 📊 **日志记录**: 支持 JSON/文本日志格式
- ⚙️ **配置灵活**: YAML 配置文件 + 环境变量支持

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置

复制 `.env.example` 为 `.env`，填入你的 MiniMax API Key：

```bash
cp .env.example .env
```

编辑 `config.yaml` 或设置环境变量：

```yaml
minimax:
  api_key: "your-minimax-api-key"
```

### 3. 启动服务

```bash
# 开发模式
npm run dev

# 生产模式
npm run build
npm start
```

服务启动后运行在 `http://localhost:3000`，API 基础路径为 `/v1`。

## API 端点

### 聊天补全

```bash
POST /v1/chat/completions

# 请求示例
curl -X POST http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key" \
  -d '{
    "model": "MiniMax-M2.7-highspeed",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

### 图片生成

```bash
POST /v1/images/generations

# 请求示例
curl -X POST http://localhost:3000/v1/images/generations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key" \
  -d '{
    "model": "image-01",
    "prompt": "A cute cat",
    "n": 1,
    "size": "1024x1024"
  }'
```

### 模型列表

```bash
GET /v1/models
```

### 健康检查

```bash
GET /health
```

## 配置说明

### config.yaml

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| `server.host` | 监听地址 | `0.0.0.0` |
| `server.port` | 监听端口 | `3000` |
| `server.base_path` | API 基础路径 | `/v1` |
| `minimax.api_key` | MiniMax API Key | - |
| `minimax.base_url` | MiniMax API 地址 | `https://api.minimaxi.com` |
| `models.enabled` | 启用的模型列表 | - |
| `logging.level` | 日志级别 | `info` |
| `rate_limit.enabled` | 是否启用限流 | `true` |

### 环境变量

| 变量名 | 说明 |
|--------|------|
| `MINIMAX_API_KEY` | MiniMax API 密钥 |
| `PORT` | 服务端口 |
| `HOST` | 监听地址 |
| `LOG_LEVEL` | 日志级别 |
| `RATE_LIMIT_REQUESTS_PER_MINUTE` | 每分钟请求限制 |

## 项目结构

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
├── config.yaml               # 配置文件
├── package.json
└── tsconfig.json
```

## 错误码映射

| MiniMax 错误码 | 说明 | HTTP 状态码 |
|---------------|------|-------------|
| 0 | 成功 | 200 |
| 1002 | 限流 | 429 |
| 1004 | 认证失败 | 401 |
| 1008 | 余额不足 | 402 |
| 1026 | 内容安全拦截 | 400 |
| 2013 | 参数错误 | 400 |

## License

MIT
