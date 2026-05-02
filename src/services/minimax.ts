// ============================================================
// MiniMax Relay Platform - MiniMax API Service
// ============================================================

import axios, { AxiosInstance, AxiosError } from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { getConfig } from '../config';
import {
  MiniMaxChatRequest,
  MiniMaxChatResponse,
  MiniMaxImageRequest,
  MiniMaxImageResponse,
  MiniMaxVideoRequest,
  MiniMaxVideoResponse,
  MiniMaxSpeechRequest,
  MiniMaxSpeechResponse,
  MiniMaxMusicRequest,
  MiniMaxMusicResponse,
  ERROR_CODE_MAP,
  RelayError,
} from '../types';
import {
  transformChatRequest,
  transformChatResponse,
  transformImageRequest,
  transformImageResponse,
  transformSpeechRequest,
  transformVideoRequest,
  transformVideoResponse,
  transformMusicRequest,
  transformMusicResponse,
} from './transformer';
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
} from '../types';

const DEBUG_FILE = path.join(__dirname, '../../debug.log');

function debugLog(...args: any[]) {
  try {
    const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
    const timestamp = new Date().toISOString();
    fs.appendFileSync(DEBUG_FILE, `[${timestamp}] ${msg}\n`);
  } catch (e) {
    // Ignore debug logging errors
  }
}

export class MiniMaxService {
  constructor() {
    // Constructor remains empty, config is read per-request
  }

  /**
   * Get HTTP client with proper API key
   */
  private getClient(apiKey: string): AxiosInstance {
    const config = getConfig().getMiniMaxConfig();
    
    return axios.create({
      baseURL: config.base_url,
      timeout: config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
    });
  }

  /**
   * Handle chat completion request (text generation models)
   */
  async chatCompletion(
    request: OpenAIChatCompletionRequest,
    apiKey?: string
  ): Promise<OpenAIChatCompletionResponse> {
    const config = getConfig();
    const effectiveApiKey = apiKey || config.getApiKey();
    debugLog(`chatCompletion - apiKey received: ${apiKey ? 'yes' : 'no'}, apiKey length: ${apiKey?.length || 0}, effectiveApiKey length: ${effectiveApiKey?.length || 0}, effectiveApiKey preview: ${effectiveApiKey ? effectiveApiKey.substring(0, 15) : 'EMPTY'}`);
    const minimaxReq = transformChatRequest(request);
    const endpoint = this.getChatEndpoint(request.model);

    try {
      const client = this.getClient(effectiveApiKey);
      const response = await client.post(
        endpoint,
        minimaxReq
      );

      // Check for MiniMax API errors in base_resp
      const baseResp = (response.data as any).base_resp;
      if (baseResp && baseResp.status_code !== 0) {
        const errorMsg = baseResp.status_msg || 'MiniMax API error';
        throw new Error(`MiniMax chat failed: ${errorMsg} (code: ${baseResp.status_code})`);
      }

      return transformChatResponse(response.data, request.model);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Handle image generation request
   */
  async imageGeneration(
    request: OpenAIImageGenerationRequest,
    apiKey?: string
  ): Promise<OpenAIImageResponse> {
    const config = getConfig();
    const effectiveApiKey = apiKey || config.getApiKey();
    
    // Debug log: show API key status (only first 4 chars for security)
    const keyPreview = effectiveApiKey ? `${effectiveApiKey.substring(0, 4)}...` : 'EMPTY';
    console.log(`[DEBUG] imageGeneration API key: ${keyPreview}, length: ${effectiveApiKey?.length || 0}`);
    
    const minimaxReq = transformImageRequest(request);

    try {
      const client = this.getClient(effectiveApiKey);
      const response = await client.post(
        '/v1/image_generation',
        minimaxReq
      );

      // Check for MiniMax API errors in base_resp
      const baseResp = (response.data as any).base_resp;
      if (baseResp && baseResp.status_code !== 0) {
        const errorMsg = baseResp.status_msg || 'MiniMax API error';
        throw new Error(`MiniMax image generation failed: ${errorMsg} (code: ${baseResp.status_code})`);
      }

      return transformImageResponse(response.data, request.prompt);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Handle speech synthesis request (T2A - Text to Audio)
   * 
   * NOTE: MiniMax T2A API returns JSON with hex-encoded audio:
   * { data: { audio: "<hex_string>", status: 2 }, ... }
   * We convert hex to base64 for OpenAI compatibility.
   */
  async speechGeneration(
    request: OpenAISpeechRequest,
    apiKey?: string
  ): Promise<OpenAISpeechResponse> {
    const config = getConfig();
    const effectiveApiKey = apiKey || config.getApiKey();
    const minimaxReq = transformSpeechRequest(request);

    try {
      const client = this.getClient(effectiveApiKey);

      // MiniMax returns JSON with hex-encoded audio, not ArrayBuffer
      const response = await client.post<{
        data?: { audio?: string; status?: number };
        trace_id?: string;
        base_resp?: { status_code?: number; status_msg?: string };
      }>(
        '/v1/t2a_v2',
        minimaxReq,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      // Check for MiniMax API errors in base_resp
      const baseResp = response.data?.base_resp;
      if (baseResp && baseResp.status_code !== 0) {
        const errorMsg = baseResp.status_msg || 'MiniMax API error';
        throw new Error(`MiniMax speech failed: ${errorMsg} (code: ${baseResp.status_code})`);
      }

      // Extract hex audio from response
      const hexAudio = response.data?.data?.audio;

      if (!hexAudio) {
        throw new Error('No audio data in response');
      }

      // Convert hex to base64 for OpenAI compatibility
      const buffer = Buffer.from(hexAudio, 'hex');
      const base64Audio = buffer.toString('base64');

      return {
        id: `speech-${generateId()}`,
        object: 'audio.speech',
        created: Math.floor(Date.now() / 1000),
        model: request.model || 'speech-02-turbo',
        data: base64Audio,
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Handle video generation request
   */
  async videoGeneration(
    request: OpenAIVideoRequest,
    apiKey?: string
  ): Promise<OpenAIVideoResponse> {
    const config = getConfig();
    const effectiveApiKey = apiKey || config.getApiKey();
    const minimaxReq = transformVideoRequest(request);

    try {
      const client = this.getClient(effectiveApiKey);
      const response = await client.post<{
        base_resp?: { status_code?: number; status_msg?: string };
        [key: string]: unknown;
      }>(
        '/v1/video_generation',
        minimaxReq
      );

      // Check for MiniMax API errors in base_resp
      const baseResp = response.data?.base_resp;
      if (baseResp && baseResp.status_code !== 0) {
        const errorMsg = baseResp.status_msg || 'MiniMax API error';
        throw new Error(`MiniMax video failed: ${errorMsg} (code: ${baseResp.status_code})`);
      }

      return transformVideoResponse(response.data as unknown as MiniMaxVideoResponse);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Handle music generation request
   */
  async musicGeneration(
    request: OpenAIMusicRequest,
    apiKey?: string
  ): Promise<OpenAIMusicResponse> {
    const config = getConfig();
    const effectiveApiKey = apiKey || config.getApiKey();
    const minimaxReq = transformMusicRequest(request);

    try {
      const client = this.getClient(effectiveApiKey);
      const response = await client.post<{
        base_resp?: { status_code?: number; status_msg?: string };
        [key: string]: unknown;
      }>(
        '/v1/music_generation',
        minimaxReq
      );

      // Check for MiniMax API errors in base_resp
      const baseResp = response.data?.base_resp;
      if (baseResp && baseResp.status_code !== 0) {
        const errorMsg = baseResp.status_msg || 'MiniMax API error';
        throw new Error(`MiniMax music failed: ${errorMsg} (code: ${baseResp.status_code})`);
      }

      return transformMusicResponse(response.data as unknown as MiniMaxMusicResponse);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Determine the correct chat endpoint based on model
   */
  private getChatEndpoint(model: string): string {
    const modelLower = model.toLowerCase();

    // All text generation models use /v1/text/chatcompletion_v2
    // This is the correct MiniMax chat completion endpoint
    return '/v1/text/chatcompletion_v2';
  }

  /**
   * Handle and transform errors
   */
  private handleError(error: unknown): RelayError {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ error?: { message?: string; code?: number } }>;

      if (axiosError.response?.data) {
        const errorData = axiosError.response.data;
        const code = errorData?.error?.code || axiosError.response.status;

        const errorInfo = ERROR_CODE_MAP[code] || {
          message: errorData?.error?.message || axiosError.message,
          httpStatus: axiosError.response.status,
        };

        return {
          error: {
            message: errorInfo.message,
            type: this.getErrorType(code),
            code: code,
          },
        };
      }

      return {
        error: {
          message: axiosError.message || 'Network error',
          type: 'api_error',
          code: axiosError.response?.status || 500,
        },
      };
    }

    // Handle regular Error objects (e.g., from throw new Error(...))
    if (error instanceof Error) {
      return {
        error: {
          message: error.message,
          type: 'api_error',
          code: 500,
        },
      };
    }

    return {
      error: {
        message: 'Unknown error occurred',
        type: 'api_error',
        code: 500,
      },
    };
  }

  /**
   * Get error type based on error code
   */
  private getErrorType(code: number): string {
    switch (code) {
      case 1002:
        return 'rate_limit_error';
      case 1004:
      case 2049:
        return 'authentication_error';
      case 1008:
        return 'payment_required';
      case 1026:
        return 'content_filter';
      case 2013:
        return 'invalid_request_error';
      default:
        return 'api_error';
    }
  }
}

// Singleton instance
let serviceInstance: MiniMaxService | null = null;

export function getMiniMaxService(): MiniMaxService {
  if (!serviceInstance) {
    serviceInstance = new MiniMaxService();
  }
  return serviceInstance;
}

/**
 * Generate a random ID for fallback cases
 */
function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}
