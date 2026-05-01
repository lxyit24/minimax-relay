// ============================================================
// MiniMax Relay Platform - Request/Response Transformer
// ============================================================

import {
  OpenAIChatCompletionRequest,
  OpenAIChatCompletionResponse,
  OpenAIImageGenerationRequest,
  OpenAIImageResponse,
  MiniMaxChatRequest,
  MiniMaxChatResponse,
  MiniMaxImageRequest,
  MiniMaxImageResponse,
  OpenAIChoice,
  OpenAIMessage,
} from '../types';

// ============================================================
// Chat Completion Transformers
// ============================================================

/**
 * Transform OpenAI Chat Completion request to MiniMax format
 */
export function transformChatRequest(
  openaiReq: OpenAIChatCompletionRequest
): MiniMaxChatRequest {
  const minimaxReq: MiniMaxChatRequest = {
    model: openaiReq.model,
    messages: openaiReq.messages,
    temperature: openaiReq.temperature,
    top_p: openaiReq.top_p,
    stream: openaiReq.stream,
  };

  // OpenAI uses max_tokens, MiniMax uses tokens_to_generate
  if (openaiReq.max_tokens) {
    minimaxReq.tokens_to_generate = openaiReq.max_tokens;
  }

  return minimaxReq;
}

/**
 * Transform MiniMax Chat Response to OpenAI format
 */
export function transformChatResponse(
  minimaxRes: MiniMaxChatResponse,
  model: string
): OpenAIChatCompletionResponse {
  // MiniMax response structure:
  // {
  //   id: "gen-xxx",
  //   choices: [{
  //     index: 0,
  //     messages: [{ role: "assistant", content: "..." }],
  //     finish_reason: "stop"
  //   }],
  //   usage: { prompt_tokens: x, completion_tokens: y, total_tokens: z }
  // }

  const firstChoice = minimaxRes.choices?.[0];
  let assistantMessage: OpenAIMessage;

  if (firstChoice?.messages && firstChoice.messages.length > 0) {
    // MiniMax returns an array of messages, get the last one or combine
    assistantMessage = firstChoice.messages[firstChoice.messages.length - 1];
  } else {
    assistantMessage = { role: 'assistant', content: '' };
  }

  const openAIChoices: OpenAIChoice[] = [
    {
      index: 0,
      message: {
        role: 'assistant',
        content: assistantMessage.content || '',
      },
      finish_reason: firstChoice?.finish_reason || 'stop',
    },
  ];

  return {
    id: minimaxRes.id || `chatcmpl-${generateId()}`,
    object: 'chat.completion',
    created: minimaxRes.created || Math.floor(Date.now() / 1000),
    model: model,
    choices: openAIChoices,
    usage: minimaxRes.usage || {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
    },
  };
}

// ============================================================
// Image Generation Transformers
// ============================================================

/**
 * Map OpenAI size to MiniMax aspect ratio
 */
function mapSizeToAspectRatio(
  size?: string
): '1:1' | '16:9' | '4:3' | '3:2' | '2:3' | '3:4' | '9:16' | '21:9' {
  const sizeMap: Record<string, '1:1' | '16:9' | '4:3' | '3:2' | '2:3' | '3:4' | '9:16' | '21:9'> = {
    '256x256': '1:1',
    '512x512': '1:1',
    '1024x1024': '1:1',
    '1024x1792': '9:16',
    '1792x1024': '16:9',
  };

  if (!size) return '1:1';
  return sizeMap[size] || '1:1';
}

/**
 * Transform OpenAI Image request to MiniMax format
 */
export function transformImageRequest(
  openaiReq: OpenAIImageGenerationRequest
): MiniMaxImageRequest {
  // Determine which image model to use
  const model = openaiReq.model || 'image-01';

  const minimaxReq: MiniMaxImageRequest = {
    model: model,
    prompt: openaiReq.prompt,
    aspect_ratio: mapSizeToAspectRatio(openaiReq.size),
    response_format: openaiReq.response_format === 'url' ? 'url' : 'base64',
    n: openaiReq.n || 1,
  };

  // Handle specific size dimensions if provided
  if (openaiReq.size) {
    const [width, height] = openaiReq.size.split('x').map(Number);
    if (width && height) {
      minimaxReq.width = width;
      minimaxReq.height = height;
    }
  }

  return minimaxReq;
}

/**
 * Transform MiniMax Image Response to OpenAI format
 */
export function transformImageResponse(
  minimaxRes: MiniMaxImageResponse,
  prompt: string
): OpenAIImageResponse {
  const data = [];

  // MiniMax returns either base64_image or image_url
  if (minimaxRes.base64_image) {
    data.push({
      b64_json: minimaxRes.base64_image,
      revised_prompt: minimaxRes.revised_prompt || prompt,
    });
  } else if (minimaxRes.image_url) {
    data.push({
      url: minimaxRes.image_url,
      revised_prompt: minimaxRes.revised_prompt || prompt,
    });
  }

  return {
    id: minimaxRes.id || `img-${generateId()}`,
    object: 'image.generation',
    created: minimaxRes.created || Math.floor(Date.now() / 1000),
    data: data,
  };
}

// ============================================================
// Utility Functions
// ============================================================

/**
 * Generate a random ID for fallback cases
 */
function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

/**
 * Detect if a model is an image model
 */
export function isImageModel(model: string): boolean {
  const imageModels = ['image-01', 'image-02', 'dall-e', 'dalle'];
  return imageModels.some((m) => model.toLowerCase().includes(m));
}

/**
 * Detect if a model is a chat model
 */
export function isChatModel(model: string): boolean {
  return !isImageModel(model);
}
