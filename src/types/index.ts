// ============================================================
// MiniMax Relay Platform - TypeScript Type Definitions
// ============================================================

// ---- OpenAI Compatible Types ----

export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant' | 'function';
  content: string;
  name?: string;
}

export interface OpenAIChatCompletionRequest {
  model: string;
  messages: OpenAIMessage[];
  temperature?: number;
  top_p?: number;
  n?: number;
  stream?: boolean;
  max_tokens?: number;
  presence_penalty?: number;
  frequency_penalty?: number;
  logit_bias?: Record<string, number>;
  user?: string;
}

export interface OpenAIImageGenerationRequest {
  model?: string;
  prompt: string;
  n?: number;
  size?: '256x256' | '512x512' | '1024x1024' | '1792x1024' | '1024x1792';
  response_format?: 'url' | 'b64_json';
  style?: 'vivid' | 'natural';
  user?: string;
}

export interface OpenAIDelta {
  role?: string;
  content?: string;
}

export interface OpenAIChoice {
  index: number;
  message: {
    role: string;
    content: string;
  };
  finish_reason: string;
}

export interface OpenAIChatCompletionResponse {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: OpenAIChoice[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface OpenAIImageResponse {
  id: string;
  object: 'image.generation';
  created: number;
  data: Array<{
    url?: string;
    b64_json?: string;
    revised_prompt?: string;
  }>;
}

// ---- MiniMax Types ----

export interface MiniMaxChatRequest {
  model: string;
  messages: OpenAIMessage[];
  temperature?: number;
  top_p?: number;
  tokens_to_generate?: number;
  stream?: boolean;
}

export interface MiniMaxImageRequest {
  model: string;
  prompt: string;
  aspect_ratio?: '1:1' | '16:9' | '4:3' | '3:2' | '2:3' | '3:4' | '9:16' | '21:9';
  response_format?: 'url' | 'base64';
  n?: number;
  width?: number;
  height?: number;
  prompt_optimizer?: boolean;
  aigc_watermark?: boolean;
  style?: string;
}

export interface MiniMaxChatResponse {
  id: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    messages: OpenAIMessage[];
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface MiniMaxImageResponse {
  id: string;
  created: number;
  base64_image?: string;
  image_url?: string;
  revised_prompt?: string;
}

// ---- Config Types ----

export interface ServerConfig {
  host: string;
  port: number;
  base_path: string;
}

export interface MiniMaxConfig {
  api_key: string;
  base_url: string;
  timeout: number;
}

export interface ModelsConfig {
  enabled: string[];
  default: string;
}

export interface LoggingConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  format: 'json' | 'simple';
}

export interface RateLimitConfig {
  enabled: boolean;
  requests_per_minute: number;
}

export interface AppConfig {
  server: ServerConfig;
  minimax: MiniMaxConfig;
  models: ModelsConfig;
  logging: LoggingConfig;
  rate_limit: RateLimitConfig;
}

// ---- Error Types ----

export interface RelayError {
  error: {
    message: string;
    type: string;
    code: number;
  };
}

// Error code mapping
export const ERROR_CODE_MAP: Record<number, { message: string; httpStatus: number }> = {
  0: { message: 'Success', httpStatus: 200 },
  1002: { message: 'Rate limit exceeded', httpStatus: 429 },
  1004: { message: 'Invalid API key', httpStatus: 401 },
  1008: { message: 'Insufficient credits', httpStatus: 402 },
  1026: { message: 'Content filter triggered', httpStatus: 400 },
  2013: { message: 'Invalid parameter', httpStatus: 400 },
  2049: { message: 'Invalid API key', httpStatus: 401 },
};

// ---- Utility Types ----

export type ModelType = 'chat' | 'image';

export interface ModelInfo {
  id: string;
  object: string;
  owned_by: string;
  type: ModelType;
}
