// ============================================================
// MiniMax Relay Platform - Request/Response Transformer
// ============================================================

import {
  OpenAIChatCompletionRequest,
  OpenAIChatCompletionResponse,
  OpenAIImageGenerationRequest,
  OpenAIImageResponse,
  OpenAISpeechRequest,
  OpenAISpeechResponse,
  OpenAIVideoRequest,
  OpenAIVideoResponse,
  OpenAIMusicRequest,
  OpenAIMusicResponse,
  MiniMaxChatRequest,
  MiniMaxChatResponse,
  MiniMaxImageRequest,
  MiniMaxImageResponse,
  MiniMaxSpeechRequest,
  MiniMaxSpeechResponse,
  MiniMaxVideoRequest,
  MiniMaxVideoResponse,
  MiniMaxMusicRequest,
  MiniMaxMusicResponse,
  OpenAIChoice,
  OpenAIMessage,
} from '../types';

// ============================================================
// Chat Completion Transformers
// ============================================================

/**
 * Transform OpenAI Chat Completion request to MiniMax format
 * 
 * NOTE: MiniMax temperature range is (0.0, 1.0], not (0, 2] like OpenAI.
 * We clamp values > 1.0 to 1.0 to maintain compatibility.
 */
export function transformChatRequest(
  openaiReq: OpenAIChatCompletionRequest
): MiniMaxChatRequest {
  // MiniMax only accepts temperature in range (0.0, 1.0]
  // OpenAI uses (0, 2], so we clamp to MiniMax's range
  let temperature = openaiReq.temperature;
  if (temperature !== undefined) {
    if (temperature <= 0) {
      temperature = 0.01; // MiniMax requires > 0
    } else if (temperature > 1) {
      temperature = 1; // Clamp to max
    }
  }

  const minimaxReq: MiniMaxChatRequest = {
    model: openaiReq.model,
    messages: openaiReq.messages,
    temperature: temperature,
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
  const firstChoice = minimaxRes.choices?.[0];
  let assistantMessage: OpenAIMessage;

  // MiniMax returns message in 'message' (singular), not 'messages' (plural)
  if (firstChoice?.message) {
    assistantMessage = {
      role: (firstChoice.message.role || 'assistant') as OpenAIMessage['role'],
      content: firstChoice.message.content || '',
    };
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
 * 
 * Supported aspect ratios per MiniMax docs:
 * - 1:1 (1024x1024)
 * - 16:9 (1280x720)
 * - 4:3 (1152x864)
 * - 3:2 (1248x832)
 * - 2:3 (832x1248)
 * - 3:4 (864x1152)
 * - 9:16 (720x1280)
 * - 21:9 (1344x576) - image-01 only
 */
function mapSizeToAspectRatio(
	size?: string
): '1:1' | '16:9' | '4:3' | '3:2' | '2:3' | '3:4' | '9:16' | '21:9' {
	const sizeMap: Record<string, '1:1' | '16:9' | '4:3' | '3:2' | '2:3' | '3:4' | '9:16' | '21:9'> = {
		// 1:1
		'256x256': '1:1',
		'512x512': '1:1',
		'1024x1024': '1:1',
		// 16:9
		'1792x1024': '16:9',
		// 9:16
		'1024x1792': '9:16',
		// 4:3
		'1152x864': '4:3',
		// 3:2
		'1248x832': '3:2',
		// 2:3
		'832x1248': '2:3',
		// 3:4
		'864x1152': '3:4',
		// 21:9
		'1344x576': '21:9',
	};

	if (!size) return '1:1';

	const aspectRatio = sizeMap[size];
	if (!aspectRatio) {
		console.warn(`Unknown image size '${size}', defaulting to 1:1. Supported sizes: ${Object.keys(sizeMap).join(', ')}`);
		return '1:1';
	}

	return aspectRatio;
}

/**
 * Transform OpenAI Image request to MiniMax format
 */
export function transformImageRequest(
  openaiReq: OpenAIImageGenerationRequest
): MiniMaxImageRequest {
  const model = openaiReq.model || 'image-01';

  const minimaxReq: MiniMaxImageRequest = {
    model: model,
    prompt: openaiReq.prompt,
    response_format: openaiReq.response_format === 'url' ? 'url' : 'b64_json',
    n: openaiReq.n || 1,
  };

  // MiniMax accepts either:
  // 1. size enum: '256x256' | '512x512' | '1024x1024' | '1792x1024' | '1024x1792'
  // 2. width + height (pixels) + aspect_ratio
  // We send aspect_ratio only to avoid conflicts
  if (openaiReq.size) {
    if (openaiReq.size.includes('x')) {
      // Pixel dimension format (e.g., '1024x1024') - map to aspect ratio
      minimaxReq.aspect_ratio = mapSizeToAspectRatio(openaiReq.size);
    } else {
      // Already an aspect ratio (e.g., '1:1') - use as-is
      minimaxReq.aspect_ratio = openaiReq.size as '1:1' | '16:9' | '4:3' | '3:2' | '2:3' | '3:4' | '9:16' | '21:9';
    }
  } else {
    minimaxReq.aspect_ratio = '1:1';
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
// Speech Synthesis (T2A) Transformers
// ============================================================

/**
 * Transform OpenAI Speech request to MiniMax format
 */
export function transformSpeechRequest(
  openaiReq: OpenAISpeechRequest
): MiniMaxSpeechRequest {
  const minimaxReq: MiniMaxSpeechRequest = {
    model: openaiReq.model || 'speech-02-turbo',
    text: openaiReq.input,
    stream: false,
  };

  // Map voice settings
  if (openaiReq.voice || openaiReq.speed || openaiReq.pitch || openaiReq.volume) {
    minimaxReq.voice_setting = {};
    if (openaiReq.voice) {
      minimaxReq.voice_setting.voice_id = openaiReq.voice;
    }
    if (openaiReq.speed) {
      minimaxReq.voice_setting.speed = openaiReq.speed;
    }
    if (openaiReq.pitch) {
      minimaxReq.voice_setting.pitch = openaiReq.pitch;
    }
    if (openaiReq.volume) {
      minimaxReq.voice_setting.volume = openaiReq.volume;
    }
  }

  // Map audio settings
  if (openaiReq.format) {
    minimaxReq.audio_setting = {
      format: openaiReq.format,
    };
  }

  return minimaxReq;
}

// ============================================================
// Video Generation Transformers
// ============================================================

/**
 * Transform OpenAI Video request to MiniMax format
 */
export function transformVideoRequest(
  openaiReq: OpenAIVideoRequest
): MiniMaxVideoRequest {
  const minimaxReq: MiniMaxVideoRequest = {
    model: openaiReq.model || 'MiniMax-Hailuo-2.3', // Default per official docs
    prompt: openaiReq.prompt,
    input_files: openaiReq.input_files,
    first_frame_image: openaiReq.first_frame_image,
    last_frame_image: openaiReq.last_frame_image,
    subject_reference: openaiReq.subject_reference,
    duration: openaiReq.duration || 6, // Default 6s per official docs
    resolution: openaiReq.resolution || '768P', // Default 768P per official docs
    subject_position: openaiReq.subject_position,
  };

  return minimaxReq;
}

/**
 * Transform MiniMax Video Response to OpenAI format
 */
export function transformVideoResponse(
  minimaxRes: MiniMaxVideoResponse
): OpenAIVideoResponse {
  return {
    id: minimaxRes.id || `video-${generateId()}`,
    object: 'video.generation',
    created: minimaxRes.created || Math.floor(Date.now() / 1000),
    model: minimaxRes.model,
    task_id: minimaxRes.task_id,
    status: minimaxRes.status,
    data: {
      video_url: minimaxRes.data?.video_url,
      cover_image_url: minimaxRes.data?.cover_image_url,
    },
  };
}

// ============================================================
// Music Generation Transformers
// ============================================================

/**
 * Transform OpenAI Music request to MiniMax format
 */
export function transformMusicRequest(
  openaiReq: OpenAIMusicRequest
): MiniMaxMusicRequest {
  const minimaxReq: MiniMaxMusicRequest = {
    model: openaiReq.model,
    prompt: openaiReq.prompt,
    lyrics: openaiReq.lyrics,
    title: openaiReq.title,
    style: openaiReq.style,
    tags: openaiReq.tags,
  };

  return minimaxReq;
}

/**
 * Transform MiniMax Music Response to OpenAI format
 */
export function transformMusicResponse(
  minimaxRes: MiniMaxMusicResponse
): OpenAIMusicResponse {
  return {
    id: minimaxRes.id || `music-${generateId()}`,
    object: 'music.generation',
    created: minimaxRes.created || Math.floor(Date.now() / 1000),
    model: minimaxRes.model,
    task_id: minimaxRes.task_id,
    status: minimaxRes.status,
    data: {
      music_url: minimaxRes.data?.music_url,
      lyric_url: minimaxRes.data?.lyric_url,
    },
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
  const imageModels = ['image-01', 'image-01-live', 'image-02'];
  return imageModels.some((m) => model.toLowerCase().includes(m));
}

/**
 * Detect if a model is a speech synthesis model
 */
export function isSpeechModel(model: string): boolean {
  const speechModels = ['speech-2.8', 'speech-2.6', 'speech-02'];
  return speechModels.some((m) => model.toLowerCase().includes(m));
}

/**
 * Detect if a model is a video generation model
 */
export function isVideoModel(model: string): boolean {
  const videoModels = ['hailuo', 'video'];
  return videoModels.some((m) => model.toLowerCase().includes(m));
}

/**
 * Detect if a model is a music generation model
 */
export function isMusicModel(model: string): boolean {
  return model.toLowerCase().includes('music');
}

/**
 * Detect if a model is a chat model
 */
export function isChatModel(model: string): boolean {
  return !isImageModel(model) && !isSpeechModel(model) && !isVideoModel(model) && !isMusicModel(model);
}
